"""Token authentication with a lifetime.

DRF's stock TokenAuthentication issues a key that never expires: the same string
keeps working forever, survives a password change, and — since the SPA has to read
it to attach the Authorization header — lives in localStorage where any script on
the page can take it. There was no way to revoke one and no record of its use.

This subclass adds the two properties a session credential needs:

  * an idle timeout — a token unused for TOKEN_IDLE_TIMEOUT is dead, and
  * an absolute cap — a token older than TOKEN_MAX_AGE is dead regardless of use,

both enforced server-side on every request. `last_used` is refreshed at most once
per minute so an active session doesn't write a row on every single call.

Expiry is surfaced as 401, which the frontend already handles by clearing the
stored token and sending the visitor back to /login.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

# How long a token survives without being used.
TOKEN_IDLE_TIMEOUT = timedelta(
    seconds=getattr(settings, 'TOKEN_IDLE_TIMEOUT_SECONDS', 60 * 60 * 24)  # 24h
)
# Hard ceiling from issue time, however active the session is.
TOKEN_MAX_AGE = timedelta(
    seconds=getattr(settings, 'TOKEN_MAX_AGE_SECONDS', 60 * 60 * 24 * 14)  # 14 days
)
# Don't write last_used on every request — once a minute is plenty to track idleness.
_LAST_USED_WRITE_INTERVAL = timedelta(minutes=1)


class ExpiringTokenAuthentication(TokenAuthentication):
    """TokenAuthentication that honours the idle and absolute lifetimes above."""

    def authenticate_credentials(self, key):
        from apps.core_utils.models import TokenActivity

        user, token = super().authenticate_credentials(key)
        now = timezone.now()

        if token.created and now - token.created > TOKEN_MAX_AGE:
            token.delete()
            raise AuthenticationFailed('Token expired. Please sign in again.')

        activity, _ = TokenActivity.objects.get_or_create(
            token=token, defaults={'last_used': token.created or now}
        )
        if now - activity.last_used > TOKEN_IDLE_TIMEOUT:
            token.delete()  # cascades to the activity row
            raise AuthenticationFailed('Session timed out. Please sign in again.')

        if now - activity.last_used > _LAST_USED_WRITE_INTERVAL:
            activity.last_used = now
            activity.save(update_fields=['last_used'])

        return user, token


def issue_token(user):
    """Return a usable token for `user`, replacing one that has aged out.

    Use this instead of Token.objects.get_or_create() at every sign-in point, so a
    session that has passed TOKEN_MAX_AGE gets a genuinely new key rather than the
    same expired one handed back forever.
    """
    from rest_framework.authtoken.models import Token
    from apps.core_utils.models import TokenActivity

    now = timezone.now()
    token, created = Token.objects.get_or_create(user=user)
    if not created and token.created and now - token.created > TOKEN_MAX_AGE:
        token.delete()
        token = Token.objects.create(user=user)
    TokenActivity.objects.update_or_create(token=token, defaults={'last_used': now})
    return token


def revoke_user_tokens(user):
    """Drop every auth token belonging to `user`.

    Called when the password changes: a credential issued under the old password
    must not keep working, which is exactly what the never-expiring stock token did.
    """
    from rest_framework.authtoken.models import Token
    Token.objects.filter(user=user).delete()
