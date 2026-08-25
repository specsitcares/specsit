from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from .models import Category, BrandLogo, FrameProduct, FrameVariant, VariantImage, Collection, LensPackage, Lens, ContactLens, Prescription, UserFace, Review, LensConstraint
# Short aliases kept for the rest of this module — the catalog was split into
# FrameProduct/FrameVariant (frames) + AccessoriesProduct/AccessoriesVariants (accessories).
Product = FrameProduct
Variant = FrameVariant
from .serializers import (
    CategorySerializer, BrandSerializer,
    ProductSerializer, VariantSerializer, CollectionSerializer,
    LensPackageSerializer, LensSerializer, ContactLensSerializer, PrescriptionSerializer, UserFaceSerializer,
    ReviewSerializer, VariantImageSerializer, LensConstraintSerializer
)
from django.shortcuts import get_object_or_404  # type: ignore
from django.db.models import (
    Avg, Count, FloatField, IntegerField, OuterRef, Subquery, Sum,
)
from decimal import Decimal, InvalidOperation
import logging
import io
import os
import re
import numpy as np
from apps.core_utils.cache import (
    CachedReadMixin, cache_aside, cache_version,
    TTL_DEFAULT, TTL_NAV_OPTIONS, TTL_REVIEWS,
    TTL_CATEGORY_TREE, TTL_BRAND_LIST, TTL_PRODUCT_LIST,
    TTL_COLLECTION, TTL_LENS_LIST, TTL_CONTACT_LENS,
)
from PIL import Image

logger = logging.getLogger(__name__)


class IsStaffOrReadOnly(permissions.BasePermission):
    """Public/customer reads; only staff (admin) accounts may create, update, or delete."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class _PrivateFileView(APIView):
    """Serve an owned upload only to its owner (or staff).

    Prescriptions and face captures are medical and biometric data. The API around
    them checked ownership correctly, but the FILES were written into MEDIA_ROOT and
    served as ordinary static assets — a permanent, unauthenticated URL. On S3 /
    Supabase the same applied via AWS_QUERYSTRING_AUTH=False. Anyone holding or
    guessing the link had the file, forever.

    Subclasses set `model` and `file_field`. On local storage the bytes are streamed
    through this view; on a remote backend we hand back a short-lived signed URL and
    redirect, so large files never proxy through the app server.
    """
    permission_classes = [permissions.IsAuthenticated]
    model = None
    file_field = None

    def get(self, request, pk):
        from django.http import FileResponse, HttpResponseRedirect
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import PermissionDenied

        obj = get_object_or_404(self.model, pk=pk)
        if not request.user.is_staff and obj.user_id != request.user.id:
            # 404 rather than 403 would also be defensible; 403 is clearer for the
            # owner-facing UI and leaks nothing an authenticated caller can act on.
            raise PermissionDenied('You do not have permission to view this file.')

        f = getattr(obj, self.file_field, None)
        if not f:
            return Response({'detail': 'No file on record.'}, status=status.HTTP_404_NOT_FOUND)

        # Remote storages sign URLs when AWS_QUERYSTRING_AUTH is on; a signed URL
        # expires, so it is safe to hand out at this point (we just authorized it).
        try:
            from django.core.files.storage import default_storage
            if default_storage.__class__.__name__ != 'CompressedFileSystemStorage':
                return HttpResponseRedirect(f.url)
        except Exception:
            logger.warning('Signed-URL path failed for %s #%s; streaming instead',
                           self.model.__name__, pk, exc_info=True)

        response = FileResponse(f.open('rb'))
        response['Cache-Control'] = 'private, max-age=0, no-store'
        return response


class PrescriptionFileView(_PrivateFileView):
    """GET /api/catalog/prescriptions/<pk>/file/ — the owner's uploaded Rx."""
    model = Prescription
    file_field = 'prescription_file'


class FaceCaptureFileView(_PrivateFileView):
    """GET /api/catalog/faces/<pk>/file/ — the owner's stored face capture."""
    model = UserFace
    file_field = 'image'


def _category_is_sunglasses(category):
    """A frame category is 'sunglasses' if its own or its parent's name says so."""
    cat_name = (getattr(category, 'name', '') or '').lower()
    parent_name = (getattr(getattr(category, 'parent', None), 'name', '') or '').lower()
    return 'sunglass' in cat_name or 'sunglass' in parent_name

def _normalize_constraint_name(value):
    """Normalize frame/rim-style values to the same shape as LensConstraint names."""
    if not value:
        return ''
    normalized = re.sub(r'[_\-]+', ' ', str(value).strip())
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def _frame_constraint_name(product):
    """The constraint name this frame's type maps to (Half Rim / Rimless…).

    Uses the frame form's `frame_type`. Full Rim frames accept every lens, so
    they return '' (= no filtering)."""
    frame_type = (product.frame_type or '').strip()

    normalized = _normalize_constraint_name(frame_type)
    if not normalized:
        return ''

    if normalized.lower() in ('full rim', 'fullrim'):
        return ''

    match = LensConstraint.objects.filter(name__iexact=normalized).first()
    if match:
        return match.name

    # Keep compatibility for legacy values that are close to the canonical names.
    legacy_aliases = {
        'half rim': 'Half Rim',
        'half rim frame': 'Half Rim',
        'rimless': 'Rimless',
        'rim less': 'Rimless',
        'rimless frame': 'Rimless',
    }
    if normalized.lower() in legacy_aliases:
        return legacy_aliases[normalized.lower()]

    return normalized

# --- AI Utility Functions ---

# ISO/IEC 7810 ID-1 — the size of every credit/debit card, and in India also of
# the Aadhaar card, PAN card and driving licence. Tolerance is ±0.12 mm, which is
# why a card from the user's wallet makes a trustworthy ruler: the scale of the
# photo is *measured* rather than assumed from an average face width.
ID1_LONG_EDGE_MM = 85.60
ID1_SHORT_EDGE_MM = 53.98
ID1_ASPECT = ID1_LONG_EDGE_MM / ID1_SHORT_EDGE_MM   # 1.5857…

# How far a detected quad's aspect ratio may stray from ID-1 before we reject it.
# Generous because a card on a forehead is always slightly perspective-skewed.
_CARD_ASPECT_TOLERANCE = 0.22
# A card held at arm's length covers roughly 8-45% of the frame width. Anything
# outside that is background clutter (a book, a monitor bezel, a picture frame).
_CARD_MIN_WIDTH_FRAC = 0.08
_CARD_MAX_WIDTH_FRAC = 0.60


def _order_quad(pts):
    """Order 4 points as top-left, top-right, bottom-right, bottom-left."""
    pts = np.asarray(pts, dtype=np.float32).reshape(4, 2)
    by_y = pts[np.argsort(pts[:, 1])]
    top, bottom = by_y[:2], by_y[2:]
    tl, tr = top[np.argsort(top[:, 0])]
    bl, br = bottom[np.argsort(bottom[:, 0])]
    return np.array([tl, tr, br, bl], dtype=np.float32)


def _quad_edges(quad):
    """(mean long edge, mean short edge) in pixels for an ordered quad.

    Averaging the two opposite edges cancels most of the perspective skew from a
    slightly tilted card, which is what makes the long edge a usable ruler.
    """
    tl, tr, br, bl = quad
    top = float(np.linalg.norm(tr - tl))
    bottom = float(np.linalg.norm(br - bl))
    left = float(np.linalg.norm(bl - tl))
    right = float(np.linalg.norm(br - tr))
    horizontal = (top + bottom) / 2.0
    vertical = (left + right) / 2.0
    return max(horizontal, vertical), min(horizontal, vertical)


def _score_quad(quad, frame_w, frame_h):
    """0-1 plausibility that this quad is an ID-1 card. 0 = reject."""
    long_px, short_px = _quad_edges(quad)
    if short_px <= 1 or long_px <= 1:
        return 0.0

    # Aspect must look like a card.
    aspect = long_px / short_px
    aspect_err = abs(aspect - ID1_ASPECT) / ID1_ASPECT
    if aspect_err > _CARD_ASPECT_TOLERANCE:
        return 0.0

    # Size must be plausible for a card held up to the face.
    width_frac = long_px / float(frame_w)
    if not (_CARD_MIN_WIDTH_FRAC <= width_frac <= _CARD_MAX_WIDTH_FRAC):
        return 0.0

    # Convex, and close to a parallelogram — opposite edges similar in length.
    tl, tr, br, bl = quad
    top, bottom = np.linalg.norm(tr - tl), np.linalg.norm(br - bl)
    left, right = np.linalg.norm(bl - tl), np.linalg.norm(br - tr)
    skew = (abs(top - bottom) / max(top, bottom) + abs(left - right) / max(left, right)) / 2.0
    if skew > 0.30:
        return 0.0

    # Prefer the card in the upper half of the frame — it is on the forehead, so
    # a quad low in the shot is more likely a table edge or a shirt pocket.
    cy = float(np.mean(quad[:, 1])) / float(frame_h)
    position = 1.0 if cy < 0.55 else max(0.0, 1.0 - (cy - 0.55) * 2.5)

    aspect_score = 1.0 - (aspect_err / _CARD_ASPECT_TOLERANCE)
    skew_score = 1.0 - (skew / 0.30)
    # Bigger is better for precision — a wider card means finer mm-per-pixel.
    size_score = min(1.0, width_frac / 0.35)

    return round(
        0.40 * aspect_score + 0.25 * skew_score + 0.20 * size_score + 0.15 * position, 3
    )


def _refine_quad_subpixel(gradient_mag, quad, samples=28, search=4.0):
    """Re-fit the quad's four edges to the sub-pixel gradient ridge.

    Contours traced from a thresholded, morphologically-closed edge map sit about
    a pixel inside the card's true border. That biases the long edge low, which
    biases mm-per-pixel high, which inflates the PD by nearly a millimetre — the
    same order as the error the card is here to remove.

    So instead of trusting the contour, walk the normal of each edge and find the
    peak of the intensity gradient (parabolic interpolation through the peak and
    its neighbours), fit a line through ~28 such points, and intersect adjacent
    lines for the corners. Fitting a line also averages out per-pixel noise, which
    corner-only refinement cannot do.

    Returns an ordered quad, or None if any edge could not be fitted.
    """
    import cv2

    height, width = gradient_mag.shape[:2]
    offsets = np.arange(-search, search + 0.5, 0.5, dtype=np.float32)
    # Skip the outer 18% of every edge: ID-1 cards have 3.18mm rounded corners,
    # which is several pixels at any usable capture size and would drag the fit in.
    positions = np.linspace(0.18, 0.82, samples, dtype=np.float32)

    lines = []
    for i in range(4):
        p0, p1 = quad[i], quad[(i + 1) % 4]
        edge = p1 - p0
        length = float(np.linalg.norm(edge))
        if length < 12.0:
            return None
        direction = edge / length
        normal = np.array([-direction[1], direction[0]], dtype=np.float32)

        base = p0[None, :] + edge[None, :] * positions[:, None]              # (N, 2)
        grid = base[:, None, :] + normal[None, None, :] * offsets[None, :, None]
        profile = cv2.remap(
            gradient_mag,
            np.ascontiguousarray(grid[..., 0]), np.ascontiguousarray(grid[..., 1]),
            cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE,
        )                                                                     # (N, M)

        rows = np.arange(profile.shape[0])
        peak_idx = np.argmax(profile, axis=1)
        # Clamp so the 3-point parabola always has both neighbours in range.
        centre = np.clip(peak_idx, 1, profile.shape[1] - 2)
        left, mid, right = profile[rows, centre - 1], profile[rows, centre], profile[rows, centre + 1]
        denom = left - 2.0 * mid + right
        usable = np.abs(denom) > 1e-6
        shift = np.zeros_like(denom)
        np.divide(0.5 * (left - right), denom, out=shift, where=usable)
        shift = np.clip(shift, -1.0, 1.0)
        # `shift` is in samples; the profile is sampled every half pixel.
        found_at = offsets[centre] + shift * 0.5

        keep = profile[rows, peak_idx] > 0
        points = base[keep] + normal[None, :] * found_at[keep, None]
        # Drop samples whose ridge fell outside the image.
        points = points[(points[:, 0] >= 0) & (points[:, 0] < width - 1)
                        & (points[:, 1] >= 0) & (points[:, 1] < height - 1)]
        if len(points) < 10:
            return None

        # Huber rather than plain least squares: a stray gradient from an eyebrow
        # or a glare streak should not tilt the whole edge.
        vx, vy, x0, y0 = cv2.fitLine(
            points.astype(np.float32), cv2.DIST_HUBER, 0, 0.01, 0.01
        ).ravel()
        lines.append((np.array([vx, vy], np.float32), np.array([x0, y0], np.float32)))

    corners = []
    for i in range(4):
        d0, a0 = lines[i - 1]      # edge arriving at corner i
        d1, a1 = lines[i]          # edge leaving corner i
        cross = float(d0[0] * d1[1] - d0[1] * d1[0])
        if abs(cross) < 1e-6:      # parallel — not a quad
            return None
        diff = a1 - a0
        t = float(diff[0] * d1[1] - diff[1] * d1[0]) / cross
        corners.append(a0 + d0 * t)

    return _order_quad(np.array(corners, dtype=np.float32))


def detect_card_quad(image_file):
    """Locate an ID-1 card in a photo and return its four corners.

    The client measures pupils and head pose with MediaPipe WASM in the browser;
    this endpoint supplies the one thing the browser cannot cheaply do — a
    sub-pixel quad for the card that gives the photo an absolute mm scale.

    Unlike the old MediaPipe-on-the-server path this needs no OpenGL:
    opencv-python-headless is the no-GUI build, so it runs fine on hosts without
    libGLESv2 (Render's Python runtime included).

    Returns `({...}, http_status)`. On success the payload carries the ordered
    quad in pixels, the averaged long edge, and a 0-1 detection score. A miss is
    a 200 with `found: False` — the client then asks the user to drag the corners
    manually, which is a normal outcome and not an error.
    """
    try:
        import cv2
    except ImportError:
        logger.error('Card detection unavailable: opencv is not installed')
        return {
            'error': 'Card detection unavailable',
            'details': 'OpenCV is not installed on the server. Place the card corners manually.',
        }, 503

    try:
        pil_image = Image.open(io.BytesIO(image_file.read()))
        pil_image = pil_image.convert('RGB')
        frame = np.array(pil_image)
    except Exception as exc:  # noqa: BLE001 — malformed upload, not a server fault
        return {'error': 'Unreadable image', 'details': str(exc)}, 400

    h, w = frame.shape[:2]
    if w < 160 or h < 160:
        return {'error': 'Image too small', 'details': 'Capture at a higher resolution.'}, 400

    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
    # Bilateral smoothing kills sensor noise and skin texture while keeping the
    # card's border crisp — a plain Gaussian blur softens the very edge we need.
    gray = cv2.bilateralFilter(gray, 9, 60, 60)

    # Chroma channels catch the case luminance misses: a card whose brightness
    # happens to match the forehead behind it but whose colour does not.
    lab = cv2.cvtColor(frame, cv2.COLOR_RGB2LAB)
    chroma_a = cv2.medianBlur(lab[:, :, 1], 5)
    chroma_b = cv2.medianBlur(lab[:, :, 2], 5)

    candidates = []
    # A card can be brighter or darker than the forehead behind it, and glare
    # breaks a single threshold, so sweep a few Canny sensitivities and also try
    # an adaptive threshold. First pass that yields a good quad usually wins.
    edge_maps = [
        cv2.Canny(gray, 30, 90),
        cv2.Canny(gray, 60, 180),
        cv2.Canny(gray, 100, 260),
        cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                              cv2.THRESH_BINARY_INV, 21, 5),
        cv2.bitwise_or(cv2.Canny(chroma_a, 12, 40), cv2.Canny(chroma_b, 12, 40)),
    ]
    kernel = np.ones((3, 3), np.uint8)

    for edges in edge_maps:
        # Close 1px gaps so a partially-lit border still forms a closed contour.
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
        contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:40]:
            if cv2.contourArea(contour) < (w * h) * 0.004:
                continue
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
            if len(approx) != 4 or not cv2.isContourConvex(approx):
                continue
            quad = _order_quad(approx)
            score = _score_quad(quad, w, h)
            if score > 0:
                candidates.append((score, quad))

    if not candidates:
        return {
            'found': False,
            'reason': 'No card-shaped rectangle was found in the photo.',
            'image_size': {'width': w, 'height': h},
        }, 200

    best_score = max(score for score, _ in candidates)
    quad = max(candidates, key=lambda item: item[0])[1]

    # Sub-pixel edge refinement. The mm scale is inversely proportional to the
    # long edge, so a pixel of error on a 150px card is ~0.6mm of PD.
    # Gradient magnitude combines luminance with chroma so the refinement works on
    # a colour-only border too, matching the chroma edge map above.
    try:
        lum_mag = cv2.magnitude(cv2.Scharr(gray, cv2.CV_32F, 1, 0),
                                cv2.Scharr(gray, cv2.CV_32F, 0, 1))
        chroma_mag = cv2.magnitude(cv2.Scharr(chroma_a, cv2.CV_32F, 1, 0),
                                   cv2.Scharr(chroma_a, cv2.CV_32F, 0, 1))
        chroma_mag = np.maximum(chroma_mag,
                                cv2.magnitude(cv2.Scharr(chroma_b, cv2.CV_32F, 1, 0),
                                              cv2.Scharr(chroma_b, cv2.CV_32F, 0, 1)))
        gradient_mag = np.maximum(lum_mag, chroma_mag)

        # The edge-map sweep yields several near-duplicate quads for the same card.
        # Refining all the strong ones and taking the median long edge is markedly
        # steadier than trusting whichever single map happened to score highest —
        # one bad contour can otherwise shift the answer by a couple of millimetres.
        refined = []
        for score, candidate_quad in candidates:
            if score < best_score * 0.8:
                continue
            fitted = _refine_quad_subpixel(gradient_mag, candidate_quad)
            if fitted is None:
                continue
            # The ridge search can latch onto a nearby stronger edge (an eyebrow, a
            # glare streak); only accept a fit that stayed near its detection.
            if float(np.max(np.linalg.norm(fitted - candidate_quad, axis=1))) > 4.0:
                continue
            if _score_quad(fitted, w, h) <= 0:
                continue
            refined.append(fitted)

        if refined:
            long_edges = [_quad_edges(q)[0] for q in refined]
            median_index = int(np.argsort(long_edges)[len(long_edges) // 2])
            quad = refined[median_index]
    except cv2.error:
        pass

    score = best_score
    long_px, short_px = _quad_edges(quad)
    return {
        'found': True,
        'quad': [[round(float(x), 2), round(float(y), 2)] for x, y in quad],
        'long_edge_px': round(long_px, 2),
        'short_edge_px': round(short_px, 2),
        'card_long_edge_mm': ID1_LONG_EDGE_MM,
        'detection_score': score,
        'image_size': {'width': w, 'height': h},
    }, 200

class CategoryViewSet(CachedReadMixin, viewsets.ModelViewSet):
    cache_namespace = 'catalog_categories'
    cache_ttl = TTL_CATEGORY_TREE
    queryset = Category.objects.select_related('parent').all().order_by('id')
    serializer_class = CategorySerializer
    # IsAuthenticatedOrReadOnly here meant "any logged-in customer may write" —
    # catalog structure is staff-owned, so this is IsStaffOrReadOnly like
    # ProductViewSet and VariantViewSet already are.
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = Category.objects.all() if self.request.user.is_staff else Category.objects.filter(is_active=True)
        # Optional filters so e.g. frame-lens admin doesn't see contact-lens categories.
        group = self.request.query_params.get('group')
        if group:
            qs = qs.filter(group=group)
        ctype = self.request.query_params.get('category_type')
        if ctype:
            qs = qs.filter(category_type=ctype)
        return qs.order_by('id')

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def groups(self, request):
        """Return categories grouped by the `group` field for admin tab rendering."""
        groups = []
        for key, label in Category.GROUP_CHOICES:
            cats = Category.objects.filter(group=key)
            if not request.user.is_staff:
                cats = cats.filter(is_active=True)
            data = CategorySerializer(cats.order_by('id'), many=True, context={'request': request}).data
            groups.append({'key': key, 'label': label, 'categories': data})
        return Response(groups)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def subcategories_by_brand(self, request):
        """Get subcategories (child categories) for a given brand.
        Query params:
        - brand_id: Brand ID to filter by
        Returns only child categories (categories with a parent)
        """
        brand_id = request.query_params.get('brand_id')
        if not brand_id:
            return Response({'error': 'brand_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            brand_id = int(brand_id)
        except (ValueError, TypeError):
            return Response({'error': 'brand_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get categories that have products from this brand and are child categories (parent is not null)
        categories = Category.objects.filter(
            products__brand_id=brand_id,
            parent__isnull=False
        ).distinct().order_by('parent', 'name')
        
        data = CategorySerializer(categories, many=True, context={'request': request}).data
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def categories_by_brand(self, request):
        """Get parent categories for a given brand.
        Query params:
        - brand_id: Brand ID to filter by
        Returns only parent categories (parent is null)
        """
        brand_id = request.query_params.get('brand_id')
        if not brand_id:
            return Response({'error': 'brand_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            brand_id = int(brand_id)
        except (ValueError, TypeError):
            return Response({'error': 'brand_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get categories that have products from this brand and are parent categories (parent is null)
        categories = Category.objects.filter(
            products__brand_id=brand_id,
            parent__isnull=True
        ).distinct().order_by('name')
        
        data = CategorySerializer(categories, many=True, context={'request': request}).data
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def children(self, request):
        """Get child categories (subcategories) for a given parent.
        Query params:
        - parent_id: Parent category ID
        Returns only direct children of the given parent
        """
        parent_id = request.query_params.get('parent_id')
        if not parent_id:
            return Response({'error': 'parent_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            parent_id = int(parent_id)
        except (ValueError, TypeError):
            return Response({'error': 'parent_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get only direct children of the given parent
        categories = Category.objects.filter(parent_id=parent_id).order_by('name')
        
        data = CategorySerializer(categories, many=True, context={'request': request}).data
        return Response(data)


class BrandViewSet(CachedReadMixin, viewsets.ModelViewSet):
    cache_namespace = 'catalog_brands'
    cache_ttl = TTL_BRAND_LIST
    queryset = BrandLogo.objects.all().order_by('id')
    serializer_class = BrandSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = BrandLogo.objects.all() if self.request.user.is_staff else BrandLogo.objects.filter(is_published=True)
        brand_type = self.request.query_params.get('brand_type')
        if brand_type:
            qs = qs.filter(brand_type=brand_type)

        product_type = self.request.query_params.get('product_type')
        if product_type:
            if product_type in {'frame', 'eyeglasses', 'sunglasses'}:
                qs = qs.filter(brand_type__in=['Frame'])
            elif product_type in {'lens', 'contact_lens', 'contact'}:
                qs = qs.filter(brand_type__in=['Lens', 'Contact'])
            elif product_type in {'accessory', 'accessories'}:
                qs = qs.filter(brand_type__in=['Cases', 'Cloths', 'Solutions', 'Accessory'])

        return qs.order_by('id')
    

def annotate_review_stats(queryset):
    """Attach `avg_rating` and `review_total` (approved reviews only) to a product queryset.

    Deliberately a correlated Subquery, NOT queryset.annotate(Avg('reviews__rating')).
    The storefront queryset already annotates Sum('variants__stock') and
    Min('variants__selling_price'); adding an aggregate over the unrelated `reviews`
    relation to the same query multiplies the variant rows by the review rows and
    silently corrupts BOTH — the same hazard the rating_min filter documents below.
    A subquery is evaluated independently per product, so nothing fans out.

    Matches ProductSerializer._approved_reviews(): is_approved=True only.
    """
    approved = Review.objects.filter(product=OuterRef('pk'), is_approved=True)
    return queryset.annotate(
        avg_rating=Subquery(
            approved.values('product').annotate(a=Avg('rating')).values('a')[:1],
            output_field=FloatField(),
        ),
        review_total=Subquery(
            approved.values('product').annotate(c=Count('id')).values('c')[:1],
            output_field=IntegerField(),
        ),
    )


# Trailing window that decides bestseller status. Named so the storefront listing
# and the home bundle can never drift apart on it.
BESTSELLER_WINDOW_DAYS = 90


def annotate_units_sold_90d(queryset):
    """Attach `units_sold_90d` — units actually sold in the trailing 90 days.

    Deliberately a correlated Subquery, NOT
    queryset.annotate(Sum('variants__orderitem__quantity', filter=...)).

    That form was a correctness bug, not just a slow query. The storefront queryset
    already annotates Sum('variants__stock'); joining `variants__orderitem` on the
    SAME query multiplies the variant rows by the order-item rows, so every variant's
    stock was counted once per matching order item and total_stock came back inflated.
    Measured on live data before the fix:

        Ray Ban Lenskart -Air Switch    reported 33   actual 22
        Ray Ban Airframe Slim Big Shape reported 27   actual  9
        Cleaning Cloth                  reported 22   actual 11
        Vogue VO9876                    reported  4   actual  3

    total_stock feeds the in_stock / low_stock / out_of_stock filters, so the
    inflation also mis-bucketed inventory. A subquery is evaluated per product and
    never joins into the outer query, so neither aggregate can disturb the other —
    the same reasoning as annotate_review_stats() above.

    Returns NULL (not 0) for a product with no qualifying sales, matching the old
    filtered-Sum behaviour that `units_sold_90d__gt=0` and `nulls_last=True` rely on.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.sales.models import OrderItem

    since = timezone.now() - timedelta(days=BESTSELLER_WINDOW_DAYS)
    sold = (
        OrderItem.objects
        .filter(variant__product=OuterRef('pk'), order__created_at__gte=since)
        # order_status is non-null (CharField, default='pending'), so exclude() here
        # is exactly equivalent to the ~Q() the filtered Sum used.
        .exclude(order__order_status='cancelled')
        .values('variant__product')
        .annotate(total=Sum('quantity'))
        .values('total')[:1]
    )
    return queryset.annotate(
        units_sold_90d=Subquery(sold, output_field=IntegerField())
    )


class ProductPagination(PageNumberPagination):
    # The storefront listing page asks for a specific page_size (12, to match its
    # grid) — the default PageNumberPagination silently ignores that param unless
    # page_size_query_param is set, which left the frontend's page-count math
    # (based on 12/page) out of sync with the server's actual 20/page, causing
    # clicks into "pages" that don't really exist on the backend.
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 48


class ProductViewSet(CachedReadMixin, viewsets.ModelViewSet):
    queryset = FrameProduct.objects.select_related('category', 'brand', 'seo').prefetch_related('variants', 'reviews').all()
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
    pagination_class = ProductPagination
    cache_namespace = 'catalog_products'
    cache_ttl = TTL_PRODUCT_LIST

    def get_object(self):
        """Resolve the URL segment as a slug, falling back to a primary key.

        The storefront addresses products as /product/<product-slug>/<variant-slug>,
        but order history, wishlists and any link shared before slugs existed still
        carry a numeric id — so both have to keep working. An all-digit segment is
        treated as a pk (slugs are never all-digit; unique_slug() prefixes those
        with 'n-' precisely so this branch stays unambiguous).
        """
        lookup = self.kwargs.get(self.lookup_field)
        queryset = self.filter_queryset(self.get_queryset())
        filter_kwargs = {'pk' if str(lookup).isdigit() else 'slug': lookup}
        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def recommended_lenses(self, request, pk=None):
        from .models import Lens, FrameProduct as Product
        from .serializers import LensSerializer
        from apps.core_utils.cache import cache_aside, cache_version

        lens_type_id = request.query_params.get('type')
        # Heavy PDP call — cache per (product, lens-type filter). Bust when either
        # products or lenses change.
        if not (request.user and request.user.is_staff):
            ck = f"catalog:reclens:v{cache_version('catalog_products')}.{cache_version('catalog_lenses')}:{pk}:{lens_type_id or ''}"
            cached = cache_aside(ck, 300, lambda: self._recommended_lenses_data(pk, lens_type_id))
            return Response(cached)
        return Response(self._recommended_lenses_data(pk, lens_type_id))

    def _recommended_lenses_data(self, pk, lens_type_id=None):
        from .models import Lens, FrameProduct as Product
        from .serializers import LensSerializer

        try:
            product = Product.objects.select_related('category').get(pk=pk)
        except Product.DoesNotExist:
            return []

        # prefetch_related mirrors LensViewSet.get_queryset: LensSerializer walks the
        # constraints M2M and package.categories once per lens, which cost one query
        # EACH here — 26 queries for 11 lenses on a single product page.
        lenses = (Lens.objects.filter(is_active=True)
                  .select_related('package', 'brand', 'type', 'type__group')
                  .prefetch_related('constraints', 'package__categories'))

        # Contact lenses are a separate product line (metadata group "Contact Lens Type").
        # They must NEVER appear inside an eyeglasses/sunglasses frame PDP.
        lenses = lenses.exclude(type__group__name__iexact='Contact Lens Type')

        # Segregate by frame type: a sunglasses frame shows only lenses flagged for
        # sunglasses; every other frame (eyeglasses, computer, etc.) shows lenses
        # flagged for eyeglasses. Sunglasses-ness is derived from the product category.
        is_sunglasses = _category_is_sunglasses(product.category)
        if is_sunglasses:
            lenses = lenses.filter(is_for_sunglasses=True)
        else:
            lenses = lenses.filter(is_for_eyeglasses=True)

        # Filter by lens type (MetadataItem ID) if provided
        if lens_type_id:
            lenses = lenses.filter(type_id=lens_type_id)

        # Frame-type ↔ lens-constraint wiring: a package applies to this frame only when
        # one of its constraints matches the frame's type (Full Rim / Half Rim / Rimless…).
        # Constraint-less packages are universal and show for every frame.
        frame_type = _frame_constraint_name(product)
        if frame_type:
            from django.db.models import Q
            lenses = lenses.filter(
                Q(constraints__isnull=True) | Q(constraints__name__iexact=frame_type)
            ).distinct()

        return LensSerializer(lenses, many=True).data

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def applicable_lens_types(self, request, pk=None):
        """Lens types (MetadataItem) that apply to THIS frame, segregated by frame type.

        Segregation rules (single source of truth for the customer lens drawer):
          • Frame-only types apply to every frame.
          • Types that have lens packages apply when at least one package is flagged for
            this frame type (is_for_sunglasses / is_for_eyeglasses).
          • Package-less types apply only when their home_category matches this frame's
            type (sunglasses vs not) — mirroring the admin panel, where a package-less
            type appears solely under its home category. A package-less type with no
            home_category appears nowhere, exactly as in the admin panel.
        """
        from .models import Lens, FrameProduct as Product
        from apps.catalog.core.models import MetadataItem
        from apps.catalog.core.serializers import MetadataItemSerializer
        from django.db.models import Q

        try:
            product = Product.objects.select_related('category').get(pk=pk)
        except Product.DoesNotExist:
            return Response([])

        is_sunglasses = _category_is_sunglasses(product.category)
        frame_type = _frame_constraint_name(product)

        types = list(MetadataItem.objects
                     .filter(group__name__iexact='Lens Type', is_active=True)
                     .select_related('home_category')
                     .order_by('id'))
        type_ids = [t.id for t in types]

        # Pre-fetch what the loop below used to query 1-3x PER type (N+1). Two queries
        # total, regardless of how many lens types exist:
        #   1. which type_ids have ANY active lens at all
        #   2. which of those are actually applicable to this frame (flag + constraint)
        has_any_lens_ids = set(
            Lens.objects.filter(type_id__in=type_ids, is_active=True)
            .values_list('type_id', flat=True).distinct()
        )
        flag = 'is_for_sunglasses' if is_sunglasses else 'is_for_eyeglasses'
        applicable_q = Q(**{flag: True})
        if frame_type:
            # Same frame-type ↔ constraint rule as recommended_lenses: hide types
            # whose packages all serve a different frame type.
            applicable_q &= (Q(constraints__isnull=True) | Q(constraints__name__iexact=frame_type))
        applicable_type_ids = set(
            Lens.objects.filter(type_id__in=type_ids, is_active=True).filter(applicable_q)
            .values_list('type_id', flat=True).distinct()
        )

        result = []
        for t in types:
            name = f"{t.value or ''} {t.label or ''}".lower()
            is_frame_only = bool(re.search(r'frame[\s_-]*only', name))
            # Legacy "Frame Only" types (matched by name) provide no lenses and apply to
            # every frame. Direct-checkout types are NOT treated this way — they stay
            # dedicated to their own category (handled by the package-less branch below),
            # so they never spill into the wrong segment (e.g. Sunglasses).
            if is_frame_only:
                result.append(t)
                continue

            if t.id in has_any_lens_ids:
                if t.id in applicable_type_ids:
                    result.append(t)
                continue

            # Package-less type: show only under its home category (mirrors admin).
            if t.home_category is not None and _category_is_sunglasses(t.home_category) == is_sunglasses:
                result.append(t)

        return Response(cache_aside(
            f"catalog:applicable_lens_types:{pk}:v{cache_version('catalog_lenses')}.{cache_version('catalog_products')}",
            TTL_DEFAULT,
            lambda: MetadataItemSerializer(result, many=True).data,
        ))

    def destroy(self, request, *args, **kwargs):
        from apps.sales.models import OrderItem
        instance = self.get_object()
        if OrderItem.objects.filter(variant__product=instance).exists():
            # Keep product data for order history but hide it
            instance.is_active = False
            instance.save()
            # Also delist all variants so they don't appear anywhere
            instance.variants.update(is_listed=False)
            return Response(
                {'detail': 'Product deactivated (has order history). It will no longer appear on the store.'},
                status=status.HTTP_200_OK
            )
        else:
            # No order history — safe to hard-delete
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        from django.db.models import Exists, OuterRef, Prefetch, Q
        params = self.request.query_params

        # Staff performing write operations (update/delete) need access to ALL products
        # regardless of is_active or variant status, otherwise destroy/update will 404.
        if self.request.user.is_staff and self.action in ('retrieve', 'update', 'partial_update', 'destroy'):
            return annotate_review_stats(
                Product.objects.select_related('category', 'brand', 'seo')
                .prefetch_related('variants__images')
            ).all()

        # Base filter: Always hide inactive products unless explicitly requested by staff
        is_active_filter = params.get('is_active')
        if is_active_filter == 'false' and self.request.user.is_staff:
            queryset = Product.objects.filter(is_active=False)
        elif is_active_filter == 'all' and self.request.user.is_staff:
            queryset = Product.objects.all()
        else:
            queryset = Product.objects.filter(is_active=True)

        # Variant filtering: Hide products without listed variants for customers.
        # For staff, we also hide them by default on the website, but show them in the admin dashboard.
        # Staff users always get admin-level access to see all their products.
        is_admin_request = self.request.user.is_staff and params.get('admin') == 'true'
        
        if not is_admin_request:
            # Images are prefetched on the INNER queryset, not as a top-level
            # 'variants__images' path. A top-level path would fetch images for the
            # unlisted / out-of-stock variants this Prefetch deliberately excludes —
            # wasted rows, and a delisted variant's photos could resurface.
            listed_variants = Variant.objects.filter(
                is_listed=True, stock__gt=0
            ).prefetch_related('images')
            listed = Variant.objects.filter(product=OuterRef('pk'), is_listed=True, stock__gt=0)
            queryset = queryset.filter(Exists(listed)).prefetch_related(
                Prefetch('variants', queryset=listed_variants)
            )
        else:
            queryset = queryset.prefetch_related('variants__images')
        # avg_rating / review_total as subqueries — see annotate_review_stats().
        queryset = annotate_review_stats(queryset)

        queryset = queryset.select_related('category', 'brand', 'seo')

        # Filter by product_type
        product_type = params.get('product_type')
        if product_type:
            queryset = queryset.filter(product_type=product_type)

        # Filter by brand_name — the FK brand's name
        brand_name = params.get('brand_name')
        if brand_name:
            queryset = queryset.filter(brand__name__istartswith=brand_name)

        # Price and stock are per-variant, so aggregate them onto the product row.
        from django.db.models import Sum, Min, F, Avg
        queryset = queryset.annotate(
            total_stock=Sum('variants__stock'),
            min_selling_price=Min('variants__selling_price'),
        )

        # Price range (variants' selling price — already the customer-facing/final price)
        min_price = params.get('min_price')
        max_price = params.get('max_price')
        if min_price:
            try:
                queryset = queryset.filter(min_selling_price__gte=float(min_price))
            except (ValueError, TypeError):
                pass
        if max_price:
            try:
                queryset = queryset.filter(min_selling_price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # New Arrivals — created in the last 30 days. Filtered server-side (not by the
        # client on whatever page happened to be fetched) so pagination counts stay
        # accurate and later pages don't silently drop items already counted.
        if params.get('new_arrivals') in ('1', 'true', 'True'):
            from django.utils import timezone as _timezone
            from datetime import timedelta as _timedelta
            queryset = queryset.filter(created_at__gte=_timezone.now() - _timedelta(days=30))

        # Stock status filter — compares the aggregated variant stock to the product's threshold
        stock_status = params.get('stock_status')
        if stock_status == 'in_stock':
            queryset = queryset.filter(total_stock__gt=F('low_stock_threshold'))
        elif stock_status == 'low_stock':
            queryset = queryset.filter(total_stock__gt=0, total_stock__lte=F('low_stock_threshold'))
        elif stock_status == 'out_of_stock':
            queryset = queryset.filter(Q(total_stock__lte=0) | Q(total_stock__isnull=True))

        # is_active filter
        is_active = params.get('is_active')
        if is_active == 'true':
            queryset = queryset.filter(is_active=True)
        elif is_active == 'false':
            queryset = queryset.filter(is_active=False)

        # Search — product title/brand or any variant SKU
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__istartswith=search) |
                Q(variants__sku__istartswith=search) |
                Q(brand__name__istartswith=search)
            ).distinct()

        # Frame filters
        frame_type_filter = params.getlist('frame_type')
        if frame_type_filter:
            queryset = queryset.filter(frame_type__in=frame_type_filter)

        # frame_material is set per-variant by the admin form (the product-level copy
        # of this field is never populated), so filtering on the product's own
        # frame_material always matched zero rows. Filter through the variant instead.
        frame_material = params.getlist('frame_material')
        if frame_material:
            queryset = queryset.filter(variants__frame_material__in=frame_material).distinct()

        # Existing filters
        category = params.get('category')
        if category:
            if category.isdigit():
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__iexact=category)

        # Frame shape — multi-value support
        shapes = params.getlist('shape')
        if shapes:
            shape_q = Q()
            for s in shapes:
                shape_q |= Q(frame_shape__iexact=s)
            queryset = queryset.filter(shape_q)

        # Gender filter — multi-value
        genders = params.getlist('gender')
        if genders:
            queryset = queryset.filter(gender__in=genders)

        # Frame Color — matches against each variant's own color/frame_color (free-text
        # fields the admin types in), substring match since color names are rarely
        # typed as the exact swatch label (e.g. "Classic Black" vs "Black"). This used
        # to be a client-side-only filter checking a `frame_color` field that doesn't
        # exist on the product at all, so it silently matched nothing.
        color_filters = params.getlist('color')
        if color_filters:
            color_q = Q()
            for c in color_filters:
                color_q |= Q(variants__color__icontains=c) | Q(variants__frame_color__icontains=c)
            queryset = queryset.filter(color_q).distinct()

        # Size — matches variants that actually have a stock_by_size entry for one of
        # the requested sizes (Small/Medium/Large — the only sizes used anywhere else
        # in the app). This replaces a filter that used to check a `frame_width` field
        # that was removed from the schema entirely.
        size_filters = params.getlist('size')
        if size_filters:
            queryset = queryset.filter(variants__stock_by_size__has_any_keys=size_filters).distinct()

        # Lens Type — sunglasses lens attributes, all variant-level.
        lens_type_filters = params.getlist('lens_type')
        if lens_type_filters:
            lens_q = Q()
            for lt in lens_type_filters:
                norm = lt.strip().lower()
                if norm == 'polarized':
                    lens_q |= Q(variants__polarized=True)
                elif norm == 'non-polarized':
                    lens_q |= Q(variants__polarized=False)
                elif norm == 'uv protection':
                    lens_q |= ~Q(variants__uv_protection='')
            if lens_q:
                queryset = queryset.filter(lens_q).distinct()

        # Discount minimum filter — any variant discounted at least this much
        discount_min = params.get('discount_min')
        if discount_min:
            try:
                queryset = queryset.filter(variants__discount_percent__gte=float(discount_min)).distinct()
            except (ValueError, TypeError):
                pass

        # Minimum average rating (approved reviews only, matching ProductSerializer's
        # own average_rating calculation). Computed as an isolated subquery rather than
        # an annotation on the main queryset — the main queryset already annotates
        # Sum/Min over `variants`, and adding an Avg over the unrelated `reviews`
        # relation in the same query would fan-out the join and corrupt both aggregates.
        rating_min = params.get('rating_min')
        if rating_min:
            try:
                rating_min_f = float(rating_min)
                qualifying_ids = list(
                    Product.objects.annotate(
                        avg_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
                    ).filter(avg_rating__gte=rating_min_f).values_list('id', flat=True)
                )
                queryset = queryset.filter(id__in=qualifying_ids)
            except (ValueError, TypeError):
                pass

        # Sorting
        sort_by = params.get('sort_by', '-created_at')

        # Units actually sold in the trailing 90 days (cancelled orders excluded), so
        # the storefront can justify bestseller status with real sales instead of the
        # default-True admin flag alone.
        #
        # Added only for the bestsellers sort. It used to run on every listing request
        # and be discarded — the value is surfaced solely as `units_sold`, which
        # ProductSerializer.get_units_sold defaults to 0 when the annotation is absent,
        # so the other sorts are unaffected.
        if sort_by == 'bestsellers':
            queryset = annotate_units_sold_90d(queryset)
        sort_map = {
            'final_price': 'min_selling_price', '-final_price': '-min_selling_price',
            'stock_quantity': 'total_stock', '-stock_quantity': '-total_stock',
        }
        allowed_sorts = ['created_at', '-created_at', 'title', '-title']
        if sort_by == 'bestsellers':
            # A bestseller must be admin-flagged AND justified by real 90-day sales.
            # Filter server-side so pagination/counts are correct, then rank by volume.
            queryset = queryset.filter(is_bestseller=True, units_sold_90d__gt=0)
            queryset = queryset.order_by(F('units_sold_90d').desc(nulls_last=True), '-created_at')
        elif sort_by in sort_map:
            queryset = queryset.order_by(sort_map[sort_by])
        elif sort_by in allowed_sorts:
            queryset = queryset.order_by(sort_by)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], url_path='nav-options')
    def nav_options(self, request):
        """
        Return dynamic navigation options (brands, shapes, genders)
        derived only from active products that have listed variants in stock.
        Used by the frontend navbar to show real-time categories — fires on
        every page load, so it's cached (see _nav_options_data below).
        """
        product_type = request.query_params.get('product_type', '')
        ck = f"catalog:nav_options:v{cache_version('catalog_products')}.{cache_version('catalog_brands')}:{product_type}"
        return Response(cache_aside(ck, TTL_NAV_OPTIONS, lambda: self._nav_options_data(request)))

    def _nav_options_data(self, request):
        from django.db.models import Exists, OuterRef

        listed = Variant.objects.filter(product=OuterRef('pk'), is_listed=True, stock__gt=0)
        active_products = Product.objects.filter(is_active=True).filter(Exists(listed))

        product_type = request.query_params.get('product_type')
        brand_ids = active_products.filter(brand__isnull=False).values_list('brand', flat=True).distinct()

        brand_qs = BrandLogo.objects.filter(id__in=brand_ids)
        if product_type in {'frame', 'eyeglasses', 'sunglasses'}:
            brand_qs = brand_qs.filter(brand_type='Frame')
        elif product_type in {'lens', 'contact_lens', 'contact'}:
            brand_qs = brand_qs.filter(brand_type__in=['Lens', 'Contact'])
        elif product_type in {'accessory', 'accessories'}:
            brand_qs = brand_qs.filter(brand_type__in=['Cases', 'Cloths', 'Solutions', 'Accessory'])

        brands = list(
            brand_qs.values('id', 'name', 'logo', 'brand_type').order_by('name')
        )
        # Build full logo URLs
        for b in brands:
            if b['logo']:
                b['logo'] = request.build_absolute_uri(f'/media/{b["logo"]}')

        # Distinct frame shapes
        shapes = sorted(
            active_products.exclude(frame_shape__exact='')
            .values_list('frame_shape', flat=True)
            .distinct()
        )

        # Distinct genders
        genders = sorted(
            active_products.values_list('gender', flat=True).distinct()
        )

        # Distinct frame colors — admins type a free-text color name + pick a hex
        # code per variant (VariantsPricingForm.jsx), there's no fixed color enum
        # anywhere, so this (like shapes above) has to be derived from real listed
        # variants rather than hardcoded, or any color name an admin actually uses
        # is permanently unreachable via the storefront's color filter.
        color_rows = (
            Variant.objects.filter(product__in=active_products, is_listed=True, stock__gt=0)
            .exclude(color__exact='')
            .values_list('color', 'color_code')
            .order_by('color')
        )
        colors_by_name = {}
        for name, code in color_rows:
            if name not in colors_by_name:
                colors_by_name[name] = code or '#CCCCCC'
        colors = [{'name': name, 'color': code} for name, code in sorted(colors_by_name.items())]

        return {
            'brands': brands,
            'shapes': shapes,
            'genders': genders,
            'colors': colors,
        }

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def check_sku(self, request):
        """SKU lives on the variant now (not the product) — check there.

        Admin-only: this is a form-validation helper for the admin product/variant
        forms, not a public storefront endpoint — leaving it AllowAny let anyone
        enumerate real SKUs by brute-forcing this query param.
        """
        sku = request.query_params.get('sku', '')
        variant_id = request.query_params.get('exclude_id')
        qs = FrameVariant.objects.filter(sku=sku)
        if variant_id:
            qs = qs.exclude(pk=variant_id)
        return Response({'exists': qs.exists()})

class VariantImageViewSet(viewsets.ModelViewSet):
    queryset = VariantImage.objects.all()
    serializer_class = VariantImageSerializer
    permission_classes = [IsStaffOrReadOnly]

class VariantPagination(PageNumberPagination):
    # The admin Inventory table asks for page_size=1000 to load "everything" into
    # one client-side-searchable/sortable table — the default PageNumberPagination
    # silently ignores that (same bug as ProductViewSet had) and caps every request
    # at PAGE_SIZE=20, so the table only ever had the 20 newest variants to search
    # through. Any variant outside that window looked like "search doesn't work".
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 2000


class VariantViewSet(viewsets.ModelViewSet):
    queryset = FrameVariant.objects.select_related('product', 'product__category', 'product__brand').all().order_by('-id')
    serializer_class = VariantSerializer
    permission_classes = [IsStaffOrReadOnly]
    pagination_class = VariantPagination

    def destroy(self, request, *args, **kwargs):
        from apps.sales.models import OrderItem
        instance = self.get_object()
        if OrderItem.objects.filter(variant=instance).exists():
            # Same guard as ProductViewSet.destroy() — a variant with real order
            # history (invoices, returns, analytics) is deactivated, never hard-deleted,
            # since OrderItem.variant is CASCADE and would wipe that history.
            instance.is_listed = False
            instance.stock = 0
            instance.save(update_fields=['is_listed', 'stock'])
            return Response(
                {'detail': 'Variant deactivated (has order history). It will no longer appear on the store.'},
                status=status.HTTP_200_OK
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        from django.db.models import Q
        params = self.request.query_params
        
        # Always hide variants of inactive products
        qs = Variant.objects.filter(product__is_active=True).select_related('product', 'product__brand', 'product__category').prefetch_related('images')
        
        # Filter listed/stock for customers. Staff in admin context sees everything.
        is_staff = self.request.user.is_staff
        is_admin_query = params.get('admin') == 'true' or params.get('product_type')
        
        # If it's a management action (PATCH/PUT/DELETE) or an explicit admin GET, show everything
        if not (is_staff and (is_admin_query or self.action in ['partial_update', 'update', 'destroy'])):
            # Show only variants that are listed and actually in stock
            qs = qs.filter(is_listed=True, stock__gt=0)


        # NEW: Filter by product type if requested (crucial for segregating frames vs contact lenses in UI)
        ptype = params.get('product_type')
        if ptype:
            qs = qs.filter(product__product_type=ptype)
            
        category = params.get('category')
        if category:
            qs = qs.filter(product__category__name__iexact=category)
            
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(sku__istartswith=search) |
                Q(product__title__istartswith=search) |
                Q(color__istartswith=search) |
                Q(frame_color__istartswith=search) |
                Q(frame_size__istartswith=search) |
                Q(frame_material__istartswith=search)
            )
        return qs.order_by('-id')

    def _parse_stock_by_size(self, data):
        """
        Multipart/form-data sends JSON fields as plain strings.
        Parse stock_by_size string to compute total stock,
        but leave it as a valid JSON string for the serializer's JSONField.
        Returns a mutable QueryDict copy with corrected stock value.
        """
        import json
        data = data.copy()
        raw = data.get('stock_by_size')
        if raw and isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    total = 0
                    for v in parsed.values():
                        if isinstance(v, dict):
                            # New nested format: {bridge_length, lens_width, temple_length, quantity}
                            try:
                                total += int(float(v.get('quantity', 0) or 0))
                            except (TypeError, ValueError):
                                pass
                        elif isinstance(v, (int, float)):
                            # Legacy flat format
                            if v >= 0:
                                total += int(v)
                    data['stock'] = total
                    # Keep stock_by_size as-is (valid JSON string) for the serializer
            except (json.JSONDecodeError, ValueError, TypeError):
                pass
        return data

    def create(self, request, *args, **kwargs):
        data = self._parse_stock_by_size(request.data)
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            logger.warning("Variant validation error: %s", getattr(e, 'detail', str(e)))
            raise e
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = self._parse_stock_by_size(request.data)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class CollectionViewSet(CachedReadMixin, viewsets.ModelViewSet):
    cache_namespace = 'catalog_collections'
    cache_ttl = TTL_COLLECTION
    queryset = Collection.objects.prefetch_related('products').all().order_by('id')
    serializer_class = CollectionSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Collection.objects.all().order_by('id')
        return Collection.objects.filter(is_active=True).order_by('id')

# --- Consolidated Eyewear Feature Views ---

class LensPackageViewSet(viewsets.ModelViewSet):
    queryset = LensPackage.objects.all()
    serializer_class = LensPackageSerializer
    permission_classes = [permissions.IsAdminUser]

class LensConstraintViewSet(viewsets.ModelViewSet):
    # Auto-creating missing constraints used to happen inside this GET's
    # get_queryset() (a write on every read — GET must be idempotent, and it
    # cost an extra values_list() + bulk_create() query on every single request).
    # That logic now lives in the `sync_lens_constraints` management command —
    # run it after importing/editing products instead of relying on a page load.
    queryset = LensConstraint.objects.all().order_by('name')
    serializer_class = LensConstraintSerializer
    permission_classes = [IsStaffOrReadOnly]

class LensViewSet(CachedReadMixin, viewsets.ModelViewSet):
    cache_namespace = 'catalog_lenses'
    cache_ttl = TTL_LENS_LIST
    serializer_class = LensSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        params = self.request.query_params
        # brand is followed by LensSerializer.to_representation (brand_name/brand_logo);
        # constraints and package__categories are both walked per lens there and in the
        # declared `constraints` field. Without these three the list cost one query per
        # lens for each — 41 queries for 13 lenses.
        qs = (Lens.objects
              .select_related('package', 'type', 'brand')
              .prefetch_related('constraints', 'package__categories')
              .all())
        
        # Hide inactive lenses for customers. Staff in admin context/actions sees everything.
        is_staff = self.request.user.is_staff
        is_admin_query = params.get('admin') == 'true'
        
        if not (is_staff and (is_admin_query or self.action in ['partial_update', 'update', 'destroy'])):
            qs = qs.filter(is_active=True)

        is_sunglasses = params.get('is_for_sunglasses')
        if is_sunglasses == 'true':
            qs = qs.filter(is_for_sunglasses=True)
        elif is_sunglasses == 'false':
            qs = qs.filter(is_for_sunglasses=False)

        is_eyeglasses = params.get('is_for_eyeglasses')
        if is_eyeglasses == 'true':
            qs = qs.filter(is_for_eyeglasses=True)
        elif is_eyeglasses == 'false':
            qs = qs.filter(is_for_eyeglasses=False)

        type_group = params.get('type_group')
        if type_group:
            qs = qs.filter(type__group__name=type_group)

        constraint = params.get('constraint')
        if constraint:
            if constraint.isdigit():
                qs = qs.filter(constraint_id=constraint)
            else:
                qs = qs.filter(constraint__name__iexact=constraint)

        # Lens has no Meta.ordering, so an unordered queryset let Postgres return rows
        # in any order it liked between requests — meaning a paginated client could see
        # the same lens on two pages and never see another. Matches the sibling
        # ContactLensViewSet, which already orders by id.
        return qs.order_by('id')

class ContactLensViewSet(CachedReadMixin, viewsets.ModelViewSet):
    cache_namespace = 'catalog_contact_lenses'
    cache_ttl = TTL_CONTACT_LENS
    """Contact lenses only — a separate table from spectacle Lenses."""
    serializer_class = ContactLensSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        params = self.request.query_params
        qs = ContactLens.objects.select_related('package', 'type', 'brand').all()

        # Hide inactive lenses for customers. Staff in admin context/actions sees everything.
        is_staff = self.request.user.is_staff
        is_admin_query = params.get('admin') == 'true'
        if not (is_staff and (is_admin_query or self.action in ['partial_update', 'update', 'destroy'])):
            qs = qs.filter(is_active=True)
        return qs.order_by('id')

class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            qs = Prescription.objects.select_related('user', 'status').prefetch_related(
                'order_items__order'
            ).filter(order_items__isnull=False).distinct()
            status_filter = self.request.query_params.get('status')
            if status_filter and status_filter != 'all':
                from django.db.models import Q
                status_lower = status_filter.lower()
                if status_lower == 'pending':
                    qs = qs.filter(Q(status__isnull=True) | Q(status__label__istartswith='pending'))
                else:
                    qs = qs.filter(status__label__istartswith=status_lower)
            return qs.order_by('-created_at')
        return Prescription.objects.filter(user=self.request.user).select_related('status')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def review(self, request, pk=None):
        if not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only staff members can review prescriptions.')

        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI
        prescription = self.get_object()

        review_status = request.data.get('status')
        review_notes = request.data.get('notes', '')

        if review_status:
            slug_map = {
                'Approved': 'approved',
                'Rejected': 'rejected',
                'Pending': 'pending',
                'Pending Review': 'pending_review',
                'Reupload Requested': 'reupload_requested',
            }
            group, _ = MetadataGroup.objects.get_or_create(name='Prescription Status')
            status_obj, _ = MI.objects.get_or_create(
                group=group,
                label=review_status,
                defaults={'value': slug_map.get(review_status, review_status.lower().replace(' ', '_')), 'is_active': True},
            )
            prescription.status = status_obj

        if 'notes' in request.data:
            prescription.review_notes = request.data.get('notes', '')
        prescription.save()

        from apps.sales.models import Order
        from apps.catalog.core.models import MetadataGroup, MetadataItem as MI

        def _order_status_meta(label, value):
            group, _ = MetadataGroup.objects.get_or_create(name='Order Status')
            meta, _ = MI.objects.get_or_create(
                group=group, label=label,
                defaults={'value': value, 'is_active': True},
            )
            return meta

        linked_orders = Order.objects.filter(items__prescription=prescription).distinct()

        if review_status == 'Approved':
            # Advance pending → confirmed if ALL lens items on the order are now approved
            for order in linked_orders:
                if order.order_status != 'pending':
                    continue
                items = order.items.select_related('lens', 'prescription__status').all()
                lens_items = [i for i in items if i.lens_id]
                if not lens_items:
                    continue
                all_approved = all(
                    i.prescription and i.prescription.status and
                    i.prescription.status.label == 'Approved'
                    for i in lens_items
                )
                if all_approved:
                    Order.objects.filter(pk=order.pk).update(
                        order_status='confirmed',
                        status=_order_status_meta('Confirmed', 'confirmed'),
                    )

        elif review_status in ('Rejected', 'Reupload Requested'):
            # Revert confirmed → pending so the order goes back to "Order Received"
            linked_orders.filter(
                order_status__in=['pending', 'confirmed']
            ).update(order_status='pending', status=_order_status_meta('Pending', 'pending'))

        return Response(self.get_serializer(prescription).data)

class UserFaceViewSet(viewsets.ModelViewSet):
    """
    Handles face capture and PD measurement. 
    Migrated and optimized from eyewear_features.
    """
    serializer_class = UserFaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserFace.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Upsert implementation for UserFace"""
        user = request.user
        image = request.FILES.get('image') or request.data.get('image')

        defaults = {}
        if image:
            defaults['image'] = image

        _BLANK = ('', 'null', 'undefined', None)

        # pd_distance is the binocular total; pd_right_mm/pd_left_mm are the
        # monocular halves the card measurement produces alongside it.
        for payload_key, field in (
            ('pd_distance', 'pd_distance'),
            ('pd_right_mm', 'pd_right_mm'),
            ('pd_left_mm', 'pd_left_mm'),
        ):
            raw = request.data.get(payload_key)
            if raw in _BLANK:
                continue
            try:
                defaults[field] = Decimal(str(raw))
            except (ValueError, TypeError, InvalidOperation):
                pass

        method = request.data.get('pd_method')
        if method in dict(UserFace.PD_METHOD_CHOICES):
            defaults['pd_method'] = method
        confidence = request.data.get('pd_confidence')
        if confidence not in _BLANK:
            defaults['pd_confidence'] = str(confidence)[:10]

        user_face, created = UserFace.objects.update_or_create(
            user=user,
            defaults=defaults
        )

        # If PD is provided, we could also optionally update the latest active prescription
        # but for now we keep them separate as per standard practice.

        serializer = self.get_serializer(user_face)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='detect-card')
    def detect_card(self, request):
        """Locate the ID-1 card in a captured frame (see DetectCardView)."""
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        result, http_status = detect_card_quad(image_file)
        return Response(result, status=http_status)

    @action(detail=False, methods=['get'])
    def current(self, request):
        try:
            user_face = UserFace.objects.get(user=request.user)
            return Response(self.get_serializer(user_face).data)
        except UserFace.DoesNotExist:
            return Response({'detail': 'No face capture found'}, status=status.HTTP_404_NOT_FOUND)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from django.db.models import Q
        params = self.request.query_params

        if self.request.user.is_staff:
            qs = Review.objects.select_related('user', 'product', 'order').all()
        elif self.request.user.is_authenticated:
            # Authenticated customers see approved reviews OR their own (pending) reviews
            qs = Review.objects.select_related('user', 'product', 'order').filter(
                Q(is_approved=True) | Q(user=self.request.user)
            )
        else:
            qs = Review.objects.filter(is_approved=True).select_related('user', 'product')

        # Filters
        is_approved = params.get('is_approved')
        if is_approved == 'true':
            qs = qs.filter(is_approved=True)
        elif is_approved == 'false':
            qs = qs.filter(is_approved=False)

        is_rejected = params.get('is_rejected')
        if is_rejected == 'true':
            qs = qs.filter(is_rejected=True)
        elif is_rejected == 'false':
            qs = qs.filter(is_rejected=False)

        product_id = params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)

        order_id = params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)

        rating = params.get('rating')
        if rating:
            qs = qs.filter(rating=rating)

        date_from = params.get('date_from')
        if date_from:
            try:
                from datetime import datetime, time
                from django.utils import timezone
                dt_from = timezone.make_aware(datetime.combine(datetime.strptime(date_from, '%Y-%m-%d').date(), time.min))
                qs = qs.filter(created_at__gte=dt_from)
            except (ValueError, TypeError):
                pass

        date_to = params.get('date_to')
        if date_to:
            try:
                from datetime import datetime, time
                from django.utils import timezone
                dt_to = timezone.make_aware(datetime.combine(datetime.strptime(date_to, '%Y-%m-%d').date(), time.max))
                qs = qs.filter(created_at__lte=dt_to)
            except (ValueError, TypeError):
                pass

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        from apps.sales.models import Order
        from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError

        order_id = self.request.data.get('order')
        if not order_id:
            raise DRFValidationError({'order': 'This field is required.'})

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            raise DRFValidationError({'order': 'Order not found.'})

        if not order.is_delivered:
            raise PermissionDenied('You can only review delivered orders.')

        if order.user != self.request.user:
            raise PermissionDenied('You can only review your own orders.')

        # One review per product per order (the page submits a review per item).
        product_id = self.request.data.get('product')
        if Review.objects.filter(order=order, user=self.request.user, product_id=product_id).exists():
            raise DRFValidationError({'non_field_errors': 'You have already reviewed this item.'})

        rating = int(self.request.data.get('rating', 0))
        if not (1 <= rating <= 5):
            raise DRFValidationError({'rating': 'Rating must be between 1 and 5.'})

        review = serializer.save(user=self.request.user, is_verified_purchase=True, is_approved=False)
        self._save_review_images(review)

    def perform_update(self, serializer):
        # Reset approval so admin can re-approve edited reviews
        review = serializer.save(is_approved=False)
        self._save_review_images(review)

    def _save_review_images(self, review):
        """Persist customer-uploaded review photos (image_0, image_1, …) and store
        their URLs on the review's review_images list."""
        files = [f for k, f in self.request.FILES.items() if k.startswith('image_')]
        if not files:
            return
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        urls = list(review.review_images or [])
        for f in files[:5]:
            path = default_storage.save(f'review_images/{review.id}_{f.name}', ContentFile(f.read()))
            url = default_storage.url(path)
            if not url.startswith('http'):
                url = self.request.build_absolute_uri(url)
            urls.append(url)
        review.review_images = urls
        review.save(update_fields=['review_images'])

    def get_object(self):
        obj = super().get_object()
        # Customers can only edit their own reviews
        if not self.request.user.is_staff and obj.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to edit this review.')
        return obj

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.is_rejected = False
        review.save(update_fields=['is_approved', 'is_rejected'])
        return Response({'status': 'review approved'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.is_approved = False
        review.is_rejected = True
        review.is_featured = False
        review.save(update_fields=['is_approved', 'is_rejected', 'is_featured'])
        return Response({'status': 'review rejected'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def feature(self, request, pk=None):
        """Toggle whether this review appears in the homepage testimonials.
        Featuring auto-approves it so it's publicly visible."""
        review = self.get_object()
        review.is_featured = not review.is_featured
        if review.is_featured:
            review.is_approved = True
            review.is_rejected = False
        review.save(update_fields=['is_featured', 'is_approved', 'is_rejected'])
        return Response({'status': 'featured' if review.is_featured else 'unfeatured', 'is_featured': review.is_featured}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def featured(self, request):
        """Public: approved + featured reviews for the homepage testimonials section."""
        ck = f"catalog:reviews:featured:v{cache_version('catalog_reviews')}"
        def _produce():
            qs = Review.objects.filter(is_featured=True, is_approved=True).select_related('user', 'product').order_by('-updated_at')[:12]
            return ReviewSerializer(qs, many=True, context={'request': request}).data
        return Response(cache_aside(ck, TTL_REVIEWS, _produce))


class DetectCardView(APIView):
    """Find the ID-1 card in a captured frame.  POST /api/detect-pd-card/

    Half of the card PD measurement. The browser owns the face (pupils and head
    pose, via MediaPipe WASM) and the arithmetic; the server owns finding the
    card, because OpenCV's contour work is far cheaper here than shipping another
    WASM build to the client.

    One request per capture, not per frame — live guidance stays client-side so
    the camera overlay never waits on the network.

    A card that isn't found comes back as 200 `{found: false}`, not an error: the
    client falls back to letting the user drag the four corners by hand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'error': 'No image provided', 'details': 'POST a captured frame as `image`.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result, http_status = detect_card_quad(image_file)
        return Response(result, status=http_status)


class MeasurePDView(APIView):
    """Validate and echo a client-measured PD.  POST /api/measure-pd/

    The browser does the measuring (see frontend/src/services/faceMeasurement.js):
    MediaPipe WASM for pupils and pose, the card quad from `DetectCardView` for
    absolute scale. This endpoint exists so the value is range-checked and logged
    in one place before anything stores it.
    """
    permission_classes = [permissions.IsAuthenticated]

    # Outside this range the number is not a human PD — almost certainly a bad
    # card detection or a mis-dragged corner rather than an unusual face.
    PD_MIN_MM = 40.0
    PD_MAX_MM = 85.0

    def post(self, request):
        pd_mm_raw = request.data.get('pd_mm')
        if pd_mm_raw is None:
            return Response(
                {'error': 'No input provided', 'details': 'Supply pd_mm (measured in the browser).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pd_mm = round(float(pd_mm_raw), 1)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid pd_mm value', 'details': 'pd_mm must be a number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (self.PD_MIN_MM <= pd_mm <= self.PD_MAX_MM):
            return Response(
                {'error': 'PD out of range',
                 'details': f'pd_mm must be between {self.PD_MIN_MM} and {self.PD_MAX_MM} mm. '
                            'Re-measure, or check the card corners are on the card.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = {
            'pd_mm': pd_mm,
            'confidence': request.data.get('confidence', 'client'),
            'method': request.data.get('method', UserFace.PD_METHOD_CARD),
            'source': 'client',
        }

        for key, field in (('pd_right_mm', 'pd_right_mm'), ('pd_left_mm', 'pd_left_mm')):
            raw = request.data.get(key)
            if raw is None:
                continue
            try:
                result[field] = round(float(raw), 1)
            except (ValueError, TypeError):
                pass

        range_min, range_max = request.data.get('range_min'), request.data.get('range_max')
        if range_min is not None and range_max is not None:
            try:
                result['range'] = {
                    'min': round(float(range_min), 1),
                    'max': round(float(range_max), 1),
                }
            except (ValueError, TypeError):
                pass

        logger.info(
            'PD measured in browser: %s mm (method=%s, confidence=%s)',
            pd_mm, result['method'], result['confidence'],
        )
        return Response(result, status=status.HTTP_200_OK)