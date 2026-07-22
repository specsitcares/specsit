import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, ChevronDown, Trash2, ImagePlus, X, Upload, Check, ArrowLeft } from 'lucide-react';
import apiClient from '../../../services/api';
import '../../../styles/product_form.css';
import '../../../styles/variants_pricing.css';

const COMPAT_OPTIONS = ['All Eyewear', 'Eyeglasses', 'Sunglasses', 'Contact Lenses'];
const CASE_TYPE_OPTIONS = ['Hard Case', 'Soft Case', 'Folding Case', 'Clamshell Case', 'Pouch', 'Contact Lens Case'];

/* ── Review (step 2) presentational helpers ── */
const money = (x) =>
    x !== '' && x != null && !isNaN(parseFloat(x))
        ? `₹${parseFloat(x).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : null;

const RField = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, fontWeight: 400, color: '#667085' }}>{label}</span>
        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, fontWeight: 500, color: '#101828', lineHeight: 1.4 }}>
            {value || <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
        </span>
    </div>
);

const RSubLabel = ({ children }) => (
    <div style={{ marginBottom: 10 }}>
        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 700, color: '#68408D', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</span>
        <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: 5 }} />
    </div>
);

const RSectionTitle = ({ title }) => (
    <div style={{ marginBottom: 14 }}>
        <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, fontWeight: 500, color: '#040205' }}>{title}</span>
        <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: 6 }} />
    </div>
);

const RColorDot = ({ code }) =>
    code ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: code, border: '1px solid #E4E7EC', flexShrink: 0 }} /> : null;

const AccessoryReview = ({ p, variants, categories, brands, confirmed, setConfirmed, isSolution, isCase }) => {
    const [expanded, setExpanded] = useState({ 0: true });
    const productName = categories.find(c => String(c.id) === String(p.category))?.name || '—';
    const brandName = brands.find(b => String(b.id) === String(p.brand))?.name || '—';
    const isReady = !!(p.title && p.category && variants.length &&
        variants.every(v => v.base_price !== '' && v.base_price != null));

    const td = { padding: '12px 16px', color: '#344054', fontFamily: "'Roboto', sans-serif", fontSize: 13 };

    return (
        <div style={{ fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* General Information */}
            <div>
                <RSectionTitle title="General Information" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                    <RField label="Product" value={productName} />
                    <RField label="Product Title" value={p.title} />
                    <RField label="Manufacturer / Brand" value={brandName} />
                    <RField label="Category" value="Accessories" />
                    <RField label="Tax %" value={p.tax ? String(p.tax) : null} />
                </div>
            </div>

            {/* Inventory Stock */}
            <div>
                <RSectionTitle title="Inventory Stock" />
                <div style={{ border: '1px solid #EAECF0', borderRadius: 6, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Roboto', sans-serif" }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                                {(isSolution ? ['SKU', 'Product Title', 'Stock', 'Selling Price'] : ['SKU', 'Material', 'Material Color', 'Stock', 'Selling Price']).map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#344054', fontSize: 12 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map((v, i) => (
                                <tr key={v._key} style={{ borderBottom: i < variants.length - 1 ? '1px solid #EAECF0' : 'none' }}>
                                    <td style={{ ...td, fontWeight: 500, color: '#101828' }}>{v.sku || '—'}</td>
                                    {isSolution ? (
                                        <td style={td}>{v.name || p.title || '—'}</td>
                                    ) : (
                                        <>
                                            <td style={td}>{v.material || '—'}</td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <RColorDot code={v.color_code} />
                                                    <span>{v.color || '—'}</span>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    <td style={td}>{v.stock !== '' && v.stock != null ? v.stock : '—'}</td>
                                    <td style={td}>{money(v.selling_price) || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Variants & Pricing */}
            <div>
                <RSectionTitle title="Variants & Pricing" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {variants.map((v, i) => {
                        const isOpen = expanded[i] !== false;
                        return (
                            <div key={v._key} style={{ border: '1px solid #EAECF0', borderRadius: 6, overflow: 'hidden' }}>
                                <div
                                    onClick={() => setExpanded(prev => ({ ...prev, [i]: !isOpen }))}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: '#F9FAFB', cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>Variant - {i + 1}</span>
                                    <ChevronDown size={18} style={{ color: '#667085', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                </div>

                                {isOpen && (
                                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, background: 'white' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: isSolution ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 16 }}>
                                            <RField label="Variant Name" value={v.name} />
                                            <RField label="SKU" value={v.sku} />
                                            {!isSolution && (
                                                <RField label="Color Name" value={v.color ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RColorDot code={v.color_code} /><span>{v.color}</span></div>
                                                ) : null} />
                                            )}
                                            <RField label="Total Stock" value={v.stock !== '' && v.stock != null ? String(v.stock) : null} />
                                        </div>

                                        <div>
                                            <RSubLabel>Meta Tags</RSubLabel>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <RField label="Meta Title" value={v.meta_title} />
                                                <RField label="Meta Description" value={v.meta_description} />
                                            </div>
                                        </div>

                                        <div>
                                            <RSubLabel>Technical Specifications</RSubLabel>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                                                <RField label="Material" value={v.material} />
                                                <RField label="Type" value={v.accessory_type} />
                                                <RField label="Compatibility" value={v.compatibility} />
                                                <RField label="Features" value={v.features.length ? v.features.join(', ') : null} />
                                                <RField label="Warranty" value={isCase ? (v.warranty_period || null) : (v.warranty ? 'Warranty Eligible' : 'No Warranty')} />
                                            </div>
                                        </div>

                                        <div>
                                            <RSubLabel>Pricing</RSubLabel>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                                                <RField label="Base Price (MRP)" value={money(v.base_price)} />
                                                <RField label="Selling Price (Auto Calculated)" value={money(v.selling_price)} />
                                                <RField label="Cost Price" value={money(v.cost_price)} />
                                                <RField label="Discount %" value={v.discount !== '' && v.discount != null ? `${parseFloat(v.discount) || 0}` : '0'} />
                                            </div>
                                        </div>

                                        {v.images.length > 0 && (
                                            <div>
                                                <RSubLabel>Product Images</RSubLabel>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {v.images.map((img, ii) => (
                                                        <div key={ii} style={{ width: 72, height: 72, borderRadius: 6, overflow: 'hidden', border: '1px solid #EAECF0', flexShrink: 0, background: '#F9FAFB' }}>
                                                            {img.file?.type === 'video/mp4'
                                                                ? <video src={img.preview} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Submission Settings */}
            <div style={{ border: '1px solid #EAECF0', borderRadius: 6, padding: 16, background: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#040205', fontFamily: "'Roboto', sans-serif", marginBottom: 10 }}>Submission Settings</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: '#667085', fontFamily: "'Roboto', sans-serif" }}>Current Status:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: isReady ? '#ECFDF3' : '#FEF9C3', padding: '3px 10px', borderRadius: 9999 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isReady ? '#12B76A' : '#854D0E' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: isReady ? '#027A48' : '#854D0E', fontFamily: "'Roboto', sans-serif" }}>
                            {isReady ? 'Ready to Publish' : 'Incomplete'}
                        </span>
                    </div>
                </div>
                <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                        style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: '#68408D', flexShrink: 0 }} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#101828', marginBottom: 3, fontFamily: "'Roboto', sans-serif" }}>I confirm all details are correct</div>
                        <div style={{ fontSize: 12, color: '#667085', lineHeight: 1.5, fontFamily: "'Roboto', sans-serif" }}>
                            Checking this box confirms that you have reviewed the product information and it is ready to go live in the catalog.
                        </div>
                    </div>
                </label>
            </div>
        </div>
    );
};

let vKey = 0;
const emptyVariant = () => ({
    _key: `v-${++vKey}`, id: null, expanded: true,
    name: '', sku: '', color: '', color_code: '#808080', paletteImage: null, stock: '',
    material: '', accessory_type: '', compatibility: 'All Eyewear',
    features: [], featureInput: '',
    warranty: false, warranty_period: '',
    base_price: '', selling_price: '', cost_price: '', discount: '',
    meta_title: '', meta_description: '',
    images: [], deletedImageIds: [],
});

const AccessoryForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isEdit = !!id;
    const presetCategory = new URLSearchParams(location.search).get('category') || '';

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [p, setP] = useState({ category: '', title: '', brand: '', tax: '0' });
    const [variants, setVariants] = useState([emptyVariant()]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [confirmed, setConfirmed] = useState(false);
    const fileRefs = useRef({});

    /* ── load lookups + (edit) existing product ── */
    useEffect(() => {
        apiClient.get('/catalog/categories/?group=accessory')
            .then(res => {
                const cats = res.data.results || res.data || [];
                setCategories(cats);
                if (!isEdit && presetCategory) {
                    const match = cats.find(c => c.name.toLowerCase() === presetCategory.toLowerCase());
                    if (match) setP(prev => ({ ...prev, category: String(match.id) }));
                }
            }).catch(() => { });
        apiClient.get('/catalog/brands/?product_type=accessory')
            .then(res => setBrands(res.data.results || res.data || []))
            .catch(() => { });
    }, [isEdit, presetCategory]);

    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            try {
                const prodRes = await apiClient.get(`/catalog/products/${id}/`);
                const prod = prodRes.data;
                setP({
                    category: String(prod.category || ''),
                    title: prod.title || '',
                    brand: prod.brand ? String(prod.brand) : '',
                    tax: '0',
                });
                const vRes = await apiClient.get(`/catalog/variants/?product_type=accessory&admin=true&page_size=100`);
                const all = vRes.data.results || vRes.data || [];
                const mine = all.filter(v => String(v.product) === String(id));
                if (mine.length) {
                    setP(prev => ({ ...prev, tax: String(parseFloat(mine[0].tax_percent) || 0) }));
                    setVariants(mine.map((v, i) => ({
                        ...emptyVariant(), id: v.id, expanded: i === 0,
                        name: v.name || '', sku: v.sku || '', color: v.color || '', color_code: v.color_code || '#808080',
                        paletteImage: v.palette_image ? { preview: v.palette_image, file: null, name: 'Palette image' } : null,
                        stock: String(v.stock ?? ''), material: v.frame_material || '',
                        accessory_type: v.accessory_type || '', compatibility: v.compatibility || 'All Eyewear',
                        features: (v.features || '').split(',').map(t => t.trim()).filter(Boolean),
                        warranty: !!v.is_warranty_eligible, warranty_period: v.warranty_period || '',
                        base_price: v.base_price ?? '', selling_price: v.selling_price ?? '', cost_price: v.cost_price ?? '',
                        discount: v.discount_percent ?? '',
                        meta_title: v.meta_title || '', meta_description: v.meta_description || '',
                        images: (v.images || []).map(img => ({ id: img.id, preview: img.image })),
                    })));
                }
            } catch { setError('Could not load this product.'); }
            finally { setLoading(false); }
        })();
    }, [id, isEdit]);

    const categoryLabel = categories.find(c => String(c.id) === String(p.category))?.name || presetCategory || 'Accessory';
    // Cleaning solutions have no colour/palette per variant; cases use a Type dropdown + warranty-period field.
    const isSolution = /solution/i.test(categoryLabel);
    const isCase = /case/i.test(categoryLabel);
    // Brands are scoped per accessory category — only show brands of the matching type.
    const accessoryBrandTypes = isCase
        ? ['Cases']
        : isSolution
            ? ['Solutions']
            : /cloth/i.test(categoryLabel)
                ? ['Cloths']
                : ['Cases', 'Cloths', 'Solutions'];
    const brandOptions = brands.filter(b => accessoryBrandTypes.includes(b.brand_type));

    const setProd = (f, v) => setP(prev => ({ ...prev, [f]: v }));
    const setVar = (key, f, v) => setVariants(prev => prev.map(x => x._key === key ? { ...x, [f]: v } : x));

    /* selling price auto-calculates from basic price − discount% (matches sibling product form) */
    const setPricing = (key, field, value) => {
        setVariants(prev => prev.map(x => {
            if (x._key !== key) return x;
            const next = { ...x, [field]: value };
            const base = parseFloat(field === 'base_price' ? value : next.base_price) || 0;
            const disc = parseFloat(field === 'discount' ? value : next.discount) || 0;
            if (field === 'base_price' || field === 'discount') {
                next.selling_price = base > 0 ? String((base - (base * disc / 100)).toFixed(2)) : next.selling_price;
            }
            return next;
        }));
    };

    const addFeature = (key) => {
        setVariants(prev => prev.map(x => {
            if (x._key !== key) return x;
            const t = x.featureInput.trim().replace(/,+$/, '');
            if (!t || x.features.includes(t)) return { ...x, featureInput: '' };
            return { ...x, features: [...x.features, t], featureInput: '' };
        }));
    };
    const removeFeature = (key, t) => setVariants(prev => prev.map(x => x._key === key ? { ...x, features: x.features.filter(f => f !== t) } : x));

    const addImages = (key, files) => {
        const picked = [...files]
            .filter(f => f.type.startsWith('image/') || f.type === 'video/mp4')
            .map(f => ({ file: f, preview: URL.createObjectURL(f) }));
        setVariants(prev => prev.map(x => x._key === key ? { ...x, images: [...x.images, ...picked].slice(0, 50) } : x));
    };
    const removeImage = (key, idx) => {
        setVariants(prev => prev.map(x => {
            if (x._key !== key) return x;
            const img = x.images[idx];
            return {
                ...x,
                images: x.images.filter((_, i) => i !== idx),
                deletedImageIds: img.id ? [...x.deletedImageIds, img.id] : x.deletedImageIds,
            };
        }));
    };

    const addVariant = () => setVariants(prev => [...prev.map(v => ({ ...v, expanded: false })), emptyVariant()]);
    const removeVariant = async (key) => {
        const v = variants.find(x => x._key === key);
        if (v?.id) {
            if (!window.confirm('Delete this variant permanently?')) return;
            try { await apiClient.delete(`/catalog/variants/${v.id}/`); } catch { /* may be blocked */ }
        }
        setVariants(prev => prev.length > 1 ? prev.filter(x => x._key !== key) : prev);
    };
    const reset = () => { setVariants([emptyVariant()]); setP(prev => ({ ...prev, title: '', brand: '', tax: '0' })); setError(''); };

    /* ── save ── */
    const save = async (publish) => {
        setSaving(true);
        setError('');
        try {
            const v1 = variants[0] || emptyVariant();
            const totalStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
            const prodPayload = {
                title: p.title.trim() || 'Untitled accessory',
                product_type: 'accessory',
                category: parseInt(p.category) || (categories[0] && categories[0].id),
                brand: p.brand ? parseInt(p.brand) : null,
                base_price: parseFloat(v1.base_price) || 0,
                selling_price: parseFloat(v1.selling_price) || parseFloat(v1.base_price) || 0,
                cost_price: parseFloat(v1.cost_price) || 0,
                discount_percentage: parseFloat(v1.discount) || 0,
                stock_quantity: totalStock,
                meta_title: v1.meta_title || '',
                meta_description: v1.meta_description || '',
                gender: 'Unisex',
                is_active: publish,
            };
            let productId = id;
            if (isEdit) await apiClient.patch(`/catalog/products/${id}/`, prodPayload);
            else productId = (await apiClient.post('/catalog/products/', prodPayload)).data.id;

            for (const v of variants) {
                const fd = new FormData();
                fd.append('product', productId);
                fd.append('sku', v.sku.trim() || `ACC-${productId}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
                fd.append('name', v.name);
                fd.append('color', v.color);
                fd.append('color_code', v.color_code);
                fd.append('color_selection_method', v.paletteImage ? 'palette' : 'code');
                if (v.paletteImage?.file instanceof File) fd.append('palette_image', v.paletteImage.file);
                fd.append('stock', parseInt(v.stock) || 0);
                fd.append('frame_material', v.material);
                fd.append('accessory_type', v.accessory_type);
                fd.append('compatibility', v.compatibility);
                fd.append('features', v.features.join(', '));
                fd.append('warranty_period', v.warranty_period || '');
                // For cases the warranty is captured as a duration ("1 Year"); a non-empty value marks it eligible.
                const warrantyEligible = isCase ? !!v.warranty_period.trim() : v.warranty;
                fd.append('is_warranty_eligible', warrantyEligible ? 'true' : 'false');
                fd.append('base_price', parseFloat(v.base_price) || 0);
                fd.append('selling_price', parseFloat(v.selling_price) || parseFloat(v.base_price) || 0);
                fd.append('cost_price', parseFloat(v.cost_price) || 0);
                fd.append('discount_percent', parseFloat(v.discount) || 0);
                fd.append('tax_percent', parseFloat(p.tax) || 0);
                fd.append('meta_title', v.meta_title);
                fd.append('meta_description', v.meta_description);
                fd.append('is_listed', 'true');

                let variantId = v.id;
                if (v.id) await apiClient.patch(`/catalog/variants/${v.id}/`, fd);
                else variantId = (await apiClient.post('/catalog/variants/', fd)).data.id;

                for (const iid of v.deletedImageIds) {
                    try { await apiClient.delete(`/catalog/variant-images/${iid}/`); } catch { /* gone already */ }
                }
                for (let i = 0; i < v.images.length; i++) {
                    const img = v.images[i];
                    if (img.file instanceof File) {
                        const ifd = new FormData();
                        ifd.append('variant', variantId);
                        ifd.append('image', img.file);
                        ifd.append('order', i);
                        await apiClient.post('/catalog/variant-images/', ifd);
                    }
                }
            }
            navigate('/admin/products');
        } catch (err) {
            const d = err.response?.data;
            setError(typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' · ') : 'Save failed. Please try again.');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div className="product-form-loading">
                <div className="product-form-spinner" />
                <p>Loading…</p>
            </div>
        );
    }

    return (
        <div className="product-form-page">
            {/* ── Header: title + stepper ── */}
            <div className="product-form-header">
                <div className="product-form-header-text">
                    <button
                        className="pf-btn pf-btn-ghost"
                        onClick={() => navigate('/admin/products')}
                        style={{ border: 'none', padding: 0, marginBottom: 6, color: '#697177' }}
                    >
                        <ArrowLeft size={16} /> Back to Products
                    </button>
                    <h1>{isEdit ? 'Edit product' : 'Create product screen'}</h1>
                    <p>Add a new eyewear product to your catalog with precise specifications.</p>
                </div>

                <div className="pf-stepper">
                    <div className="pf-step-item completed">
                        <span className="pf-step-label">Product Details / Variant &amp; Pricing</span>
                        <div className="pf-step-circle-completed">
                            <div className="pf-step-circle-inner">
                                <Check size={14} color="white" strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                    <div className={`pf-step-connector ${currentStep >= 2 ? 'completed' : ''}`} />
                    <div className={`pf-step-item ${currentStep >= 2 ? 'completed' : ''}`}>
                        <span className="pf-step-label">Review &amp; Submit</span>
                        {currentStep >= 2 ? (
                            <div className="pf-step-circle-completed">
                                <div className="pf-step-circle-inner">
                                    <Check size={14} color="white" strokeWidth={3} />
                                </div>
                            </div>
                        ) : (
                            <div className="pf-step-circle-upcoming" />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Form Card ── */}
            <div className="product-form-card">
                <div className="product-form-section-header">
                    <div className="section-title-row">
                        <h2>{currentStep === 1 ? '1. Product Details' : '2. Review & Submit'}</h2>
                        <p>Enter the primary information for your eyewear product.</p>
                    </div>
                </div>

                <div className="product-form-body">
                    <div className="product-form-columns">
                        {currentStep === 1 ? (<>
                        {/* General Information */}
                        <div className="form-sub-section">
                            <div className="form-sub-section-title">
                                <h3>General Information</h3>
                                <hr className="title-divider" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 19 }}>
                                <div className="form-field">
                                    <label className="form-field-label">Product <span className="required-star">*</span></label>
                                    <div className="form-field-select-wrapper">
                                        <select value={p.category} onChange={e => setProd('category', e.target.value)}>
                                            <option value="">Select type</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <span className="select-chevron"><ChevronDown size={16} /></span>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-field-label">Product Title <span className="required-star">*</span></label>
                                    <input className="form-field-input" value={p.title} onChange={e => setProd('title', e.target.value)} placeholder={isCase ? 'Ray-Ban Aviator Classic Case' : isSolution ? 'Lens Cleaning Solution 60ml' : 'Premium Microfiber Cleaning Cloth'} />
                                </div>
                                <div className="form-field">
                                    <label className="form-field-label">Category</label>
                                    <input className="form-field-input" value="Accessories" readOnly style={{ background: '#F9FAFB', color: '#697177' }} />
                                </div>
                                <div className="form-field">
                                    <label className="form-field-label">Manufacturer / Brand</label>
                                    <div className="form-field-select-wrapper">
                                        <select value={p.brand} onChange={e => setProd('brand', e.target.value)}>
                                            <option value="">Select brand</option>
                                            {brandOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                        <span className="select-chevron"><ChevronDown size={16} /></span>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-field-label">Tax <span className="required-star">*</span></label>
                                    <input type="number" min="0" className="form-field-input" value={p.tax} onChange={e => setProd('tax', e.target.value)} placeholder="0%" />
                                </div>
                            </div>
                        </div>

                        {/* Variant and Pricing */}
                        <div className="form-sub-section">
                            <div className="form-sub-section-title">
                                <h3>variant and Pricing</h3>
                                <hr className="title-divider" />
                            </div>

                            <div className="vp-variant-list">
                                {variants.map((v, vi) => (
                                    <div className={`vp-variant-card ${v.expanded ? 'expanded' : ''}`} key={v._key}>
                                        <div className="vp-variant-card-header" onClick={() => setVar(v._key, 'expanded', !v.expanded)}>
                                            <span className="variant-title" style={{ color: '#68408D' }}>{v.name || `variant-${vi + 1}`}</span>
                                            <div className="vp-header-actions">
                                                <ChevronDown size={20} className={`chevron-icon ${v.expanded ? 'open' : ''}`} />
                                            </div>
                                        </div>

                                        {v.expanded && (
                                            <div className="vp-variant-card-body">
                                                {variants.length > 1 && (
                                                    <div className="vp-remove-container">
                                                        <button className="vp-remove-variant-btn" type="button" onClick={e => { e.stopPropagation(); removeVariant(v._key); }}>
                                                            <Trash2 size={14} /> Remove Variant
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Top row — solutions: 3 fields (no colour/palette); others: 5 fields */}
                                                <div className="vp-top-row" style={isSolution ? { gridTemplateColumns: '1.6fr 1fr 1fr' } : undefined}>
                                                    <div className="form-field">
                                                        <label className="form-field-label">Variant name <span className="required-star">*</span></label>
                                                        <input className="form-field-input" value={v.name} onChange={e => setVar(v._key, 'name', e.target.value)} placeholder={isCase ? 'Hard Shell Black' : isSolution ? '60ml Unscented' : 'Large Gray'} />
                                                    </div>
                                                    <div className="form-field">
                                                        <label className="form-field-label">SKU</label>
                                                        <input className="form-field-input" value={v.sku} onChange={e => setVar(v._key, 'sku', e.target.value)} placeholder={isCase ? 'CASE-HS-BLK' : isSolution ? 'SOL-060' : 'CLOTH-LG'} />
                                                    </div>
                                                    {!isSolution && (
                                                        <div className="form-field">
                                                            <label className="form-field-label">Color name</label>
                                                            <div className="vp-color-name-field">
                                                                <div className="vp-color-swatch-trigger" style={{ backgroundColor: v.color_code || '#808080' }}>
                                                                    <input type="color" value={v.color_code} onChange={e => setVar(v._key, 'color_code', e.target.value)} />
                                                                </div>
                                                                <input className="form-field-input" value={v.color} onChange={e => setVar(v._key, 'color', e.target.value)} placeholder={isCase ? 'Black' : 'Gray'} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isSolution && (
                                                        <div className="form-field">
                                                            <label className="form-field-label">Palette image (option)</label>
                                                            <div className="vp-palette-file-btn" onClick={() => fileRefs.current[`palette-${v._key}`]?.click()}>
                                                                {v.paletteImage ? (
                                                                    <div className="palette-preview">
                                                                        <img src={v.paletteImage.preview} alt="Swatch" />
                                                                        <span>{v.paletteImage.name || 'Palette image'}</span>
                                                                        <X size={14} onClick={e => { e.stopPropagation(); setVar(v._key, 'paletteImage', null); }} />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <Upload size={14} />
                                                                        <span>Choose a file</span>
                                                                    </>
                                                                )}
                                                                <input
                                                                    type="file" accept="image/*" style={{ display: 'none' }}
                                                                    ref={el => (fileRefs.current[`palette-${v._key}`] = el)}
                                                                    onChange={e => {
                                                                        const f = e.target.files?.[0];
                                                                        if (f) setVar(v._key, 'paletteImage', { preview: URL.createObjectURL(f), file: f, name: f.name });
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="form-field">
                                                        <label className="form-field-label">Total stock <span className="required-star">*</span></label>
                                                        <input type="number" min="0" className="form-field-input" value={v.stock} onChange={e => setVar(v._key, 'stock', e.target.value)} placeholder="12" />
                                                    </div>
                                                </div>

                                                {/* Technical Specifications */}
                                                <div className="vp-tech-specs">
                                                    <div className="vp-sub-section-label-row">
                                                        <span className="vp-sub-section-label">Technical Specifications</span>
                                                        <hr className="vp-color-divider" />
                                                    </div>
                                                    <div className="vp-row-4">
                                                        <div className="form-field">
                                                            <label className="form-field-label">Material <span className="required-star">*</span></label>
                                                            <input className="form-field-input" value={v.material} onChange={e => setVar(v._key, 'material', e.target.value)} placeholder={isCase ? 'Hard EVA + Microfiber' : isSolution ? 'Saline Solution' : 'Ultra Soft Microfiber'} />
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Type</label>
                                                            {isCase ? (
                                                                <div className="form-field-select-wrapper">
                                                                    <select value={v.accessory_type} onChange={e => setVar(v._key, 'accessory_type', e.target.value)}>
                                                                        <option value="">Select type</option>
                                                                        {CASE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                                    </select>
                                                                    <span className="select-chevron"><ChevronDown size={16} /></span>
                                                                </div>
                                                            ) : (
                                                                <input className="form-field-input" value={v.accessory_type} onChange={e => setVar(v._key, 'accessory_type', e.target.value)} placeholder={isSolution ? 'Lens Cleaning Solution' : categoryLabel === 'Cloths' ? 'Cleaning Cloth' : categoryLabel} />
                                                            )}
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Compatibility</label>
                                                            <div className="form-field-select-wrapper">
                                                                <select value={v.compatibility} onChange={e => setVar(v._key, 'compatibility', e.target.value)}>
                                                                    {COMPAT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                                </select>
                                                                <span className="select-chevron"><ChevronDown size={16} /></span>
                                                            </div>
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Features</label>
                                                            <div className="form-field-input" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 38, height: 'auto', padding: '5px 8px' }}>
                                                                {v.features.map(t => (
                                                                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F4EBFF', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#68408D' }}>
                                                                        {t}<X size={10} style={{ cursor: 'pointer' }} onClick={() => removeFeature(v._key, t)} />
                                                                    </span>
                                                                ))}
                                                                <input
                                                                    value={v.featureInput}
                                                                    onChange={e => setVar(v._key, 'featureInput', e.target.value)}
                                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFeature(v._key); } }}
                                                                    onBlur={() => addFeature(v._key)}
                                                                    placeholder={v.features.length ? '' : (isCase ? 'Waterproof, Shockproof…' : 'Lint Free, Washable…')}
                                                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: 60, fontSize: 13, fontFamily: 'inherit', background: 'transparent', padding: 0 }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="vp-row-4" style={{ marginTop: 12 }}>
                                                        {isCase ? (
                                                            <div className="form-field">
                                                                <label className="form-field-label">warranty <span className="required-star">*</span></label>
                                                                <input className="form-field-input" value={v.warranty_period} onChange={e => setVar(v._key, 'warranty_period', e.target.value)} placeholder="1 Year" />
                                                            </div>
                                                        ) : isSolution ? (
                                                            <div className="form-field">
                                                                <label className="form-field-label">warranty <span className="required-star">*</span></label>
                                                                <div className="form-field-select-wrapper">
                                                                    <select value={v.warranty ? 'yes' : 'no'} onChange={e => setVar(v._key, 'warranty', e.target.value === 'yes')}>
                                                                        <option value="no">No Warranty</option>
                                                                        <option value="yes">Warranty Eligible</option>
                                                                    </select>
                                                                    <span className="select-chevron"><ChevronDown size={16} /></span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="form-field vp-toggle-field">
                                                                <div className="vp-toggle-content">
                                                                    <span className="vp-toggle-label">Warranty</span>
                                                                    <label className="toggle-switch">
                                                                        <input type="checkbox" checked={v.warranty} onChange={e => setVar(v._key, 'warranty', e.target.checked)} />
                                                                        <span className="toggle-slider" />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                <div className="vp-pricing-section">
                                                    <div className="vp-sub-section-label-row">
                                                        <span className="vp-sub-section-label">Pricing</span>
                                                        <hr className="vp-color-divider" />
                                                    </div>
                                                    <div className="vp-row-4">
                                                        <div className="form-field">
                                                            <label className="form-field-label">Basic Price <span className="required-star">*</span></label>
                                                            <input type="number" min="0" className="form-field-input" value={v.base_price} onChange={e => setPricing(v._key, 'base_price', e.target.value)} placeholder="120" />
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Selling price <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>(Auto calculated)</span></label>
                                                            <input type="number" min="0" className="form-field-input" value={v.selling_price} onChange={e => setPricing(v._key, 'selling_price', e.target.value)} placeholder="600" />
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Cost price</label>
                                                            <input type="number" min="0" className="form-field-input" value={v.cost_price} onChange={e => setVar(v._key, 'cost_price', e.target.value)} placeholder="800" />
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Discount <span className="required-star">*</span></label>
                                                            <input type="number" min="0" max="100" className="form-field-input" value={v.discount} onChange={e => setPricing(v._key, 'discount', e.target.value)} placeholder="10%" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Product Images */}
                                                <div className="vp-images-section">
                                                    <div className="vp-sub-section-label-row" style={{ marginBottom: 8 }}>
                                                        <span className="vp-sub-section-label">Product Images</span>
                                                    </div>
                                                    <div className="vp-dropzone-wrapper">
                                                        <div
                                                            className="vp-dropzone"
                                                            onClick={() => fileRefs.current[`images-${v._key}`]?.click()}
                                                            onDragOver={e => e.preventDefault()}
                                                            onDrop={e => { e.preventDefault(); if (e.dataTransfer?.files?.length) addImages(v._key, e.dataTransfer.files); }}
                                                        >
                                                            <div className="upload-icon-circle"><ImagePlus size={24} /></div>
                                                            <div className="vp-dropzone-text">
                                                                <p>Choose a file or drag &amp; drop it here</p>
                                                                <p>JPEG, PNG, PDG, and MP4 formats, up to 50MB</p>
                                                            </div>
                                                            <button className="vp-browse-btn" type="button">Browse File</button>
                                                            <input
                                                                ref={el => (fileRefs.current[`images-${v._key}`] = el)}
                                                                type="file" accept="image/*,video/mp4" multiple style={{ display: 'none' }}
                                                                onChange={e => { if (e.target.files?.length) addImages(v._key, e.target.files); e.target.value = ''; }}
                                                            />
                                                        </div>
                                                        {v.images.length > 0 && (
                                                            <div className="vp-preview-grid">
                                                                {v.images.map((img, i) => (
                                                                    <div key={i} className="vp-preview-card">
                                                                        <div className="preview-media">
                                                                            {img.file?.type === 'video/mp4' ? (
                                                                                <video src={img.preview} autoPlay muted loop />
                                                                            ) : (
                                                                                <img src={img.preview} alt="Preview" />
                                                                            )}
                                                                            <div className="remove-media-btn" onClick={() => removeImage(v._key, i)}>
                                                                                <X size={12} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Meta Tags */}
                                                <div className="vp-meta-section">
                                                    <div className="vp-sub-section-label-row">
                                                        <span className="vp-sub-section-label">Meta Tags</span>
                                                        <hr className="vp-color-divider" />
                                                    </div>
                                                    <div className="vp-row">
                                                        <div className="form-field">
                                                            <label className="form-field-label">Meta title</label>
                                                            <input className="form-field-input" value={v.meta_title} onChange={e => setVar(v._key, 'meta_title', e.target.value)} placeholder={isCase ? 'Ray-Ban Aviator Classic Hard Case' : isSolution ? 'Lens Cleaning Solution 60ml' : 'Premium Microfiber Cleaning Cloth'} />
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-field-label">Meta description</label>
                                                            <input className="form-field-input" value={v.meta_description} onChange={e => setVar(v._key, 'meta_description', e.target.value)} placeholder="Write here…" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        </>) : (
                            <AccessoryReview p={p} variants={variants} categories={categories} brands={brands} confirmed={confirmed} setConfirmed={setConfirmed} isSolution={isSolution} isCase={isCase} />
                        )}

                        {error && (
                            <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 6, padding: '10px 14px', fontSize: 13 }}>{error}</div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="product-form-footer">
                    {currentStep === 1 ? (
                        <button className="pf-btn pf-btn-ghost" onClick={reset} disabled={saving}>Reset</button>
                    ) : (
                        <button className="pf-btn pf-btn-ghost" onClick={() => setCurrentStep(1)} disabled={saving}>Cancels changes</button>
                    )}
                    <div className="product-form-footer-right">
                        {currentStep === 1 && (
                            <button className="pf-btn pf-btn-secondary" onClick={addVariant} disabled={saving}>
                                <Plus size={16} /> Add Color Variant
                            </button>
                        )}
                        <button className="pf-btn pf-btn-outline" onClick={() => save(false)} disabled={saving}>
                            {saving ? 'Saving…' : 'Save as Draft'}
                        </button>
                        {currentStep === 1 ? (
                            <button className="pf-btn pf-btn-primary" onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={saving}>
                                Save and Next
                            </button>
                        ) : (
                            <button className="pf-btn pf-btn-primary" onClick={() => save(true)} disabled={saving || !confirmed}>
                                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccessoryForm;
