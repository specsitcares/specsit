import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Trash2, CheckCircle } from 'lucide-react';

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1200,
    background: 'rgba(16, 24, 40, 0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  },
  box: {
    background: '#fff', borderRadius: '12px',
    boxShadow: '0 20px 48px rgba(16,24,40,0.18), 0 8px 20px rgba(16,24,40,0.10)',
    border: '1px solid #EAECF0',
    width: '100%', maxWidth: '460px',
    height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 22px 16px',
    borderBottom: '1px solid #EAECF0',
    flexShrink: 0,
  },
  title: { fontSize: '14px', fontWeight: 700, color: '#101828', margin: 0, letterSpacing: '-0.07px' },
  closeBtn: {
    width: 32, height: 32, border: '1px solid #EAECF0', borderRadius: '8px',
    background: '#fff', cursor: 'pointer', color: '#667085',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.15s',
  },
  body: { padding: '20px 18px 20px 22px', overflowY: 'scroll', flex: 1, minHeight: 0, scrollbarGutter: 'stable' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
    padding: '14px 22px', borderTop: '1px solid #EAECF0',
    background: '#F9FAFB', flexShrink: 0,
  },
  label: { fontSize: '11px', fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', border: '1px solid #D0D5DD',
    borderRadius: '8px', fontSize: '12px', color: '#101828',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: '8px', border: 'none',
    background: '#68408D', color: '#fff',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: '8px',
    border: '1px solid #D0D5DD', background: '#fff', color: '#344054',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
  },
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: '8px',
    border: '1px solid #FECDCA', background: '#fff', color: '#B42318',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
  },
  btnDangerSolid: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: '8px', border: 'none',
    background: '#D92D20', color: '#fff',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
};

const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  mode = 'create',
  title = 'Item',
  fields = [],
  initialData = {},
  children,
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData && Object.keys(initialData).length > 0) {
        setFormData(initialData);
      } else {
        const empty = {};
        fields.forEach(f => {
          if (f.type === 'checkbox-group') {
            empty[f.name] = f.defaultValue !== undefined ? f.defaultValue : [];
          } else {
            empty[f.name] = f.defaultValue !== undefined ? f.defaultValue : '';
          }
        });
        setFormData(empty);
      }
      setErrors({});
      setSuccessMessage('');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, mode]);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: checked }));
    else if (type === 'file') setFormData(prev => ({ ...prev, [name]: files[0] }));
    else setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Toggle a value in/out of a checkbox-group array field
  const handleCheckboxGroupToggle = (fieldName, val, field) => {
    const numVal = Number(val);
    setFormData(prev => {
      const current = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const exists = current.includes(numVal);
      const newValue = exists ? current.filter(v => v !== numVal) : [...current, numVal];
      
      // Call onChange callback if provided (for dynamic filtering)
      if (field?.onChange) {
        field.onChange(newValue);
      }
      
      return { ...prev, [fieldName]: newValue };
    });
    if (errors[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');
    try {
      await onSubmit(formData);
      setSuccessMessage(`${title} ${mode === 'create' ? 'created' : 'updated'} successfully`);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      if (err.response?.data) setErrors(err.response.data);
      else setErrors({ general: err.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(initialData.id);
      setSuccessMessage(`${title} deleted successfully`);
      setTimeout(() => { setShowDeleteConfirm(false); onClose(); }, 1200);
    } catch (err) {
      setErrors({ general: err.message || 'Failed to delete' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const inputStyle = (hasError) => ({
    ...S.input,
    borderColor: hasError ? '#F04438' : '#D0D5DD',
  });

  const modalContent = (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={S.header}>
          <h2 style={S.title}>
            {showDeleteConfirm
              ? 'Confirm Deletion'
              : mode === 'create' ? `Create ${title}` : `Edit ${title}`}
          </h2>
          <button style={S.closeBtn} onClick={onClose} disabled={isSubmitting}>
            <X size={16} />
          </button>
        </div>

        {/* ── Flash messages ── */}
        {(successMessage || errors.general) && (
          <div style={{ padding: '12px 22px 0' }}>
            {successMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#ECFDF3', border: '1px solid #ABEFC6', color: '#027A48', fontSize: 11, fontWeight: 500 }}>
                <CheckCircle size={15} /> {successMessage}
              </div>
            )}
            {errors.general && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', fontSize: 11, fontWeight: 500 }}>
                <AlertCircle size={15} /> {errors.general}
              </div>
            )}
          </div>
        )}

        {/* ── Form body ── */}
        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="form-modal-body" style={{ ...S.body }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fields.map(field => {
                  if (field.readOnly && mode === 'create') return null;
                  const fieldError = errors[field.name];
                  const fieldValue = formData[field.name] !== undefined ? formData[field.name] : '';

                  return (
                    <div key={field.name}>
                      <label style={S.label} htmlFor={field.name}>
                        {field.label || field.name}
                        {field.required && <span style={{ color: '#F04438', marginLeft: 3 }}>*</span>}
                      </label>

                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.name} name={field.name}
                          value={fieldValue} onChange={handleInputChange}
                          placeholder={field.placeholder || ''}
                          disabled={isSubmitting || field.readOnly}
                          style={{ ...inputStyle(fieldError), minHeight: 80, resize: 'vertical' }}
                        />
                      ) : field.type === 'select' ? (
                        <div>
                        <select
                          id={field.name} name={field.name}
                          value={fieldValue}
                          onChange={(e) => {
                            handleInputChange(e);
                            if (field.onChange) field.onChange(e.target.value);
                          }}
                          disabled={isSubmitting || field.readOnly}
                          style={{
                            ...inputStyle(fieldError), appearance: 'none', cursor: 'pointer',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                            paddingRight: 32,
                          }}
                        >
                          <option value="">Select {field.label || field.name}</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {field.helpText && (
                          <div style={{ fontSize: 11, color: '#667085', marginTop: 6, fontStyle: 'italic' }}>
                            ℹ️ {field.helpText}
                          </div>
                        )}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                          <div
                            onClick={() => !field.readOnly && !isSubmitting && handleInputChange({ target: { name: field.name, type: 'checkbox', checked: !fieldValue } })}
                            style={{
                              width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                              background: fieldValue ? '#68408D' : '#D0D5DD',
                              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 3,
                              left: fieldValue ? 21 : 3,
                              width: 16, height: 16, borderRadius: '50%',
                              background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'left 0.2s',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#344054', cursor: 'pointer' }}
                            onClick={() => !field.readOnly && !isSubmitting && handleInputChange({ target: { name: field.name, type: 'checkbox', checked: !fieldValue } })}>
                            {field.placeholder || field.label}
                          </span>
                        </div>
                      ) : field.type === 'file' ? (
                        <div>
                          <input
                            type="file" id={field.name} name={field.name}
                            onChange={handleInputChange}
                            accept={field.accept || '*/*'}
                            disabled={isSubmitting || field.readOnly}
                            style={{ ...inputStyle(fieldError), padding: '7px 12px', cursor: 'pointer' }}
                          />
                          {mode === 'edit' && fieldValue && typeof fieldValue === 'string' && (
                            <div style={{ fontSize: 10, color: '#667085', marginTop: 4 }}>
                              Current: {fieldValue.split('/').pop()}
                            </div>
                          )}
                        </div>
                      ) : field.type === 'checkbox-group' ? (
                        <div>
                          <div style={{
                            border: '1px solid #D0D5DD', borderRadius: 8,
                            maxHeight: 200, overflowY: 'auto', padding: '8px 12px',
                            display: 'flex', flexDirection: 'column', gap: 8,
                          }}>
                            {(field.options || []).map(opt => {
                              const currentArr = Array.isArray(formData[field.name]) ? formData[field.name] : [];
                              const isChecked = currentArr.includes(Number(opt.value));
                              return (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#344054' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleCheckboxGroupToggle(field.name, opt.value, field)}
                                    disabled={isSubmitting || field.readOnly}
                                    style={{ accentColor: '#68408D', width: 14, height: 14, flexShrink: 0 }}
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                          {field.helpText && (
                            <div style={{ fontSize: 11, color: '#667085', marginTop: 8, fontStyle: 'italic' }}>
                              ℹ️ {field.helpText}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.type || 'text'}
                          id={field.name} name={field.name}
                          value={fieldValue} onChange={handleInputChange}
                          placeholder={field.placeholder || ''}
                          disabled={isSubmitting || field.readOnly}
                          step={field.step} min={field.min} max={field.max}
                          style={inputStyle(fieldError)}
                        />
                      )}

                      {fieldError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: '#B42318' }}>
                          <AlertCircle size={11} />
                          {Array.isArray(fieldError) ? fieldError[0] : fieldError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {children}
            </div>

            {/* ── Footer ── */}
            <div style={S.footer}>
              {mode === 'edit' && onDelete && (
                <button
                  type="button"
                  style={{ ...S.btnDanger, marginRight: 'auto' }}
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button type="button" style={{ ...S.btnOutline, opacity: isSubmitting ? 0.5 : 1 }} onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" style={{ ...S.btnPrimary, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : mode === 'create' ? `Create ${title}` : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          /* ── Delete confirm ── */
          <div>
            <div style={{ ...S.body, textAlign: 'center', padding: '32px 22px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF3F2', color: '#D92D20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={26} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Delete {title}?</h3>
              <p style={{ fontSize: 12, color: '#667085', maxWidth: 260, margin: '0 auto 24px', lineHeight: 1.6 }}>
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div style={{ ...S.footer, justifyContent: 'center' }}>
              <button style={{ ...S.btnOutline, minWidth: 88, opacity: isSubmitting ? 0.5 : 1 }} onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button style={{ ...S.btnDangerSolid, minWidth: 88, opacity: isSubmitting ? 0.7 : 1 }} onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FormModal;
