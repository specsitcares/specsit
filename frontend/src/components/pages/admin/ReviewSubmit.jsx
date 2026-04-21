import React from 'react';
import { Check } from 'lucide-react';

/**
 * ReviewSubmit — Step 3 of the product creation flow
 * Matches Figma design exactly based on user screenshot
 */

const ReviewSubmit = ({ formData, categories, brands, confirmed, setConfirmed, errors }) => {
  // BUG 10 FIX — no hardcoded fake fallbacks; show 'Not specified' when data is missing
  const getCategoryName = (id) =>
    categories.find(c => c.id?.toString() === id?.toString())?.name || 'Not specified';
  const getBrandName = (id) =>
    brands.find(b => b.id?.toString() === id?.toString())?.name || 'Not specified';

  const sectionLabelStyle = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#344054',
    marginBottom: '8px'
  };

  const sectionDividerStyle = {
    border: 'none',
    borderTop: '1px solid #EAECF0',
    marginBottom: '24px'
  };

  const fieldLabelStyle = {
    fontSize: '12px',
    color: '#667085',
    marginBottom: '4px'
  };

  const fieldValueStyle = {
    fontSize: '14px',
    fontWeight: '500', // Matches clean semi-bold look in screenshot
    color: '#101828'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px 48px',
    marginBottom: '32px'
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '0 8px' }}>
      {/* ──── General Information ──── */}
      <div style={sectionLabelStyle}>General Information</div>
      <hr style={sectionDividerStyle} />
      
      <div style={gridStyle}>
        <div>
          <div style={fieldLabelStyle}>Product Title</div>
          <div style={fieldValueStyle}>{formData.title || <span style={{ color: '#9ca3af' }}>Not entered</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Manufacturer / Brand</div>
          <div style={fieldValueStyle}>{getBrandName(formData.brand)}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Category</div>
          <div style={fieldValueStyle}>{getCategoryName(formData.category)}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Short Description</div>
          <div style={fieldValueStyle}>{formData.short_description || <span style={{ color: '#9ca3af' }}>Not entered</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Meta Title</div>
          <div style={fieldValueStyle}>{formData.meta_title || <span style={{ color: '#9ca3af' }}>Not entered</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Meta Description</div>
          <div style={fieldValueStyle}>{formData.meta_description || <span style={{ color: '#9ca3af' }}>Not entered</span>}</div>
        </div>
      </div>

      {/* ──── Technical Specifications ──── */}
      <div style={sectionLabelStyle}>Technical Specifications</div>
      <hr style={sectionDividerStyle} />
      <div style={gridStyle}>
        <div>
          {/* BUG 11 FIX — use ₹ not $ */}
          <div style={fieldLabelStyle}>Base Price</div>
          <div style={fieldValueStyle}>
            {formData.base_price ? `₹${parseFloat(formData.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : <span style={{ color: '#9ca3af' }}>Not entered</span>}
          </div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Frame Width</div>
          <div style={fieldValueStyle}>{formData.frame_width || <span style={{ color: '#9ca3af' }}>Not specified</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Frame Type</div>
          <div style={fieldValueStyle}>{formData.frame_type || <span style={{ color: '#9ca3af' }}>Not specified</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Frame Shape</div>
          <div style={fieldValueStyle}>{formData.frame_shape || <span style={{ color: '#9ca3af' }}>Not specified</span>}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Gender Target</div>
          <div style={fieldValueStyle}>{formData.gender || 'Unisex'}</div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Frame Only Mode</div>
          <div style={fieldValueStyle}>{formData.frame_only_mode ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>

      {/* ──── Variants & Pricing ──── */}
      <div style={sectionLabelStyle}>Variants & Pricing</div>
      <hr style={sectionDividerStyle} />
      
      <div style={{
        border: '1px dashed #D6BBFB', // Lavendar dashed border to match product theme
        borderRadius: '8px',
        padding: '24px',
        background: '#FFFFFF',
        marginBottom: '32px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: '#F9FAFB' }}>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #EAECF0' }}>
              <th style={{ padding: '12px 8px', fontWeight: '600', color: '#475467', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>SKU</th>
              <th style={{ padding: '12px 8px', fontWeight: '600', color: '#475467', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Lens Color</th>
              <th style={{ padding: '12px 8px', fontWeight: '600', color: '#475467', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Frame Color</th>
              <th style={{ padding: '12px 8px', fontWeight: '600', color: '#475467', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Stock</th>
              <th style={{ padding: '12px 8px', fontWeight: '600', color: '#475467', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {/* BUG 10 & 11 FIX — real data only, ₹ currency */}
            {(formData.variants || []).length > 0 ? (
              formData.variants.map((v, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '12px 8px', fontWeight: '600', color: '#101828' }}>{v.sku || '—'}</td>
                  <td style={{ padding: '12px 8px', color: '#667085' }}>{v.colorName || '—'}</td>
                  <td style={{ padding: '12px 8px', color: '#667085' }}>{v.frameColor || v.colorName || '—'}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', color: '#101828' }}>{v.quantity ?? 0}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', color: '#101828' }}>
                    {`₹${(v.variantPrice && parseFloat(v.variantPrice) > 0
                      ? parseFloat(v.variantPrice)
                      : parseFloat(formData.base_price || 0)
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '12px 8px', color: '#9ca3af', textAlign: 'center' }}>
                  No variants added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ──── Submission Settings ──── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#101828', marginBottom: '8px' }}>Submission Settings</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
          <span style={{ color: '#667085' }}>Current Status:</span>
          <span style={{ 
            padding: '2px 8px', 
            background: '#ECFDF3', 
            borderRadius: '12px', 
            color: '#027A48', 
            fontSize: '11px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ width: '6px', height: '6px', background: '#027A48', borderRadius: '50%' }} />
            Ready to Publish
          </span>
        </div>
        
        <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
          <input 
            type="checkbox" 
            checked={confirmed} 
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: '3px' }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#344054' }}>I confirm all details are correct</div>
            <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>Checking this box confirms that you have reviewed the product information and it is ready to go live in the catalog.</div>
          </div>
        </label>
      </div>

      {/* Backend Errors Display */}
      {errors?.general && (
        <div style={{ 
          background: '#FEF3F2', 
          border: '1px solid #FECDCA', 
          padding: '12px', 
          borderRadius: '8px', 
          color: '#B42318', 
          fontSize: '13px',
          marginTop: '16px'
        }}>
          {errors.general}
        </div>
      )}
    </div>
  );
};

export default ReviewSubmit;
