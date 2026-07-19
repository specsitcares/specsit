export const getCartItemDisplayName = (item) => {
    if (!item) return 'Item';
    if (item.type === 'contactlens') return item.name || 'Contact Lens';
    return item.product?.title || item.name || 'Product';
};

export const getCartItemDetails = (item) => {
    if (!item) return [];

    const details = [];
    const frameName = item.product?.title || item.name || '';
    const lensName = item.lens?.name || item.lens?.package_name || '';
    const rx = item.prescription || {};
    const rxName = rx.name || rx.patient_name || '';
    const rxPhone = rx.phone || rx.mobile || '';

    if (frameName) details.push(`Frame: ${frameName}`);
    if (lensName) details.push(`Lens: ${lensName}`);
    if (rxName) details.push(`Name: ${rxName}`);
    if (rxPhone) details.push(`Phone: ${rxPhone}`);

    return details;
};

export const getVariantDisplayName = (item) => {
    if (!item) return 'Variant';
    const variant = item.variant || {};
    const explicit = variant.name || variant.variant_name || variant.title || '';
    const fallbackParts = [variant.color_name, variant.size, variant.frame_shape, variant.frame_type].filter(Boolean);
    return explicit || fallbackParts.join(' / ') || 'Standard';
};

export const getLensPackageName = (item) => {
    if (!item) return '';
    return item.lens?.name || item.lens?.package_name || item.lens?.type || item.lens?.lens_name || '';
};

export const getCartItemSummaryDetails = (item) => {
    if (!item) return [];

    const details = [];
    const rx = item.prescription || {};
    const rxName = rx.name || rx.patient_name || '';
    const rxPhone = rx.phone || rx.mobile || '';
    const lensName = getLensPackageName(item);
    const lensPrice = item.lens ? parseFloat(item.lens.price || 0) : 0;

    if (rxName) details.push(`Name: ${rxName}`);
    if (rxPhone) details.push(`Phone: ${rxPhone}`);
    if (lensName) details.push(`Lens Package: ${lensName}`);
    if (lensName && lensPrice > 0) details.push(`Lens Price: ₹${lensPrice.toLocaleString('en-IN')}`);

    return details;
};

export const getCartItemLineTotal = (item, resolveProductPrice = () => 0) => {
    if (!item) return 0;
    if (item.type === 'contactlens') {
        return (parseFloat(item.price) || 0) * (item.quantity || 1);
    }
    const framePrice = resolveProductPrice(item.product, item.variant);
    const lensPrice = item.lens ? parseFloat(item.lens.price || 0) : 0;
    return (framePrice + lensPrice) * (item.quantity || 1);
};
