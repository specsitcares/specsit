import React, { useState } from 'react';
import { 
  Check, 
  Info, 
  Eye, 
  ChevronRight, 
  FileText, 
  Tag, 
  Layers, 
  Package, 
  DollarSign, 
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import '../../styles/product_form.css';

/**
 * ReviewSubmit — Step 3: Review & Submit
 * A high-fidelity summary screen matching the Figma "strictly same" design standard.
 */

const ReviewField = ({ label, value, icon: Icon, bold = false }) => (
  <div className="review-field-v2">
    <div className="review-field-label">
      {Icon && <Icon size={14} className="field-icon" />}
      <span>{label}</span>
    </div>
    <div className={`review-field-value ${bold ? 'is-bold' : ''}`}>
      {value || <span className="value-none">N/A</span>}
    </div>
  </div>
);

const ReviewSubmit = ({ formData, categories = [], brands = [], confirmed, setConfirmed }) => {
  
  const categoryName = categories.find(c => c.id === parseInt(formData.category))?.name || 'Sunglasses';
  const brandName = brands.find(b => b.id === parseInt(formData.brand))?.name || 'Ray-Ban';

  return (
    <div className="review-step-v2">
      <div className="review-scroll-area">
        {/* Section 1: General Information */}
        <div className="review-card-v2">
          <div className="review-card-header">
            <div className="header-icon"><FileText size={18} /></div>
            <h4>General Information</h4>
          </div>
          <div className="review-card-grid">
            <ReviewField label="Product Name" value={formData.title} bold />
            <ReviewField label="Category" value={categoryName} />
            <ReviewField label="Brand / Manufacturer" value={brandName} />
            <ReviewField label="Short Description" value={formData.short_description} />
            <ReviewField label="Meta Title" value={formData.meta_title} />
            <ReviewField label="Meta Description" value={formData.meta_description} />
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="review-card-v2">
          <div className="review-card-header">
            <div className="header-icon"><Layers size={18} /></div>
            <h4>Technical Specifications</h4>
          </div>
          <div className="review-card-grid">
            <ReviewField label="Base Price" value={`₹ ${formData.base_price}`} bold />
            <ReviewField label="Frame Width" value={formData.frame_width} />
            <ReviewField label="Frame Type" value={formData.frame_type} />
            <ReviewField label="Frame Shape" value={formData.frame_shape} />
            <ReviewField label="Gender Target" value={formData.gender} />
            <ReviewField label="Frame Only Mode" value={formData.frame_only_mode ? 'Enabled' : 'Disabled'} />
          </div>
        </div>

        {/* Section 3: Variants Summary */}
        <div className="review-card-v2">
          <div className="review-card-header">
            <div className="header-icon"><Package size={18} /></div>
            <h4>Variants & Listings</h4>
          </div>
          <div className="review-table-container">
            <table className="review-data-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Specs</th>
                  <th>Stock</th>
                  <th>Price Adjust</th>
                  <th>Tax & Discount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.variants?.map((v, i) => (
                  <tr key={i}>
                    <td className="v-identity">
                      <div className="v-color-box">
                         {v.colorMethod === 'code' ? (
                           <div className="v-swatch" style={{ backgroundColor: v.colorCode }} />
                         ) : (
                           <div className="v-swatch is-img"><Tag size={10} /></div>
                         )}
                         <div className="v-name">
                           <strong>{v.colorName || 'Variant '+ (i+1)}</strong>
                           <span>{v.colorCode || 'Palette'}</span>
                         </div>
                      </div>
                    </td>
                    <td className="v-specs">
                      <span>{v.frameMaterial}</span>
                      <small>{v.frameSize} | {v.frameWeight}</small>
                    </td>
                    <td><span className="qty-tag">{v.quantity} in stock</span></td>
                    <td>{v.variantPrice ? `₹ ${v.variantPrice}` : '--'}</td>
                    <td>
                      <div className="v-marketing">
                         {v.taxPercent > 0 && <span className="m-tag m-tax">Tax: {v.taxPercent}%</span>}
                         {v.discountPercent > 0 && <span className="m-tag m-disc">Disc: {v.discountPercent}%</span>}
                         {v.isBogo && <span className="m-tag m-bogo">BOGO</span>}
                      </div>
                    </td>
                    <td>
                      <button className="v-preview-btn"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Submission Settings */}
        <div className="submission-settings-v2">
          <div className="ss-top">
            <div className="ss-title">
              <ShieldCheck size={20} />
              <h4>Submission Settings</h4>
            </div>
            <div className="ss-status-badge">
               <span className="dot"></span>
               <span>Ready to Publish</span>
            </div>
          </div>
          
          <div className="ss-alert">
             <AlertCircle size={16} />
             <p>Once published, the product will be live in the store catalog. You can still edit it later from the product table.</p>
          </div>

          <div className={`ss-confirm-box ${confirmed ? 'is-confirmed' : ''}`} onClick={() => setConfirmed(!confirmed)}>
            <div className={`ss-checkbox ${confirmed ? 'checked' : ''}`}>
              {confirmed && <Check size={14} strokeWidth={3} />}
            </div>
            <div className="ss-text-content">
              <h5>I confirm all details are correct</h5>
              <p>Checking this box confirms that you have reviewed the product information and it is ready to go live in the catalog.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .review-step-v2 {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .review-scroll-area {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .review-card-v2 {
          background: #FFFFFF;
          border: 1px solid #EAECF0;
          border-radius: 12px;
          overflow: hidden;
        }
        .review-card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #EAECF0;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F9FAFB;
        }
        .review-card-header h4 { font-size: 15px; font-weight: 700; color: #101828; margin: 0; }
        .header-icon { color: #6366F1; display: flex; align-items: center; }

        .review-card-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          padding: 20px;
          gap: 20px;
        }
        .review-field-v2 {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .review-field-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #475467;
        }
        .review-field-label .field-icon { opacity: 0.5; }
        .review-field-value {
          font-size: 14px;
          color: #101828;
          word-break: break-all;
        }
        .review-field-value.is-bold { font-weight: 600; }
        .value-none { color: #98A2B3; font-style: italic; }

        .review-table-container { padding: 0; }
        .review-data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .review-data-table th { background: #F9FAFB; padding: 12px 20px; font-size: 12px; font-weight: 600; color: #475467; border-bottom: 1px solid #EAECF0; }
        .review-data-table td { padding: 16px 20px; border-bottom: 1px solid #F2F4F7; vertical-align: top; }
        
        .v-identity { display: flex; align-items: center; gap: 12px; }
        .v-swatch { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #EAECF0; }
        .v-swatch.is-img { display: flex; align-items: center; justify-content: center; background: #F2F4F7; }
        .v-name { display: flex; flex-direction: column; }
        .v-name strong { font-size: 14px; color: #101828; }
        .v-name span { font-size: 12px; color: #667085; }

        .v-specs { display: flex; flex-direction: column; }
        .v-specs span { font-size: 13px; color: #344054; }
        .v-specs small { font-size: 11px; color: #667085; }

        .qty-tag { background: #F9FAFB; border: 1px solid #EAECF0; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #344054; }

        .v-marketing { display: flex; flex-wrap: wrap; gap: 4px; }
        .m-tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
        .m-tax { background: #F2F4F7; color: #475467; }
        .m-disc { background: #ECFDF3; color: #039855; }
        .m-bogo { background: #EEF4FF; color: #3538CD; }

        .v-preview-btn { background: none; border: 1px solid #D0D5DD; padding: 6px; border-radius: 6px; cursor: pointer; color: #667085; transition: all 0.2s; }
        .v-preview-btn:hover { background: #F9FAFB; border-color: #98A2B3; color: #101828; }

        .submission-settings-v2 {
          background: #FFFFFF;
          border: 1px solid #EAECF0;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ss-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .ss-title { display: flex; align-items: center; gap: 10px; color: #6366F1; }
        .ss-title h4 { margin: 0; font-size: 16px; font-weight: 700; color: #101828; }
        
        .ss-status-badge { display: flex; align-items: center; gap: 8px; background: #ECFDF3; border: 1px solid #ABEFC6; padding: 4px 10px; border-radius: 50px; }
        .ss-status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #12B76A; }
        .ss-status-badge span { font-size: 12px; font-weight: 600; color: #067647; }

        .ss-alert { background: #FEF6EE; border: 1px solid #F9DBAF; padding: 12px 16px; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px; }
        .ss-alert p { margin: 0; font-size: 13px; color: #B93815; line-height: 1.5; }
        .ss-alert svg { color: #B93815; flex-shrink: 0; margin-top: 2px; }

        .ss-confirm-box {
          border: 1px solid #EAECF0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ss-confirm-box:hover { border-color: #6366F1; background: #F5F6FF; }
        .ss-confirm-box.is-confirmed { border-color: #6366F1; background: #F5F6FF; box-shadow: 0 0 0 4px #F5F6FF; }

        .ss-checkbox {
          width: 20px; height: 20px; border-radius: 4px; border: 1px solid #D0D5DD; background: #FFF;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 2px;
          transition: all 0.2s;
        }
        .ss-checkbox.checked { background: #6366F1; border-color: #6366F1; color: #FFF; }
        
        .ss-text-content h5 { margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #101828; }
        .ss-text-content p { margin: 0; font-size: 13px; color: #475467; line-height: 1.5; }
      `}</style>
    </div>
  );
};

export default ReviewSubmit;
