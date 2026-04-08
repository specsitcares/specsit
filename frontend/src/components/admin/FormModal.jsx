import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Trash2, CheckCircle, Info } from 'lucide-react';
import '../../styles/admin.css';

/**
 * Reusable FormModal Component — Figma Design System
 * Handles Create/Edit/Delete operations for all admin tables
 */
const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  mode = 'create',
  title = 'Item',
  fields = [],
  initialData = {},
  loading = false,
  children,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData && Object.keys(initialData).length > 0) {
        setFormData(initialData);
      } else {
        const emptyData = {};
        fields.forEach(field => {
          emptyData[field.name] = field.defaultValue !== undefined ? field.defaultValue : '';
        });
        setFormData(emptyData);
      }
      setErrors({});
      setSuccessMessage('');
      setShowDeleteConfirm(false);
    }
    // Only re-run when these core state-triggering props change
  }, [isOpen, mode]); 

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await onSubmit(formData);
      setSuccessMessage(`${title} ${mode === 'create' ? 'created' : 'updated'} successfully`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      if (err.response?.data) {
        setErrors(err.response.data);
      } else {
        setErrors({ general: err.message || 'An error occurred during save' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(initialData.id);
      setSuccessMessage(`${title} deleted successfully`);
      setTimeout(() => {
        setShowDeleteConfirm(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrors({ general: err.message || 'Failed to delete item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="form-modal-overlay" onClick={onClose}>
      <div className="form-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="form-modal-header">
          <h2 className="form-modal-title">
            {showDeleteConfirm ? 'Confirm Deletion' : (mode === 'create' ? `Create New ${title}` : `Edit ${title}`)}
          </h2>
          <button className="form-modal-close" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        {/* Global Messages */}
        {(successMessage || errors.general) && (
          <div style={{ padding: '16px 24px 0' }}>
            {successMessage && (
              <div className="badge badge-success" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', justifyContent: 'flex-start' }}>
                <CheckCircle size={16} />
                <span>{successMessage}</span>
              </div>
            )}
            {errors.general && (
              <div className="badge badge-error" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', justifyContent: 'flex-start' }}>
                <AlertCircle size={16} />
                <span>{errors.general}</span>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit}>
            <div className="form-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {fields.map(field => {
                  if (field.readOnly && mode === 'create') return null;
                  
                  const fieldError = errors[field.name];
                  const fieldValue = formData[field.name] !== undefined ? formData[field.name] : '';

                  return (
                    <div key={field.name} className="form-group">
                      <label className="form-label" htmlFor={field.name}>
                        {field.label || field.name}
                        {field.required && <span style={{ color: 'var(--error-500)', marginLeft: '3px' }}>*</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.name}
                          name={field.name}
                          className="form-input"
                          style={{ minHeight: '80px', resize: 'vertical' }}
                          value={fieldValue}
                          onChange={handleInputChange}
                          placeholder={field.placeholder || ''}
                          disabled={isSubmitting || field.readOnly}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={field.name}
                          name={field.name}
                          className="form-input form-select"
                          value={fieldValue}
                          onChange={handleInputChange}
                          disabled={isSubmitting || field.readOnly}
                        >
                          <option value="">Select {field.label || field.name}</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          <input
                            type="checkbox"
                            id={field.name}
                            name={field.name}
                            checked={!!fieldValue}
                            onChange={handleInputChange}
                            disabled={isSubmitting || field.readOnly}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span className="form-label" style={{ fontWeight: 400, cursor: 'pointer' }} onClick={() => !field.readOnly && handleInputChange({ target: { name: field.name, type: 'checkbox', checked: !fieldValue } })}>
                            {field.placeholder || 'Enable this feature'}
                          </span>
                        </div>
                      ) : field.type === 'file' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="file"
                            id={field.name}
                            name={field.name}
                            className="form-input"
                            onChange={handleInputChange}
                            accept={field.accept || '*/*'}
                            disabled={isSubmitting || field.readOnly}
                          />
                          {mode === 'edit' && fieldValue && typeof fieldValue === 'string' && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              Current file: {fieldValue.split('/').pop()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          id={field.name}
                          name={field.name}
                          className="form-input"
                          value={fieldValue}
                          onChange={handleInputChange}
                          placeholder={field.placeholder || ''}
                          disabled={isSubmitting || field.readOnly}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                        />
                      )}

                      {fieldError && (
                        <span style={{ fontSize: '12px', color: 'var(--error-700)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <AlertCircle size={12} /> {Array.isArray(fieldError) ? fieldError[0] : fieldError}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {children}
            </div>

            <div className="form-modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              
              {mode === 'edit' && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ marginRight: 'auto' }}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (mode === 'create' ? `Create ${title}` : `Save Changes`)}
              </button>
            </div>
          </form>
        ) : (
          /* Delete Confirmation State */
          <div className="form-modal-body">
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--error-50)', 
                color: 'var(--error-500)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                Are you sure?
              </h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', maxWidth: '300px', margin: '0 auto 24px' }}>
                You are about to delete this {title.toLowerCase()}. This action is permanent and cannot be undone.
              </p>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-outline" style={{ minWidth: '100px' }} onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button className="btn btn-danger" style={{ minWidth: '100px', background: 'var(--error-700)', color: 'white' }} onClick={handleDelete} disabled={isSubmitting}>
                  {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FormModal;
