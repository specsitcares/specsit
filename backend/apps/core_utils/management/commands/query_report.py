"""
File: apps/core_utils/management/commands/query_report.py
Description: Query-count profiler for the endpoints that dominate page load. Runs each one
through the real view code (not a hand-rolled queryset copy, so it can never drift from
what the storefront actually executes) and reports query count, wall time and a per-table
breakdown, so an N+1 shows up as one table with an absurd count beside it.

Usage:
    python manage.py query_report                       # cold: cache cleared per endpoint
    python manage.py query_report --warm                # measure the cached path instead
    python manage.py query_report --max-queries 120     # CI: cap every endpoint
    python manage.py query_report --max-queries home_bundle=101,product_list=70
    python manage.py query_report --check               # which cache backend is live, and is it shared

Baseline recorded 2026-08-24 against the dev dataset (cold, cache cleared):

    home_bundle   101  |  product_list  70  |  bestsellers  13
    variant_list   22  |  analytics     52  |  dashboard    25

Those are the numbers to beat, not numbers to protect — they are the "before" side of the
query-reduction work. Update this block when a fix lands and the new count sticks.
"""
import os
import re
import subprocess
import sys
import time
import uuid

from django.conf import settings
from django.core.cache import cache, caches
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, reset_queries
from django.test import RequestFactory

# How the --check child process hands its answer back to the parent. Prefixed so it
# survives whatever else app startup decides to log to stdout.
_PEER_MARKER = 'QUERY_REPORT_PEER_READ:'

# Matches the table in FROM / JOIN / INSERT INTO / UPDATE / DELETE FROM, quoted the way any
# of the supported backends quotes it. A subquery ("FROM (SELECT ...") deliberately does not
# match, so the scan falls through to the first real table inside it — which is the table the
# query should be attributed to anyway.
_TABLE_RE = re.compile(
    r'\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+'
    r'("[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_]\w*)',
    re.IGNORECASE,
)
_TXN_RE = re.compile(r'^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b', re.IGNORECASE)


def primary_table(sql):
    """The table a query is attributed to: the first one it reads from or writes to.

    Grouping on the SQL rather than the ORM call site is deliberate — an N+1 fired from a
    serializer property, a signal handler and a template tag all land on the same table
    here, which is the thing you actually have to go and fix.
    """
    match = _TABLE_RE.search(sql or '')
    if match:
        return match.group(1).strip('"`[]')
    if _TXN_RE.match(sql or ''):
        return '(transaction)'
    return '(unparsed)'


def redact(location):
    """Hide the password in a cache LOCATION before printing it."""
    return re.sub(r'://([^:/@]*):([^@]*)@', r'://\1:***@', str(location))


def call_view(view, path, params=None):
    """Drive a DRF view the way the URLconf would, and force the response to render.

    Rendering matters: DRF responses are lazy, and a serializer that fires a query per row
    fires it during render — measuring without this under-reports the N+1 you came to find.
    """
    request = RequestFactory().get(path, params or {})
    response = view(request)
    if hasattr(response, 'render'):
        response.render()
    return response


class Command(BaseCommand):
    help = 'Profile query count, wall time and per-table query breakdown for the heaviest endpoints.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--warm',
            action='store_true',
            help='Skip the cache clear and prime each endpoint once before measuring, so the '
                 'numbers describe the cached path. Default is cold: cache cleared per endpoint.',
        )
        parser.add_argument(
            '--max-queries',
            action='append',
            default=[],
            metavar='N|name=N',
            help='Fail (exit 1) when an endpoint exceeds its cap. A bare number caps every '
                 'endpoint; "name=N" caps one. Repeatable, and comma-separated pairs are '
                 'accepted. Intended for CI, so a regression breaks the build.',
        )
        parser.add_argument(
            '--check',
            action='store_true',
            help='Report which cache backend is actually live and prove it is shared across '
                 'processes (write here, read from a second process). Exits 1 if it is not '
                 'shared — a per-process cache means every CachedReadMixin hit is a no-op. '
                 'Skips profiling.',
        )
        parser.add_argument(
            '--check-peer',
            metavar='KEY',
            help='Internal to --check: read KEY in this fresh process and report it.',
        )

    def handle(self, *args, **options):
        if options['check_peer']:
            return self.run_check_peer(options['check_peer'])
        if options['check']:
            return self.run_check()

        # Query logging is off unless DEBUG is on, and .env sets DEBUG per environment — so
        # force it here rather than making the operator remember to export it.
        settings.DEBUG = True
        connection.force_debug_cursor = True
        # RequestFactory sends HTTP_HOST=testserver, which ALLOWED_HOSTS rejects outright.
        if 'testserver' not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']

        endpoints = self.get_endpoints()
        caps = self.parse_caps(options['max_queries'], {name for name, _, _ in endpoints})
        warm = options['warm']

        self.stdout.write(self.style.MIGRATE_HEADING(
            'Query report (%s)' % ('warm — cached path' if warm else 'cold — cache cleared per endpoint')
        ))

        results = []
        for name, label, run in endpoints:
            if warm:
                run()  # prime, unmeasured: the measured pass should hit a populated cache
            else:
                cache.clear()

            reset_queries()
            started = time.perf_counter()
            run()
            elapsed_ms = (time.perf_counter() - started) * 1000
            queries = connection.queries[:]

            results.append((name, len(queries), elapsed_ms))
            self.report(name, label, queries, elapsed_ms, caps.get(name))

        self.summary(results, caps)

    # ── --check: which backend is live, and is it actually shared? ──────────────────
    def run_check_peer(self, key):
        """The other half of --check: a second OS process reading the parent's key."""
        value = cache.get(key)
        self.stdout.write('%s%s' % (_PEER_MARKER, '' if value is None else value))

    def run_check(self):
        backend = caches['default']
        config = settings.CACHES.get('default', {})
        backend_cls = type(backend)

        self.stdout.write(self.style.MIGRATE_HEADING('Cache check'))
        self.stdout.write('  BACKEND (settings)  %s' % config.get('BACKEND', '(unset)'))
        self.stdout.write('  resolved class      %s.%s' % (backend_cls.__module__, backend_cls.__name__))
        self.stdout.write('  LOCATION            %s' % (redact(config.get('LOCATION', '')) or '(none)'))
        self.stdout.write('  KEY_PREFIX          %s' % (config.get('KEY_PREFIX', '') or '(none)'))
        self.stdout.write('  default TIMEOUT     %s' % config.get('TIMEOUT', '(backend default)'))
        self.stdout.write('  IGNORE_EXCEPTIONS   %s' % config.get('OPTIONS', {}).get('IGNORE_EXCEPTIONS', False))
        ping = self.ping(backend)
        self.stdout.write('  server ping         %s' % ping)

        # A key in its own namespace — nothing here touches the key formats the app uses.
        token = uuid.uuid4().hex
        key = 'query_report:check:%s' % token[:12]
        cache.set(key, token, 60)
        local = cache.get(key)

        self.stdout.write('')
        self.stdout.write('  wrote  %s' % key)
        self.stdout.write('  same-process read   %s' % ('hit' if local == token else 'MISS — cache is not even writable'))

        peer, peer_error = self.read_from_peer(key)
        if peer_error:
            self.stdout.write('  other-process read  %s' % peer_error)
        else:
            self.stdout.write('  other-process read  %s' % ('hit' if peer == token else 'MISS'))

        try:
            cache.delete(key)
        except Exception:
            pass

        self.stdout.write('')
        if peer == token:
            self.stdout.write(self.style.SUCCESS(
                '  SHARED — a second process read this process\'s write. CachedReadMixin and '
                'cache_aside() are real across workers.'))
            return
        if peer_error:
            raise CommandError('Could not verify sharing: %s' % peer_error)

        # Same symptom, two very different causes — say which one this is.
        if ping.startswith('FAILED'):
            raise CommandError(
                'NOT SHARED — Redis is configured but unreachable, so every read misses and\n'
                '  every write is dropped (IGNORE_EXCEPTIONS swallows it). Requests still serve\n'
                '  correct data by falling through to the database, just with no cache at all.\n'
                '  ping said: %s' % ping
            )
        raise CommandError(
            'NOT SHARED — a second process could not read this one\'s write.\n'
            '  Every CachedReadMixin hit and every cache_aside() call is a per-process no-op\n'
            '  that dies with the worker. Set REDIS_URL (see .env.example) and re-run.'
        )

    @staticmethod
    def ping(backend):
        """PING the server for redis-backed caches; LocMemCache has no server to ping."""
        get_client = getattr(getattr(backend, 'client', None), 'get_client', None)
        if get_client is None:
            return 'n/a — not a networked backend'
        try:
            get_client(write=True).ping()
            return 'PONG'
        except Exception as exc:
            return 'FAILED — %s: %s' % (type(exc).__name__, exc)

    def read_from_peer(self, key):
        """Run this same command in a second OS process and ask it to read `key`.

        A separate process is the only honest test: LocMemCache is per-process, so it
        passes any same-process check and still fails here.
        """
        manage = os.path.abspath(sys.argv[0])
        if not os.path.isfile(manage):
            return None, 'skipped — not invoked through manage.py'
        try:
            proc = subprocess.run(
                [sys.executable, manage, 'query_report', '--check-peer', key],
                cwd=os.path.dirname(manage), env=os.environ.copy(),
                capture_output=True, text=True, timeout=120,
            )
        except subprocess.SubprocessError as exc:
            return None, 'peer process failed — %s: %s' % (type(exc).__name__, exc)

        for line in proc.stdout.splitlines():
            if line.startswith(_PEER_MARKER):
                return line[len(_PEER_MARKER):].strip(), None
        return None, 'peer process gave no answer (exit %s)' % proc.returncode

    def get_endpoints(self):
        """(name, label, callable) per endpoint. Imported inside the method so the module
        itself stays importable even while one of these apps is mid-refactor."""
        from apps.catalog.views import ProductViewSet, VariantViewSet
        from apps.cms.views import HomeBundleView
        from apps.sales.analytics_compute import compute_analytics, compute_dashboard_stats

        product_list = ProductViewSet.as_view({'get': 'list'})
        variant_list = VariantViewSet.as_view({'get': 'list'})

        return [
            ('home_bundle', 'GET /api/cms/home-bundle/',
             lambda: call_view(HomeBundleView.as_view(), '/api/cms/home-bundle/')),
            ('product_list', 'GET /api/catalog/products/?page_size=12',
             lambda: call_view(product_list, '/api/catalog/products/', {'page_size': '12'})),
            ('bestsellers', 'GET /api/catalog/products/?page_size=12&sort_by=bestsellers',
             lambda: call_view(product_list, '/api/catalog/products/',
                               {'page_size': '12', 'sort_by': 'bestsellers'})),
            ('variant_list', 'GET /api/catalog/variants/?page_size=20',
             lambda: call_view(variant_list, '/api/catalog/variants/', {'page_size': '20'})),
            ('analytics', "compute_analytics('last_30')",
             lambda: compute_analytics('last_30')),
            ('dashboard', 'compute_dashboard_stats()',
             lambda: compute_dashboard_stats()),
        ]

    def parse_caps(self, raw_values, known_names):
        """Turn --max-queries values into {endpoint_name: cap}."""
        caps = {}
        for raw in raw_values:
            for part in str(raw).split(','):
                part = part.strip()
                if not part:
                    continue
                if '=' in part:
                    name, _, value = part.partition('=')
                    name = name.strip()
                    if name not in known_names:
                        raise CommandError(
                            "--max-queries: unknown endpoint '%s'. Known: %s"
                            % (name, ', '.join(sorted(known_names)))
                        )
                    caps[name] = self.parse_int(value, part)
                else:
                    for name in known_names:
                        caps[name] = self.parse_int(part, part)
        return caps

    @staticmethod
    def parse_int(value, original):
        try:
            return int(str(value).strip())
        except ValueError:
            raise CommandError("--max-queries: '%s' is not a number." % original)

    def report(self, name, label, queries, elapsed_ms, cap):
        by_table = {}
        for query in queries:
            table = primary_table(query.get('sql', ''))
            by_table[table] = by_table.get(table, 0) + 1

        count = len(queries)
        over = cap is not None and count > cap
        headline = '%d queries · %.1f ms' % (count, elapsed_ms)
        if cap is not None:
            headline += ' · cap %d%s' % (cap, ' — OVER' if over else ' — ok')

        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO('%s  (%s)' % (name, label)))
        self.stdout.write('  ' + (self.style.ERROR if over else self.style.SUCCESS)(headline))

        # Descending by count, then by name so equal counts keep a stable order run to run.
        for table, table_count in sorted(by_table.items(), key=lambda kv: (-kv[1], kv[0])):
            share = (table_count / count * 100) if count else 0
            self.stdout.write('    %5d  %-40s %5.1f%%' % (table_count, table, share))

    def summary(self, results, caps):
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('Summary'))

        failures = []
        for name, count, elapsed_ms in results:
            cap = caps.get(name)
            line = '  %-16s %5d queries  %9.1f ms' % (name, count, elapsed_ms)
            if cap is None:
                self.stdout.write(line)
            elif count > cap:
                failures.append('%s: %d queries exceeds --max-queries %d' % (name, count, cap))
                self.stdout.write(self.style.ERROR('%s   > cap %d' % (line, cap)))
            else:
                self.stdout.write(self.style.SUCCESS('%s   <= cap %d' % (line, cap)))

        self.stdout.write('')
        self.stdout.write('  total            %5d queries  %9.1f ms' % (
            sum(c for _, c, _ in results), sum(t for _, _, t in results)))

        if failures:
            # CommandError exits non-zero, which is the whole point of --max-queries.
            raise CommandError('Query budget exceeded:\n  ' + '\n  '.join(failures))
