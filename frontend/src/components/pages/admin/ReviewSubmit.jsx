import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Field = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', fontWeight: 400, color: '#667085' }}>
      {label}
    </span>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 500, color: '#101828', lineHeight: 1.4 }}>
      {value || <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
    </span>
  </div>
);

const SubLabel = ({ children }) => (
  <div style={{ marginBottom: '10px' }}>
    <span style={{
      fontFamily: "'Roboto', sans-serif", fontSize: '10px', fontWeight: 700,
      color: '#68408D', textTransform: 'uppercase', letterSpacing: '0.07em',
    }}>
      {children}
    </span>
    <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: '5px' }} />
  </div>
);

const SectionTitle = ({ title }) => (
  <div style={{ marginBottom: '14px' }}>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '13px', fontWeight: 500, color: '#040205' }}>
      {title}
    </span>
    <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', marginTop: '6px' }} />
  </div>
);

const ReadOnlyToggle = ({ checked }) => (
  <div style={{
    width: 36, height: 20, borderRadius: 10,
    background: checked ? '#68408D' : '#D0D5DD',
    position: 'relative', display: 'inline-block', flexShrink: 0,
  }}>
    <div style={{
      position: 'absolute', top: 3,
      left: checked ? 17 : 3,
      width: 14, height: 14, borderRadius: '50%', background: 'white',
      transition: 'left 0.2s',
    }} />
  </div>
);

const ColorDot = ({ code }) =>
  code ? (
    <div style={{
      width: 12, height: 12, borderRadius: '50%',
      background: code, border: '1px solid #E4E7EC', flexShrink: 0,
    }} />
  ) : null;

const normalizeSizeEntry = (entry) => {
  if (typeof entry === 'object' && entry !== null) return entry;
  const qty = typeof entry === 'string' && entry.startsWith('U:')
    ? parseInt(entry.replace('U:', '')) || 0
    : parseInt(entry) || 0;
  return { lens_width: '', bridge_length: '', temple_length: '', quantity: qty };
};

const ReviewSubmit = ({ formData, categories, brands, confirmed, setConfirmed, errors, productType = 'eyeglasses' }) => {
  const isSunglasses = productType === 'sunglasses';

  const getCategoryName = (id) => categories.find(c => c.id?.toString() === id?.toString())?.name || '—';
  const getBrandName   = (id) => brands.find(b => b.id?.toString() === id?.toString())?.name || '—';

  const [expandedVariants, setExpandedVariants] = useState({ 0: true });
  const [activeSizeTabs, setActiveSizeTabs] = useState({});

  const toggleVariant = (idx) =>
    setExpandedVariants(prev => ({ ...prev, [idx]: !prev[idx] }));

  const getResolvedMeta = (v) => {
    const base  = formData.title || '—';
    const color = v.variantName || v.colorName || 'Default';
    if (v.meta_auto !== false) {
      return {
        title:       `${base} | ${color} | SPECSIT`,
        description: `Buy ${base} in ${color} at Specsit. Shop premium eyewear online.`,
      };
    }
    return {
      title:       v.meta_title?.trim()       || `${base} | ${color} | SPECSIT`,
      description: v.meta_description?.trim() || `Buy ${base} in ${color} at Specsit. Shop premium eyewear online.`,
    };
  };

  const variants = formData.variants || [];

  const isReady = !!(
    formData.title &&
    formData.category &&
    variants.length > 0 &&
    variants.every(v => v.sku && v.colorName && v.base_price)
  );

  const getSizeKeys = (stockBySize) =>
    Object.keys(stockBySize || {}).filter(k => ['Small', 'Medium', 'Large'].includes(k));

  /* ── shared cell style ── */
  const td = { padding: '12px 16px', color: '#344054', fontFamily: "'Roboto', sans-serif", fontSize: '13px' };

  return (
    <div style={{ fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── General Information ── */}
      <div>
        <SectionTitle title="General Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <Field label="Product Title"        value={formData.title} />
          <Field label="Manufacturer / Brand" value={getBrandName(formData.brand)} />
          <Field label="Category"             value={getCategoryName(formData.category)} />
          <Field label="Tax %"                value={formData.taxPercent ? String(formData.taxPercent) : null} />
        </div>
      </div>

      {/* ── Inventory Stock table ── */}
      <div>
        <SectionTitle title="Inventory Stock" />
        <div style={{ border: '1px solid #EAECF0', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: "'Roboto', sans-serif" }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                {['SKU', 'Frame name', 'Frame Color', ...(isSunglasses ? ['Lens Color'] : []), 'Stock', 'Selling Price'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#344054', fontSize: '12px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v.id || i} style={{ borderBottom: i < variants.length - 1 ? '1px solid #EAECF0' : 'none' }}>
                  <td style={{ ...td, fontWeight: 500, color: '#101828' }}>{v.sku || '—'}</td>
                  <td style={td}>{v.variantName || v.colorName || `Variant ${i + 1}`}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ColorDot code={v.colorCode} />
                      <span>{v.colorName || '—'}</span>
                    </div>
                  </td>
                  {isSunglasses && (
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ColorDot code={v.lens_color_code} />
                        <span>{v.lens_color_name || '—'}</span>
                      </div>
                    </td>
                  )}
                  <td style={td}>{v.quantity != null ? v.quantity : '—'}</td>
                  <td style={td}>
                    {v.selling_price
                      ? `₹${parseFloat(v.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Variants & Pricing ── */}
      <div>
        <SectionTitle title="Variants & Pricing" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {variants.map((v, i) => {
            const isExpanded      = expandedVariants[i] !== false;
            const meta            = getResolvedMeta(v);
            const sizeKeys        = getSizeKeys(v.stock_by_size);
            const activeSize      = activeSizeTabs[i] || sizeKeys[0] || 'Small';
            const activeSizeEntry = normalizeSizeEntry(v.stock_by_size?.[activeSize]);

            return (
              <div key={v.id || i} style={{ border: '1px solid #EAECF0', borderRadius: '6px', overflow: 'hidden' }}>

                {/* Accordion Header */}
                <div
                  onClick={() => toggleVariant(i)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '11px 16px', background: '#F9FAFB', cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#344054' }}>Variant - {i + 1}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      color: '#667085',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white' }}>

                    {/* Top 4 fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                      <Field label="Variant Name" value={v.variantName} />
                      <Field label="SKU"          value={v.sku} />
                      <Field
                        label={isSunglasses ? 'Frame Color name' : 'Color Name'}
                        value={
                          v.colorName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ColorDot code={v.colorCode} />
                              <span>{v.colorName}</span>
                            </div>
                          ) : null
                        }
                      />
                      <Field label="Total Stock" value={v.quantity != null ? String(v.quantity) : null} />
                    </div>

                    {/* META TAGS */}
                    <div>
                      <SubLabel>Meta Tags</SubLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Field label="Meta Title"       value={meta.title} />
                        <Field label="Meta Description" value={meta.description} />
                      </div>
                    </div>

                    {/* STOCK BY SIZE */}
                    {sizeKeys.length > 0 && (
                      <div>
                        <SubLabel>Stock by Size</SubLabel>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#667085', fontFamily: "'Roboto', sans-serif" }}>Size -</span>
                          {sizeKeys.map(size => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setActiveSizeTabs(prev => ({ ...prev, [i]: size }))}
                              style={{
                                padding: '3px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                border: '1px solid #D0D5DD', borderRadius: '4px',
                                background: activeSize === size ? '#68408D' : 'white',
                                color: activeSize === size ? 'white' : '#344054',
                                fontFamily: "'Roboto', sans-serif", transition: 'all 0.15s',
                              }}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <div style={{ border: '1px dashed #D0D5DD', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                            {['Lens Width', 'Bridge Length', 'Temple Length', 'Quantity'].map(h => (
                              <div key={h} style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: '#344054', fontFamily: "'Roboto', sans-serif" }}>
                                {h}
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                            {[activeSizeEntry.lens_width, activeSizeEntry.bridge_length, activeSizeEntry.temple_length, activeSizeEntry.quantity].map((val, ci) => (
                              <div key={ci} style={{ padding: '10px 14px', fontSize: '13px', color: '#101828', fontFamily: "'Roboto', sans-serif" }}>
                                {val || '—'}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TECHNICAL SPECIFICATIONS */}
                    <div>
                      <SubLabel>Technical Specifications</SubLabel>
                      {isSunglasses ? (
                        <>
                          {/* Row 1: Barcode | Frame Dimensions | Lens Color | Weight */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                            <Field label="Barcode"         value={v.barcode} />
                            <Field label="Frame Dimensions" value={v.frame_dimensions} />
                            <Field
                              label="Lens Color"
                              value={
                                v.lens_color_name ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ColorDot code={v.lens_color_code} />
                                    <span>{v.lens_color_name}</span>
                                  </div>
                                ) : null
                              }
                            />
                            <Field label="Weight" value={v.weight} />
                          </div>
                          {/* Row 2: Frame Material | Lens Material | Frame Shape | UV Protection */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                            <Field label="Frame Material" value={v.frame_material} />
                            <Field label="Lens Material"  value={v.lens_material} />
                            <Field label="Frame Shape"    value={v.frame_shape} />
                            <Field label="UV Protection"  value={v.uv_protection} />
                          </div>
                          {/* Row 3: Polarized | Country of Origin */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                            <Field label="Polarized"        value={v.polarized} />
                            <Field label="Country of Origin" value={v.country_of_origin} />
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', alignItems: 'end' }}>
                          <Field label="Frame Material" value={v.frame_material} />
                          <Field label="Frame Type"     value={v.frame_type} />
                          <Field label="Frame Shape"    value={v.frame_shape} />
                          <Field label="Gender Target"  value={v.gender} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', fontWeight: 400, color: '#667085' }}>Frame Only Mode</span>
                            <ReadOnlyToggle checked={v.frame_only_mode || false} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: '12px', fontWeight: 400, color: '#667085' }}>Warranty</span>
                            <ReadOnlyToggle checked={v.is_warranty_eligible !== false} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PRICING */}
                    <div>
                      <SubLabel>Pricing</SubLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                        <Field
                          label="Base Price (MRP)"
                          value={v.base_price ? `₹${parseFloat(v.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null}
                        />
                        <Field
                          label="Selling Price (Auto Calculated)"
                          value={v.selling_price ? `₹${parseFloat(v.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null}
                        />
                        <Field
                          label="Cost Price"
                          value={v.cost_price ? `₹${parseFloat(v.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null}
                        />
                        <Field
                          label="Discount %"
                          value={v.discount_percentage ? `${parseFloat(v.discount_percentage).toFixed(0)}` : '0'}
                        />
                      </div>
                    </div>

                    {/* PRODUCT IMAGES */}
                    {(v.images || []).length > 0 && (
                      <div>
                        <SubLabel>Product Images</SubLabel>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {v.images.map((img, imgIdx) => (
                            <div
                              key={img.id || imgIdx}
                              style={{
                                width: 72, height: 72, borderRadius: '6px', overflow: 'hidden',
                                border: '1px solid #EAECF0', flexShrink: 0, background: '#F9FAFB',
                              }}
                            >
                              <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      {/* ── Submission Settings ── */}
      <div style={{ border: '1px solid #EAECF0', borderRadius: '6px', padding: '16px', background: 'white' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#040205', fontFamily: "'Roboto', sans-serif", marginBottom: '10px' }}>
          Submission Settings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '12px', color: '#667085', fontFamily: "'Roboto', sans-serif" }}>Current Status:</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: isReady ? '#ECFDF3' : '#FEF9C3',
            padding: '3px 10px', borderRadius: '9999px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isReady ? '#12B76A' : '#854D0E' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: isReady ? '#027A48' : '#854D0E', fontFamily: "'Roboto', sans-serif" }}>
              {isReady ? 'Ready to Publish' : 'Incomplete'}
            </span>
          </div>
        </div>
        <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: '#68408D', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#101828', marginBottom: '3px', fontFamily: "'Roboto', sans-serif" }}>
              I confirm all details are correct
            </div>
            <div style={{ fontSize: '12px', color: '#667085', lineHeight: 1.5, fontFamily: "'Roboto', sans-serif" }}>
              Checking this box confirms that you have reviewed the product information and it is ready to go live in the catalog.
            </div>
          </div>
        </label>
      </div>

      {errors?.general && (
        <div style={{
          background: '#FEF3F2', border: '1px solid #FECDCA',
          padding: '12px 16px', borderRadius: '6px',
          color: '#B42318', fontSize: '13px', fontFamily: "'Roboto', sans-serif",
        }}>
          {errors.general}
        </div>
      )}
    </div>
  );
};

export default ReviewSubmit;
