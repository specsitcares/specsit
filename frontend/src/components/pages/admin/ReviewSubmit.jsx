import React from 'react';

const F = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '13px', color: '#6b7280', letterSpacing: '-0.04px' }}>
      {label}
    </span>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '14px', color: '#111827', lineHeight: '20px' }}>
      {value || <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
    </span>
  </div>
);

const SubHeading = ({ title }) => (
  <div style={{ fontSize: '11px', fontWeight: 700, color: '#68408D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', marginTop: '4px' }}>
    {title}
  </div>
);

const Divider = () => (
  <hr style={{ border: 'none', borderTop: '1px solid #EAECF0', margin: '16px 0' }} />
);

const SectionHeading = ({ title, bold }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: bold ? 700 : 500, fontSize: '16px', color: '#040205' }}>
      {title}
    </span>
    <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: 0 }} />
  </div>
);

const ReviewSubmit = ({ formData, categories, brands, confirmed, setConfirmed, errors }) => {
  const getCategoryName = (id) => categories.find(c => c.id?.toString() === id?.toString())?.name || '—';
  const getBrandName    = (id) => brands.find(b => b.id?.toString() === id?.toString())?.name || '—';

  const getResolvedMeta = (v) => {
    const base = formData.title || '—';
    const color = v.variantName || v.colorName || 'Default';
    if (v.meta_auto !== false) {
      return {
        title: `${base} | ${color} | SPECSIT`,
        description: `Buy ${base} in ${color} at Specsit. Shop premium eyewear online.`,
      };
    }
    return {
      title: v.meta_title?.trim() || `${base} | ${color} | SPECSIT`,
      description: v.meta_description?.trim() || `Buy ${base} in ${color} at Specsit. Shop premium eyewear online.`,
    };
  };

  const variants = formData.variants || [];
  const isReady = !!(formData.title && formData.category && variants.length > 0 &&
    variants.every(v => v.sku && v.colorName && v.base_price));

  return (
    <div style={{ fontFamily: "'Roboto', sans-serif", paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── General Information ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeading title="General Information" bold />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 40px' }}>
          <F label="Product Title"        value={formData.title} />
          <F label="Manufacturer / Brand" value={getBrandName(formData.brand)} />
          <F label="Category"             value={getCategoryName(formData.category)} />
          <F label="Short Description"    value={formData.short_description} />
          <F label="Tax %"                value={formData.taxPercent ? `${formData.taxPercent}%` : null} />
        </div>
      </div>

      {/* ── Per-Variant Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeading title="Variants" />

        {variants.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', border: '1px dashed #E5E7EB', borderRadius: '6px' }}>
            No variants added yet.
          </div>
        )}

        {variants.map((v, i) => {
          const meta = getResolvedMeta(v);
          return (
            <div
              key={v.id || i}
              style={{ border: '1px dashed #68408D', borderRadius: '6px', background: '#FDFAFF', padding: '20px' }}
            >
              {/* Variant header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: v.colorCode || '#D0D5DD', border: '1px solid #E4E7EC', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#040205' }}>
                  {v.variantName || v.colorName || `Variant ${i + 1}`}
                </span>
                {v.variantName && v.colorName && (
                  <span style={{ fontSize: '13px', color: '#667085' }}>({v.colorName})</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9CA3AF', fontWeight: 400 }}>
                  SKU: {v.sku || '—'}
                </span>
              </div>

              {/* Pricing */}
              <SubHeading title="Pricing & Stock" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 24px' }}>
                <F label="MRP (Base Price)"
                   value={v.base_price ? `₹${parseFloat(v.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null} />
                <F label="Selling Price"
                   value={v.selling_price ? `₹${parseFloat(v.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null} />
                <F label="Cost Price"
                   value={v.cost_price ? `₹${parseFloat(v.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null} />
                <F label="Discount %" value={v.discount_percentage ? `${parseFloat(v.discount_percentage).toFixed(0)}%` : null} />
                <F label="Stock / Quantity" value={v.quantity != null ? String(v.quantity) : null} />
                <F label="Images Uploaded" value={`${(v.images || []).length} image${(v.images || []).length !== 1 ? 's' : ''}`} />
              </div>

              <Divider />

              {/* Technical Specifications */}
              <SubHeading title="Technical Specifications" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 40px' }}>
                <F label="Frame Material"  value={v.frame_material} />
                <F label="Frame Width"     value={v.frame_width} />
                <F label="Frame Type"      value={v.frame_type} />
                <F label="Frame Shape"     value={v.frame_shape} />
                <F label="Frame Size"      value={v.frame_size} />
                <F label="Gender Target"   value={v.gender} />
                <F label="Frame Only Mode" value={v.frame_only_mode ? 'Enabled' : 'Disabled'} />
                <F label="Warranty Eligible" value={v.is_warranty_eligible !== false ? 'Yes' : 'No'} />
              </div>

              <Divider />

              {/* Meta Tags */}
              <SubHeading title={`Meta Tags${v.meta_auto !== false ? ' (auto-generated)' : ''}`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 40px' }}>
                <F label="Meta Title"       value={meta.title} />
                <F label="Meta Description" value={meta.description} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Marketing & Promotions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionHeading title="Marketing & Promotions" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 40px' }}>
          <F label="BOGO"                value={formData.isBogo ? 'Enabled' : 'Disabled'} />
          <F label="Discount Start Date" value={formData.discountStartDate || null} />
          <F label="Discount End Date"   value={formData.discountEndDate || null} />
        </div>
      </div>

      {/* ── Submission Settings ── */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '25px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>Submission Settings</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 500, fontSize: '14px', color: '#6b7280' }}>Current Status:</span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: isReady ? '#dcfce7' : '#FEF9C3',
                padding: '4px 10px', borderRadius: '9999px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '3px', background: isReady ? '#166534' : '#854D0E' }} />
                <span style={{ fontWeight: 600, fontSize: '12px', color: isReady ? '#166534' : '#854D0E' }}>
                  {isReady ? 'Ready to Publish' : 'Incomplete'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingTop: '8px' }}>
            <div style={{ paddingTop: '2px', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0f172a' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 500, fontSize: '16px', color: '#111827' }}>I confirm all details are correct</span>
              <span style={{ fontWeight: 400, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                Checking this box confirms that you have reviewed the product information and it is ready to go live in the catalog.
              </span>
            </div>
          </div>
        </div>
      </div>

      {errors?.general && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', padding: '12px 16px', borderRadius: '6px', color: '#B42318', fontSize: '13px' }}>
          {errors.general}
        </div>
      )}
    </div>
  );
};

export default ReviewSubmit;
