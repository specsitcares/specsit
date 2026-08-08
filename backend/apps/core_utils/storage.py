"""
Storage backends that compress every asset on the way in.

Hooking `Storage.save()` is what makes this apply to *all* assets: every
ImageField/FileField write in the project ends up here, whichever app, serializer
or admin form triggered it. `FieldFile.save()` records whatever name we return,
so re-encoding a `.png` upload as `.webp` correctly stores the new name in the
database column.

Two concrete classes because the project has two deployment targets (see
config/settings.py): local disk for dev, Supabase's S3-compatible bucket in
production.
"""
import logging

from django.core.files.storage import FileSystemStorage

from .images import AssetTooLarge, compress

logger = logging.getLogger(__name__)


class CompressingStorageMixin:
    """Runs every written file through `images.compress` first."""

    def save(self, name, content, max_length=None):
        # `compress_media` writes back bytes this compressor just produced —
        # running them through a second time would re-encode an already-lossy
        # image for no gain, so it marks the content and we pass it straight on.
        already_done = getattr(content, '_skip_compression', False)
        if name is not None and content is not None and not already_done:
            try:
                name, content, stats = compress(name, content)
            except AssetTooLarge:
                # An APIException — let it reach DRF so the client gets a clean
                # 413 instead of a 500 from inside the storage backend.
                raise
            except Exception:  # noqa: BLE001 — a compressor bug must not cost
                # the user their upload; fall back to storing the original.
                logger.exception('Compression failed, storing %s uncompressed', name)
            else:
                if stats['action'] not in ('passthrough', 'kept-original'):
                    logger.info(
                        'Compressed %s: %.0f KB -> %.0f KB (-%s%%, %s)',
                        stats['name'], stats['original_bytes'] / 1024,
                        stats['final_bytes'] / 1024, stats['saved_pct'], stats['action'],
                    )
        return super().save(name, content, max_length=max_length)


class CompressedFileSystemStorage(CompressingStorageMixin, FileSystemStorage):
    """Local-disk media storage (development, and any host with a real volume)."""


try:
    from storages.backends.s3boto3 import S3Boto3Storage as _S3Boto3Storage
except ImportError:  # pragma: no cover — dev installs without django-storages
    _S3Boto3Storage = None
else:
    class CompressedS3Storage(CompressingStorageMixin, _S3Boto3Storage):
        """Supabase Storage (S3-compatible) media storage."""
