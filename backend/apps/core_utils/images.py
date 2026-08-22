"""
Upload compression — one implementation that every stored asset goes through.

Wired in at the *storage* layer (see storage.py), not per-model and not per-
serializer, so it covers all 28 ImageField/FileField columns plus anything added
later, and applies equally to uploads from the React admin, the customer
storefront and Django admin.

The knobs live on cms.SiteSettings so an admin can change them from Store
Settings → Media & Uploads without a deploy. Defaults reproduce the limit the
codebase already used in a handful of hardcoded checks: 5 MB.

Pipeline per raster image:
  1. honour the EXIF orientation, then drop all metadata (EXIF/GPS/ICC)
  2. downscale so the longest edge fits `image_max_dimension_px`
  3. re-encode (WebP by default) at `image_compression_quality`
  4. if still over the cap, step quality down, then halve dimensions, and retry
  5. if the result is not actually smaller, keep the original bytes

Vector and document uploads (SVG, PDF) are passed through untouched — there is
nothing useful Pillow can do to them — but the size cap still applies.
"""
import io
import logging
import os

from django.core.files.base import ContentFile
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

# Extensions we never try to re-encode. The cap is still enforced on them.
PASSTHROUGH_EXTENSIONS = {'.svg', '.svgz', '.pdf', '.ico', '.gif'}

# Formats Pillow can write for us, mapped to the extension we store them under.
_OUTPUT = {
    'webp': ('WEBP', '.webp'),
    'jpeg': ('JPEG', '.jpg'),
}

# Quality ladder: each retry drops one step before we resort to shrinking.
_QUALITY_FLOOR = 40
_QUALITY_STEP = 12
# How many times we may halve the dimensions before giving up.
_MAX_SHRINKS = 3


class AssetTooLarge(APIException):
    """Raised when an upload cannot be brought under the configured size cap.

    An APIException subclass so DRF renders it as a clean 413 for the client
    instead of surfacing a 500 from deep inside the storage backend.
    """
    status_code = 413
    default_code = 'asset_too_large'
    default_detail = 'This file is too large to upload.'


class CompressionPolicy:
    """The Store Settings values, resolved once per upload."""

    __slots__ = ('enabled', 'max_bytes', 'quality', 'max_dimension', 'output_format')

    def __init__(self, *, enabled=True, max_size_mb=5, quality=82,
                 max_dimension=2000, output_format='webp'):
        self.enabled = bool(enabled)
        self.max_bytes = max(1, int(max_size_mb)) * 1024 * 1024
        self.quality = min(100, max(_QUALITY_FLOOR, int(quality)))
        self.max_dimension = max(320, int(max_dimension))
        self.output_format = output_format if output_format in _OUTPUT else 'original'

    @property
    def max_size_mb(self):
        return self.max_bytes // (1024 * 1024)

    @classmethod
    def from_site_settings(cls):
        """Read the live policy from cms.SiteSettings.

        Deliberately forgiving: storage backends get instantiated at import time
        and during `migrate`, when the table may not exist yet. Any failure falls
        back to the defaults rather than breaking every upload.
        """
        try:
            from apps.cms.models import SiteSettings
            s = SiteSettings.get()
            return cls(
                enabled=s.image_compression_enabled,
                max_size_mb=s.max_upload_size_mb,
                quality=s.image_compression_quality,
                max_dimension=s.image_max_dimension_px,
                output_format=s.image_output_format,
            )
        except Exception:  # noqa: BLE001 — table missing, no DB, migration in flight
            logger.debug('Falling back to default compression policy', exc_info=True)
            return cls()


def _read(content):
    """Return the whole upload as bytes, leaving the file readable afterwards."""
    if hasattr(content, 'seek'):
        content.seek(0)
    data = content.read()
    if hasattr(content, 'seek'):
        content.seek(0)
    return data


def _encode(image, fmt, quality):
    buf = io.BytesIO()
    params = {'quality': quality}
    if fmt == 'WEBP':
        params['method'] = 6            # slowest, smallest of the WebP presets
    else:
        params['optimize'] = True
        params['progressive'] = True    # JPEG renders top-down while loading
    image.save(buf, format=fmt, **params)
    return buf.getvalue()


def _prepare(data, max_dimension):
    """Decode, straighten, strip metadata and downscale. Returns a PIL image."""
    from PIL import Image, ImageOps

    image = Image.open(io.BytesIO(data))
    # Rotate per the EXIF orientation flag, then forget the flag — otherwise a
    # phone photo re-encoded without its EXIF comes out sideways.
    image = ImageOps.exif_transpose(image)

    # Palette/CMYK/16-bit inputs have to become something the encoder accepts.
    # Keep alpha only when the source actually has it.
    if image.mode in ('RGBA', 'LA', 'PA'):
        image = image.convert('RGBA')
    elif image.mode == 'P' and 'transparency' in image.info:
        image = image.convert('RGBA')
    else:
        image = image.convert('RGB')

    if max(image.size) > max_dimension:
        image.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    # Copying through a fresh image drops EXIF/GPS/ICC that Pillow would
    # otherwise carry into the output.
    clean = Image.new(image.mode, image.size)
    clean.paste(image)
    return clean


def compress(name, content, policy=None):
    """Compress one upload.

    Returns `(name, content, stats)` — a possibly-renamed file (the extension
    changes when we re-encode) and a dict describing what happened, suitable for
    logging. Raises `AssetTooLarge` when the result still exceeds the cap.
    """
    policy = policy or CompressionPolicy.from_site_settings()
    data = _read(content)
    original_size = len(data)
    ext = os.path.splitext(name)[1].lower()

    stats = {
        'name': name,
        'original_bytes': original_size,
        'final_bytes': original_size,
        'action': 'passthrough',
    }

    def _cap(reason):
        if len(data) > policy.max_bytes:
            raise AssetTooLarge(
                f'{os.path.basename(name)} is {len(data) / 1048576:.1f} MB, over the '
                f'{policy.max_size_mb} MB limit{reason}.'
            )

    if not policy.enabled or ext in PASSTHROUGH_EXTENSIONS or policy.output_format == 'original':
        _cap('')
        return name, content, stats

    try:
        image = _prepare(data, policy.max_dimension)
    except Exception:  # noqa: BLE001 — not a raster image Pillow understands
        logger.info('Not a compressible image, storing as-is: %s', name)
        _cap('')
        return name, content, stats

    fmt, out_ext = _OUTPUT[policy.output_format]
    # WebP is the only one of the two that keeps transparency; an RGBA source
    # asked to become JPEG has to be flattened onto white first.
    if fmt == 'JPEG' and image.mode == 'RGBA':
        from PIL import Image as _Image
        flat = _Image.new('RGB', image.size, (255, 255, 255))
        flat.paste(image, mask=image.split()[-1])
        image = flat

    quality = policy.quality
    encoded = _encode(image, fmt, quality)

    # Step the quality down, then start halving the dimensions. In practice a
    # 12 MP phone photo lands well under the cap on the first attempt; this loop
    # only matters for pathological inputs (huge flat scans, screenshots).
    shrinks = 0
    while len(encoded) > policy.max_bytes:
        if quality > _QUALITY_FLOOR:
            quality = max(_QUALITY_FLOOR, quality - _QUALITY_STEP)
        elif shrinks < _MAX_SHRINKS:
            shrinks += 1
            from PIL import Image as _Image
            image = image.resize(
                (max(1, image.width // 2), max(1, image.height // 2)), _Image.LANCZOS
            )
            quality = policy.quality
        else:
            raise AssetTooLarge(
                f'{os.path.basename(name)} could not be compressed under the '
                f'{policy.max_size_mb} MB limit.'
            )
        encoded = _encode(image, fmt, quality)

    if shrinks:
        # The asset only fits because we went below the configured max dimension.
        # Worth surfacing: it means the cap is tighter than the quality settings.
        logger.warning(
            'Downscaled %s a further %dx to fit the %s MB cap — now %dx%d. '
            'Consider raising the cap or lowering the quality in Store Settings.',
            name, 2 ** shrinks, policy.max_size_mb, image.width, image.height,
        )

    # Re-encoding an already-optimised asset can make it bigger (small PNG icons
    # especially). Never ship a worse result than we were given.
    if original_size and len(encoded) >= original_size:
        _cap('')
        stats['action'] = 'kept-original'
        return name, content, stats

    new_name = os.path.splitext(name)[0] + out_ext
    stats.update({
        'name': new_name,
        'final_bytes': len(encoded),
        'action': f'{fmt.lower()}@q{quality}',
        'width': image.width,
        'height': image.height,
        'extra_shrinks': shrinks,
        'saved_pct': round(100 * (1 - len(encoded) / original_size), 1) if original_size else 0,
    })
    return new_name, ContentFile(encoded, name=new_name), stats
