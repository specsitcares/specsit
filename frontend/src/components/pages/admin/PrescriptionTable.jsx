import React, { useState, useEffect } from 'react';
import { Search, FileText, RefreshCw, ChevronDown, ZoomIn, ZoomOut, Eye, X } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';

/* ─── helpers ──────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const serverTime = new Date(dateStr);
  if (isNaN(serverTime.getTime())) return '—';
  const now = new Date();
  const diff = now.getTime() - serverTime.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m || 1}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmt = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '—');

const statusColor = (label = '') => {
  const l = label.toLowerCase();
  if (l === 'approved') return '#10b981';
  if (l === 'rejected') return '#ef4444';
  if (l.includes('reupload')) return '#f59e0b';
  return '#f59e0b'; // pending default
};

const statusBadge = (label = 'Pending') => {
  const l = label.toLowerCase();
  if (l === 'approved')
    return { bg: '#dcfce7', color: '#166534' };
  if (l === 'rejected')
    return { bg: '#fee2e2', color: '#991b1b' };
  if (l.includes('reupload'))
    return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#fef3c7', color: '#92400e' };
};

/* ─── Filter pills ─────────────────────────────────────── */
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'old', label: 'Older than 24h' },
  { key: 'reupload', label: 'Reupload requested' },
];

const applyTab = (list, tab) => {
  if (tab === 'all') return list;
  const now = Date.now();
  if (tab === 'today')
    return list.filter(r => now - new Date(r.created_at).getTime() < 86400000);
  if (tab === 'old')
    return list.filter(r => now - new Date(r.created_at).getTime() >= 86400000);
  if (tab === 'reupload')
    return list.filter(r => r.status_label?.toLowerCase().includes('reupload'));
  return list;
};

/* ─── Prescription Card ────────────────────────────────── */
const RxCard = ({ rx, selected, onClick }) => {
  const badge = statusBadge(rx.status_label);
  const barColor = statusColor(rx.status_label);

  return (
    <div
      onClick={() => onClick(rx)}
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid #e2e8f0',
        cursor: 'pointer',
        background: selected ? '#f3f0ff' : '#fff',
        transition: 'background 0.12s',
      }}
    >
      {/* left color strip */}
      <div style={{ width: 4, flexShrink: 0, borderRadius: 9999, background: barColor, alignSelf: 'stretch', minHeight: 42 }} />

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: rx.order_display_id ? '#0f172a' : '#ef4444' }}>
            {rx.order_display_id || `#RX-${String(rx.id).padStart(5, '0')} (orphaned)`}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{timeAgo(rx.created_at)}</span>
        </div>

        <div style={{ fontSize: 14, color: '#68408d', fontWeight: 500, marginBottom: 3 }}>
          {rx.user_name || 'Unknown'}
        </div>

        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rx.vision_type || 'Vision type not set'}
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 8px', borderRadius: 9999,
          background: badge.bg, color: badge.color,
          fontSize: 12, fontWeight: 500,
        }}>
          {rx.status_label || 'Pending'}
        </div>
      </div>
    </div>
  );
};

/* ─── Reupload Drawer ──────────────────────────────────── */
const REUPLOAD_REASONS = [
  'Image blurry or illegible',
  'Prescription expired',
  'Missing information',
  'Incorrect format',
  'Incomplete prescription',
  'Other',
];

const messageTemplate = (reason, customerName) => {
  const name = customerName || 'there';
  const templates = {
    'Image blurry or illegible':
      `Hi ${name}, we received your prescription but unfortunately the image is too blurry for us to verify the values safely. Could you please re-upload a clearer photo?`,
    'Prescription expired':
      `Hi ${name}, the prescription you uploaded appears to have expired. Please upload a valid prescription issued within the last 2 years.`,
    'Missing information':
      `Hi ${name}, the prescription you uploaded is missing some required information. Please upload a complete prescription with all eye power details visible.`,
    'Incorrect format':
      `Hi ${name}, the file you uploaded isn't in a supported format. Please re-upload as a clear photo (JPG/PNG) or PDF.`,
    'Incomplete prescription':
      `Hi ${name}, the prescription you uploaded appears incomplete. Please ensure both eyes (OD and OS) are clearly visible in the document.`,
    'Other':
      `Hi ${name}, we need you to re-upload your prescription document. Please contact us if you have any questions.`,
  };
  return templates[reason] || templates['Other'];
};

const ReuploadDrawer = ({ rx, onClose, onSend }) => {
  const [reason, setReason]   = useState(REUPLOAD_REASONS[0]);
  const [message, setMessage] = useState(() => messageTemplate(REUPLOAD_REASONS[0], rx.user_name));
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  const handleReasonChange = (r) => {
    setReason(r);
    setMessage(messageTemplate(r, rx.user_name));
  };

  const handleSend = async () => {
    if (!message.trim()) { setError('Message to customer is required.'); return; }
    const templateMessage = messageTemplate(reason, rx.user_name);
    if (message === templateMessage) {
      setError('Please customize the message before sending.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onSend(reason, message);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send request.');
    } finally {
      setSending(false);
    }
  };

  return (
    /* backdrop */
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.18)' }}
    >
      {/* panel — stops click propagation so it doesn't close itself */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 480, maxWidth: '100vw',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-9px 0 20px rgba(36,36,36,0.04), -36px 0 36px rgba(36,36,36,0.03), -80px 0 48px rgba(36,36,36,0.02)',
          borderLeft: '1px solid #e0e0e0',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px', background: '#f3f3f3', flexShrink: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              Request Reupload
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.5, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={18} color="#111827" />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Reason field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 14, color: '#020617' }}>Reason for request</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#c02828' }}>*</span>
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={reason}
                  onChange={e => handleReasonChange(e.target.value)}
                  style={{
                    width: '100%', appearance: 'none', padding: '14px 40px 14px 12px',
                    border: '1px solid #d2d2d2', borderRadius: 6,
                    fontSize: 16, color: '#020617', background: '#fff',
                    cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                  }}
                >
                  {REUPLOAD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#020617' }} />
              </div>
            </div>

            {/* Message field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 14, color: '#020617' }}>Message to customer</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#c02828' }}>*</span>
              </div>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px', minHeight: 80,
                    border: '1px solid #d2d2d2', borderRadius: 6,
                    fontSize: 14, color: '#020617', lineHeight: '17px',
                    resize: 'vertical', outline: 'none',
                    background: '#fff', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Warning alert */}
          <div style={{ background: '#fff5db', border: '1px solid #f4c95c', borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 14, color: '#835e00', lineHeight: '22px', margin: 0 }}>
              This will put the order on hold until the customer provides a new document. The current document will be archived.
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #e0e0e0', padding: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              minWidth: 80, padding: '8px 12px', borderRadius: 6,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#0f172a', fontSize: 16, cursor: 'pointer',
              opacity: sending ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              minWidth: 80, padding: '8px 12px', borderRadius: 6,
              border: 'none', background: sending ? '#9a6bbf' : '#68408d',
              color: '#fefcff', fontSize: 16,
              cursor: sending ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Send to customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Notes + Action buttons (shared by both paths) ───── */
const NotesAndActions = ({ notes, setNotes, submit, saving, error, success, onReuploadClick }) => (
  <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', lineHeight: '20px' }}>
        Internal Notes
      </label>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, minHeight: 64 }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes for team (not visible to customer)..."
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '13px',
            border: 'none', borderRadius: 10, fontSize: 14,
            color: '#0f172a', resize: 'vertical', outline: 'none',
            background: 'transparent', fontFamily: 'inherit',
          }}
        />
      </div>
    </div>

    {error && (
      <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#991b1b' }}>
        {error}
      </div>
    )}
    {success && (
      <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#166534' }}>
        {success}
      </div>
    )}

    <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 8 }}>
      <button
        onClick={() => submit('Approved')}
        disabled={saving}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 6, border: 'none',
          background: saving ? '#6ee7b7' : '#10b981', color: '#fff',
          fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        Approve &amp; accept order
      </button>
      <button
        onClick={onReuploadClick}
        disabled={saving}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 6,
          border: '1px solid #d1d5db', background: '#fff',
          color: '#0f172a', fontSize: 14, fontWeight: 500,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        Request reupload
      </button>
      <button
        onClick={() => submit('Rejected')}
        disabled={saving}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 6,
          border: 'none', background: 'transparent',
          color: '#ef4444', fontSize: 14, fontWeight: 500,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        Reject prescription
      </button>
    </div>
  </>
);

/* ─── Detail Panel ─────────────────────────────────────── */
const DetailPanel = ({ rx, onReviewed }) => {
  const [notes, setNotes]           = useState(rx.review_notes || '');
  const [zoom, setZoom]             = useState(100);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [showReupload, setShowReupload] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  useEffect(() => {
    setNotes(rx.review_notes || '');
    setError('');
    setSuccess('');
    setZoom(100);
    setShowReupload(false);
    setPdfLoadError(false);
    setPdfBlobUrl(null);
  }, [rx.id]);

  // Fetch PDF as a blob so the iframe uses a local blob URL —
  // this bypasses Django's X-Frame-Options: DENY header which blocks direct embedding.
  useEffect(() => {
    if (!rx.prescription_file) return;
    const relativeUrl = rx.prescription_file.replace(/^https?:\/\/[^/]+/, '');
    if (!/\.pdf$/i.test(relativeUrl.split('?')[0])) return;
    let cancelled = false;
    fetch(relativeUrl, { credentials: 'same-origin' })
      .then(r => r.ok ? r.blob() : Promise.reject(r.status))
      .then(blob => { if (!cancelled) setPdfBlobUrl(URL.createObjectURL(blob)); })
      .catch(() => { if (!cancelled) setPdfLoadError(true); });
    return () => {
      cancelled = true;
      setPdfBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [rx.prescription_file]);

  const submit = async (reviewStatus) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.patch(`/catalog/prescriptions/${rx.id}/review/`, {
        status: reviewStatus,
        notes,
      });
      setSuccess(`Prescription ${reviewStatus.toLowerCase()} successfully.`);
      onReviewed();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save review.');
    } finally {
      setSaving(false);
    }
  };

  /* Called by the drawer — sends status + the customer message as notes */
  const handleReuploadSend = async (reason, message) => {
    await apiClient.patch(`/catalog/prescriptions/${rx.id}/review/`, {
      status: 'Reupload Requested',
      notes: `[Reason: ${reason}]\n${message}`,
    });
    setSuccess('Reupload request sent to customer.');
    onReviewed();
  };

  const hasFile = !!rx.prescription_file;
  // Strip protocol+host so the Vite proxy serves it same-origin (avoids cross-origin iframe block)
  const fileUrl = hasFile ? rx.prescription_file.replace(/^https?:\/\/[^/]+/, '') : '';
  const filePath = hasFile ? fileUrl.split('?')[0] : '';
  const isImage = hasFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath);
  const isPdf   = hasFile && /\.pdf$/i.test(filePath);
  const fileName = hasFile ? (filePath.split('/').pop() || 'Prescription File') : 'No file uploaded';

  const rows = [
    { eye: 'OD', sub: '(Right)', sph: rx.od_sphere, cyl: rx.od_cylinder, axis: rx.od_axis, add: rx.od_add },
    { eye: 'OS', sub: '(Left)',  sph: rx.os_sphere, cyl: rx.os_cylinder, axis: rx.os_axis, add: rx.os_add },
  ];

  const DataCell = ({ value, mismatch }) => (
    <td style={{ padding: '13px 12px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
      <div style={{ fontSize: 14, color: mismatch ? '#ef4444' : '#0f172a', fontWeight: mismatch ? 600 : 400, lineHeight: '20px' }}>
        {fmt(value)}
      </div>
    </td>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f3f0ff', overflow: 'hidden' }}>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {hasFile ? (
          /* ════════════════════════════════════════════════
             PDF UPLOAD PATH
             Top: file viewer (flex-1)
             Bottom: notes + buttons (shrink-0)
             ════════════════════════════════════════════════ */
          <>
            {/* File viewer section */}
            <div style={{ flex: 1, minHeight: 220, background: '#f3f0ff', padding: 24, display: 'flex', flexDirection: 'column' }}>

              {/* white file card — zoom controls float inside (images only) */}
              <div style={{
                flex: 1, background: '#fff',
                border: '1px solid #e2e8f0', borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* zoom controls — only show for images */}
                {isImage && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 4, zIndex: 2 }}>
                    <button onClick={() => setZoom(z => Math.max(z - 20, 40))} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 8 }}>
                      <ZoomOut size={16} color="#0f172a" />
                    </button>
                    <div style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '5px 9px' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{zoom}%</span>
                    </div>
                    <button onClick={() => setZoom(z => Math.min(z + 20, 200))} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 5, borderRadius: 8 }}>
                      <ZoomIn size={16} color="#0f172a" />
                    </button>
                  </div>
                )}

                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px 24px', boxSizing: 'border-box', gap: 12 }}>
                  {isImage ? (
                    <img src={fileUrl} alt="Prescription" style={{ width: `${zoom}%`, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'width 0.2s' }} />
                  ) : isPdf ? (
                    pdfLoadError ? (
                      <>
                        <FileText size={40} color="#ef4444" />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#991b1b' }}>Failed to load PDF</div>
                          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6d28d9' }}>Open PDF in new tab</a>
                          </div>
                        </div>
                      </>
                    ) : pdfBlobUrl ? (
                      <iframe
                        src={pdfBlobUrl}
                        title="Prescription PDF"
                        style={{ width: '100%', height: 260, border: 'none', borderRadius: 8 }}
                      />
                    ) : (
                      <div style={{ fontSize: 13, color: '#64748b' }}>Loading PDF…</div>
                    )
                  ) : (
                    <>
                      <FileText size={40} color="#94a3b8" />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{fileName}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Scanned document preview</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notes + buttons section */}
            <div style={{ flexShrink: 0, background: '#f3f0ff', borderTop: '1px solid #e2e8f0', padding: '25px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {isPdf && fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#68408d', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={14} /> Open PDF in new tab
                </a>
              )}
              <NotesAndActions notes={notes} setNotes={setNotes} submit={submit} saving={saving} error={error} success={success} onReuploadClick={() => setShowReupload(true)} />
            </div>
          </>
        ) : (
          /* ════════════════════════════════════════════════
             MANUAL ENTRY PATH
             Single section: data table + notes + buttons
             ════════════════════════════════════════════════ */
          <div style={{ flex: 1, background: '#f3f0ff', padding: '25px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Prescription data card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>

              {/* card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 17px', borderBottom: '1px solid #e2e8f0', background: 'rgba(241,245,249,0.5)' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>Extracted Prescription Data</span>
              </div>

              {/* table */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(241,245,249,0.2)' }}>
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
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#000', lineHeight: '20px' }}>{row.eye}</div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: '16px' }}>{row.sub}</div>
                      </td>
                      <DataCell value={row.sph}  mismatch={false} />
                      <DataCell value={row.cyl}  mismatch={false} />
                      <DataCell value={row.axis} mismatch={false} />
                      <DataCell value={row.add}  mismatch={false} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* footer metadata */}
              <div style={{ background: 'rgba(241,245,249,0.2)', padding: '16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b', lineHeight: '16px' }}>PD (Pupillary Distance)</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', lineHeight: '20px' }}>
                      {rx.pd_distance ? `${rx.pd_distance}` : '—'}
                    </span>
                    {rx.pd_distance && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>(Entered: {rx.pd_distance})</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b', lineHeight: '16px' }}>Vision Type</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', lineHeight: '20px' }}>{rx.vision_type || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b', lineHeight: '16px' }}>Submitted</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', lineHeight: '20px' }}>
                    {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <NotesAndActions notes={notes} setNotes={setNotes} submit={submit} saving={saving} error={error} success={success} onReuploadClick={() => setShowReupload(true)} />
          </div>
        )}

      </div>

      {/* Reupload drawer — rendered outside the scroll container so it overlays everything */}
      {showReupload && (
        <ReuploadDrawer
          rx={rx}
          onClose={() => setShowReupload(false)}
          onSend={handleReuploadSend}
        />
      )}
    </div>
  );
};

/* ─── Empty State ──────────────────────────────────────── */
const EmptyState = ({ message }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8' }}>
    <Eye size={48} style={{ opacity: 0.25 }} />
    <span style={{ fontSize: 15, fontWeight: 500 }}>{message}</span>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */
const PrescriptionTable = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedRx, setSelectedRx] = useState(null);

  // form modal state (kept for add/edit)
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editRx, setEditRx] = useState(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/catalog/prescriptions/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPrescriptions(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleReviewed = async () => {
    await fetchPrescriptions();
  };

  // Keep selectedRx in sync after a review action
  useEffect(() => {
    if (selectedRx) {
      const fresh = prescriptions.find(r => r.id === selectedRx.id);
      if (fresh) setSelectedRx(fresh);
    }
  }, [prescriptions]);

  /* filtering + search + sort */
  const tabFiltered = applyTab(prescriptions, activeTab);

  const searched = tabFiltered.filter(rx => {
    const q = search.toLowerCase();
    return !q || [rx.user_name, rx.patient_name, rx.order_display_id, String(rx.id), rx.vision_type]
      .some(v => v?.toLowerCase().includes(q));
  });

  const sorted = [...searched].sort((a, b) => {
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sort === 'oldest' ? da - db : db - da;
  });

  const pendingCount = prescriptions.filter(r =>
    !r.status_label || r.status_label.toLowerCase().includes('pending')
  ).length;

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') await apiClient.post('/catalog/prescriptions/', formData);
      else await apiClient.patch(`/catalog/prescriptions/${editRx.id}/`, formData);
      setShowForm(false);
      fetchPrescriptions();
    } catch (err) { console.error(err); }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/prescriptions/${id}/`);
      setShowForm(false);
      if (selectedRx?.id === id) setSelectedRx(null);
      fetchPrescriptions();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 600, background: '#fefcff' }}>

      {/* ── Page Header ── */}
      <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 24, fontWeight: 500, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Pending Verification
          </h2>
          {pendingCount > 0 && (
            <span style={{
              background: '#f1f5f9', color: '#0f172a',
              fontSize: 14, fontWeight: 500,
              padding: '4px 10px', borderRadius: 9999,
            }}>
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={() => { setFormMode('create'); setEditRx(null); setShowForm(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: '#68408d', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          + Add Prescription
        </button>
      </div>

      <p style={{ margin: '6px 24px 0', fontSize: 14, color: '#697177' }}>
        Review and verify uploaded prescriptions for your orders.
      </p>

      {/* ── Split Panel ── */}
      <div style={{ display: 'flex', flex: 1, margin: '20px 0 0', overflow: 'hidden', borderTop: '1px solid #e2e8f0' }}>

        {/* Left list panel */}
        <div style={{
          width: 400, minWidth: 300, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #e2e8f0',
          background: 'rgba(241,245,249,0.2)',
          overflow: 'hidden',
        }}>
          {/* Filter + Search */}
          <div style={{ padding: '16px 16px 0', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
            {/* pill tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '3px 10px', borderRadius: 9999, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    background: activeTab === tab.key ? '#68408d' : 'transparent',
                    color: activeTab === tab.key ? '#fff' : '#64748b',
                    border: activeTab === tab.key ? 'none' : '1px solid #e2e8f0',
                    transition: 'all 0.12s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* search + sort */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by order ID or customer"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 13px 9px 36px',
                    border: '1px solid #e2e8f0', borderRadius: 10,
                    fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff',
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  style={{
                    appearance: 'none', padding: '9px 32px 9px 13px',
                    border: '1px solid #e2e8f0', borderRadius: 10,
                    fontSize: 14, color: '#0f172a', background: '#fff',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
            </div>
          </div>

          {/* card list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                <RefreshCw size={24} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                No prescriptions found
              </div>
            ) : sorted.map(rx => (
              <RxCard
                key={rx.id}
                rx={rx}
                selected={selectedRx?.id === rx.id}
                onClick={setSelectedRx}
              />
            ))}
          </div>

          {/* list footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 16px', fontSize: 13, color: '#64748b', background: '#fff' }}>
            {sorted.length} prescription{sorted.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Right detail panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f3f0ff' }}>
          {selectedRx ? (
            <DetailPanel
              key={selectedRx.id}
              rx={selectedRx}
              onReviewed={handleReviewed}
            />
          ) : (
            <EmptyState message="Select a prescription to review" />
          )}
        </div>
      </div>

      {/* ── Form Modal (create/edit) ── */}
      {showForm && (
        <FormModal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          onDelete={handleFormDelete}
          mode={formMode}
          title="Prescription"
          fields={[
            {
              name: 'vision_type', label: 'Vision Type', type: 'select',
              options: [
                { label: 'Single Vision', value: 'Single Vision' },
                { label: 'Progressive', value: 'Progressive' },
                { label: 'Bifocal', value: 'Bifocal' },
                { label: 'Reading', value: 'Reading' },
              ], required: true,
            },
            { name: 'pd_distance', label: 'PD Distance (mm)', type: 'number', required: true, step: 0.1, min: 0, max: 100 },
            { name: 'od_sphere', label: 'OD Sphere', type: 'number', step: 0.25 },
            { name: 'od_cylinder', label: 'OD Cylinder', type: 'number', step: 0.25 },
            { name: 'od_axis', label: 'OD Axis', type: 'number', step: 1 },
            { name: 'od_add', label: 'OD Add', type: 'number', step: 0.25 },
            { name: 'os_sphere', label: 'OS Sphere', type: 'number', step: 0.25 },
            { name: 'os_cylinder', label: 'OS Cylinder', type: 'number', step: 0.25 },
            { name: 'os_axis', label: 'OS Axis', type: 'number', step: 1 },
            { name: 'os_add', label: 'OS Add', type: 'number', step: 0.25 },
          ]}
          initialData={editRx || {}}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PrescriptionTable;
