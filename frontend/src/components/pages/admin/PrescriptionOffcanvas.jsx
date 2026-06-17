import React, { useState, useEffect } from 'react';
import { X, User, Phone, FileText, Check, Flag, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const fmt = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '—');

// Helper to safely convert status_label (string or object) to string
const getStatusString = (status) => {
  if (typeof status === 'string') return status;
  if (status?.label && typeof status.label === 'string') return status.label;
  return 'Pending Review';
};

const PrescriptionOffcanvas = ({ order, onClose, onApproved }) => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl]       = useState(null);
  const [showReject, setShowReject]       = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectError, setRejectError]     = useState('');
  const [rejectMode, setRejectMode]       = useState('Rejected'); // 'Rejected' or 'Reupload Requested'

  useEffect(() => {
    if (!order) return;
    setLoading(true);
    setPrescriptions([]);
    setCurrentIndex(0);
    setPdfBlobUrl(null);
    apiClient.get('/catalog/prescriptions/', { params: { order_id: order.id, page_size: 100 } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
        // Double check filtering if API doesn't support order_id param yet
        const filtered = list.filter(p => String(p.order_id) === String(order.id));
        setPrescriptions(filtered);
      })
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, [order?.id]);

  const rx = prescriptions[currentIndex] || null;

  // Fetch PDF as blob to bypass X-Frame-Options
  useEffect(() => {
    if (!rx?.prescription_file) return;
    const rel = rx.prescription_file.replace(/^https?:\/\/[^/]+/, '');
    if (!/\.pdf$/i.test(rel.split('?')[0])) return;
    let cancelled = false;
    fetch(rel, { credentials: 'same-origin' })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => { if (!cancelled) setPdfBlobUrl(URL.createObjectURL(blob)); })
      .catch(() => {});
    return () => {
      cancelled = true;
      setPdfBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [rx?.prescription_file]);

  const handleApprove = async () => {
    if (!rx) return;
    setSaving(true);
    try {
      await apiClient.patch(`/catalog/prescriptions/${rx.id}/review/`, { status: 'Approved' });
      onApproved(order.id);
    } catch {
      setSaving(false);
    }
  };

  const handleFlagIssue = () => {
    onClose();
    navigate('/admin/prescriptions', { state: { selectOrderId: order.id } });
  };

  const handleReject = async () => {
    setSaving(true);
    setRejectError('');
    try {
      await apiClient.patch(`/catalog/prescriptions/${rx.id}/review/`, { 
        status: rejectMode, 
        notes: rejectReason 
      });
      // Refresh only current RX or all? Let's refresh all to be safe
      const res = await apiClient.get('/catalog/prescriptions/', { params: { order_id: order.id, page_size: 100 } });
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPrescriptions(list.filter(p => p.order_id === order.id));
      setShowReject(false);
      setSaving(false);
    } catch {
      setRejectError('Failed to update. Try again.');
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!rx?.prescription_file) return;
    const url = rx.prescription_file.replace(/^https?:\/\/[^/]+/, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'prescription';
    a.click();
  };

  const orderId = order ? `#LO-${String(order.id).padStart(7, '0')}` : '';
  const customerName = order?.customer_name || 'Customer';
  const customerPhone = order?.customer_phone || order?.items?.[0]?.customer_phone || '';

  const hasFile = !!rx?.prescription_file;
  const fileUrl = hasFile ? rx.prescription_file.replace(/^https?:\/\/[^/]+/, '') : '';
  const isImage = hasFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl.split('?')[0]);
  const isPdf   = hasFile && /\.pdf$/i.test(fileUrl.split('?')[0]);
  const fileName = hasFile ? (fileUrl.split('/').pop() || 'Prescription File') : null;

  const rows = rx ? [
    { eye: 'OD', sub: '(Right)', sph: rx.od_sphere, cyl: rx.od_cylinder, axis: rx.od_axis, add: rx.od_add },
    { eye: 'OS', sub: '(Left)',  sph: rx.os_sphere, cyl: rx.os_cylinder, axis: rx.os_axis, add: rx.os_add },
  ] : [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.18)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 460, maxWidth: '100vw',
        zIndex: 1001,
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #e0e0e0',
        boxShadow: '-9px 0 20px rgba(36,36,36,0.04), -36px 0 36px rgba(36,36,36,0.03)',
      }}>

        {/* Header */}
        <div style={{ background: '#f3f3f3', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
              Prescription Review
            </div>
            {prescriptions.length > 1 ? (
              <div style={{ marginTop: 8 }}>
                <select 
                  value={currentIndex}
                  onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: 6,
                    border: '1px solid #d2d2d2', fontSize: 13, background: '#fff'
                  }}
                >
                  {prescriptions.map((p, i) => (
                    <option key={p.id} value={i}>
                      Prescription {i + 1}: {p.patient_name || 'Patient'} ({getStatusString(p.status_label) || 'Pending'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: '#4b5563', marginTop: 2 }}>{orderId}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              <User size={13} color="#64748b" />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{customerName}</span>
              {customerPhone && (
                <>
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>·</span>
                  <Phone size={13} color="#64748b" />
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{customerPhone}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.5, padding: 4, borderRadius: 6, flexShrink: 0, display: 'flex' }}
          >
            <X size={18} color="#111827" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
              Loading prescription…
            </div>
          ) : !rx ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8' }}>
              <FileText size={40} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 14 }}>No prescription found for this order</span>
            </div>
          ) : (
            <>
              {/* Document section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#020617' }}>Document</span>
                  {hasFile && (
                    <span style={{ background: '#f9f5ff', border: '1px solid #68408d', borderRadius: 6, padding: '1px 8px', fontSize: 13, color: '#040205', fontWeight: 500 }}>
                      1
                    </span>
                  )}
                </div>

                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  minHeight: hasFile ? 280 : 120,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', padding: hasFile ? 0 : 24,
                }}>
                  {hasFile ? (
                    isImage ? (
                      <img src={fileUrl} alt="Prescription" style={{ width: '100%', maxHeight: 340, objectFit: 'contain' }} />
                    ) : isPdf ? (
                      pdfBlobUrl ? (
                        <iframe src={pdfBlobUrl} title="Prescription PDF" style={{ width: '100%', height: 340, border: 'none' }} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 32 }}>
                          <FileText size={40} color="#94a3b8" />
                          <span style={{ fontSize: 13, color: '#64748b' }}>{fileName}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Scanned document preview</span>
                        </div>
                      )
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <FileText size={40} color="#94a3b8" />
                        <span style={{ fontSize: 13, color: '#64748b' }}>{fileName}</span>
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.4 }}>
                      <FileText size={40} color="#0f172a" />
                      <span style={{ fontSize: 13, color: '#64748b' }}>No document uploaded</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Customer entered prescription manually</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription data table */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#020617' }}>Prescription Data</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 17px', borderBottom: '1px solid #e2e8f0', background: 'rgba(241,245,249,0.5)' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                      {hasFile ? 'Uploaded Prescription' : 'Manually Entered Values'}
                    </span>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                      background: getStatusString(rx.status_label) === 'Approved' ? '#dcfce7' : getStatusString(rx.status_label) === 'Rejected' ? '#fee2e2' : '#fef9c3',
                      color: getStatusString(rx.status_label) === 'Approved' ? '#166534' : getStatusString(rx.status_label) === 'Rejected' ? '#991b1b' : '#854d0e',
                      textTransform: 'uppercase'
                    }}>
                      {getStatusString(rx.status_label)}
                    </span>
                  </div>

                  {/* Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD'].map(h => (
                          <th key={h} style={{ padding: '12px 12px 13px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 500, color: '#64748b', textAlign: 'left' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.eye}>
                          <td style={{ padding: '14px 12px 15px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 500, fontSize: 14, color: '#000' }}>{row.eye}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{row.sub}</div>
                          </td>
                          {[row.sph, row.cyl, row.axis, row.add].map((val, i) => (
                            <td key={i} style={{ padding: '13px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 14, color: '#0f172a' }}>
                              {fmt(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer metadata */}
                  <div style={{ background: 'rgba(241,245,249,0.2)', padding: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>PD (Pupillary Distance)</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
                        {rx.pd_distance ? `${rx.pd_distance} mm` : '—'}
                      </span>
                    </div>
                    {rx.vision_type && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Vision Type</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{rx.vision_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning alert */}
              <div style={{ background: '#fff5db', border: '1px solid #f4c95c', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 14, color: '#835e00', lineHeight: '22px', margin: 0 }}>
                  This will put the order on hold until the customer provides a new document. The current document will be archived.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Reject inline form */}
        {rx && showReject && (
          <div style={{ borderTop: '1px solid #e0e0e0', padding: '16px 20px', background: '#fff8f8', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Reason for {rejectMode}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setRejectMode('Rejected')}
                  style={{ fontSize: 11, background: rejectMode === 'Rejected' ? '#ef4444' : '#fff', color: rejectMode === 'Rejected' ? '#fff' : '#ef4444', border: '1px solid #ef4444', padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                >Reject</button>
                <button 
                  onClick={() => setRejectMode('Reupload Requested')}
                  style={{ fontSize: 11, background: rejectMode === 'Reupload Requested' ? '#f59e0b' : '#fff', color: rejectMode === 'Reupload Requested' ? '#fff' : '#f59e0b', border: '1px solid #f59e0b', padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                >Reupload</button>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={e => { setRejectReason(e.target.value); setRejectError(''); }}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: `1px solid ${rejectError ? '#fca5a5' : '#d2d2d2'}`, borderRadius: 6,
                fontSize: 13, color: '#0f172a', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
            {rejectError && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{rejectError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => { setShowReject(false); setRejectReason(''); setRejectError(''); }}
                style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#0f172a' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: rejectMode === 'Rejected' ? '#ef4444' : '#f59e0b', color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Processing…' : 'Confirm Action'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {rx && (
          <div style={{ borderTop: '1px solid #e0e0e0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
            {/* Approve */}
            <button
              onClick={handleApprove}
              disabled={saving || ['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6, border: 'none',
                background: (saving || ['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))) ? '#cbd5e1' : '#68408d',
                color: '#fefcff', fontSize: 16, fontWeight: 400, cursor: (saving || ['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Check size={20} strokeWidth={2} />
              {saving ? 'Approving…' : getStatusString(rx.status_label) === 'Approved' ? 'Already Approved' : 'Approve & continue'}
            </button>

            {/* Flag + Download + Reject */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleFlagIssue}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 6,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: '#0f172a', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Flag size={16} strokeWidth={2} />
                Flag Issue
              </button>
              <button
                onClick={handleDownload}
                disabled={!hasFile}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 6,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: '#0f172a', fontSize: 14, cursor: hasFile ? 'pointer' : 'not-allowed',
                  opacity: hasFile ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Download size={16} strokeWidth={2} />
                Download
              </button>
              <button
                onClick={() => setShowReject(r => !r)}
                disabled={['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 6,
                  border: '1px solid #fca5a5', background: (['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))) ? '#f1f5f9' : '#fff',
                  color: (['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))) ? '#94a3b8' : '#ef4444', fontSize: 14, cursor: (['Approved', 'Rejected', 'Reupload Requested'].includes(getStatusString(rx.status_label))) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {getStatusString(rx.status_label) === 'Reupload Requested' ? 'Requested' : 'Reject / Issue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PrescriptionOffcanvas;
