import React from 'react';

const na = <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>;

const S = {
  section: { marginBottom: '22px' },
  heading: { fontSize: '10px', fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },
  divider: { border: 'none', borderTop: '1px solid #EAECF0', marginBottom: '14px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 40px' },
  label: { fontSize: '9px', color: '#667085', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  value: { fontSize: '11px', fontWeight: 500, color: '#101828' },
};

const Field = ({ label, value }) => (
  <div>
    <div style={S.label}>{label}</div>
    <div style={S.value}>{value || na}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={S.section}>
    <div style={S.heading}>{title}</div>
    <hr style={S.divider} />
    {children}
  </div>
);

const ReviewSubmit = ({
  formData, categories, brands,
  confirmed, setConfirmed, errors,
  useMetaTemplate, globalTemplates, resolveMetaTemplate,
}) => {
  const getCategoryName = (id) => categories.find(c => c.id?.toString() === id?.toString())?.name || '—';
  const getBrandName    = (id) => brands.find(b => b.id?.toString() === id?.toString())?.name || '—';

  const metaTitle = useMetaTemplate
    ? resolveMetaTemplate?.(globalTemplates?.meta_title_template || '')
    : formData.meta_title;

  const metaDescription = useMetaTemplate
    ? resolveMetaTemplate?.(globalTemplates?.meta_description_template || '')
    : formData.meta_description;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '0 8px' }}>

      {/* ── General Information ── */}
      <Section title="General Information">
        <div style={S.grid}>
          <Field label="Product Title"    value={formData.title} />
          <Field label="Category"         value={getCategoryName(formData.category)} />
          <Field label="Brand"            value={getBrandName(formData.brand)} />
          <Field label="Short Description" value={formData.short_description} />
        </div>
      </Section>

      {/* ── Meta Tags ── */}
      <Section title="Meta Tags (SEO)">
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
            background: useMetaTemplate ? '#F9F5FF' : '#F2F4F7',
            color: useMetaTemplate ? '#6941C6' : '#344054',
          }}>
            {useMetaTemplate ? 'Global template' : 'Custom'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <div>
            <div style={S.label}>Meta Title</div>
            <div style={{ ...S.value, fontSize: '10px' }}>{metaTitle || na}</div>
          </div>
          <div>
            <div style={S.label}>Meta Description</div>
            <div style={{ ...S.value, fontSize: '10px', lineHeight: 1.6 }}>{metaDescription || na}</div>
          </div>
        </div>
      </Section>

      {/* ── Technical Specifications ── */}
      <Section title="Technical Specifications">
        <div style={S.grid}>
          <Field label="Frame Type"   value={formData.frame_type} />
          <Field label="Frame Shape"  value={formData.frame_shape} />
          <Field label="Frame Width"  value={formData.frame_width} />
          <Field label="Gender"       value={formData.gender} />
          <Field label="Frame Only"   value={formData.frame_only_mode ? 'Enabled' : 'Disabled'} />
          <Field
            label="Cost Price"
            value={formData.cost_price
              ? `₹${parseFloat(formData.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : null}
          />
        </div>
      </Section>

      {/* ── Variants & Pricing ── */}
      <Section title="Variants & Pricing">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #EAECF0' }}>
              {['Color', 'Stock', 'MRP', 'Selling Price'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '9px', fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(formData.variants || []).length > 0 ? formData.variants.map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F2F4F7' }}>
                <td style={{ padding: '10px', color: '#101828', fontWeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: v.colorCode || '#D0D5DD',
                      border: '1px solid #E4E7EC', flexShrink: 0,
                    }} />
                    {v.colorName || na}
                  </div>
                </td>
                <td style={{ padding: '10px', color: '#344054' }}>{v.quantity ?? 0}</td>
                <td style={{ padding: '10px', color: '#101828', fontWeight: 500 }}>
                  {v.base_price ? `₹${parseFloat(v.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : na}
                </td>
                <td style={{ padding: '10px', color: '#16a34a', fontWeight: 500 }}>
                  {v.selling_price ? `₹${parseFloat(v.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : na}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} style={{ padding: '16px 12px', color: '#9CA3AF', textAlign: 'center' }}>
                  No variants added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* ── Confirm & Submit ── */}
      <div style={{ marginBottom: '19px' }}>
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: '3px', accentColor: '#7F56D9' }}
          />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#344054' }}>I confirm all details are correct</div>
            <div style={{ fontSize: '10px', color: '#667085', marginTop: '3px' }}>
              This will publish the product and all its variants to the live catalog.
            </div>
          </div>
        </label>
      </div>

      {errors?.general && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', padding: '12px 16px', borderRadius: '6px', color: '#B42318', fontSize: '10px' }}>
          {errors.general}
        </div>
      )}
    </div>
  );
};

export default ReviewSubmit;
