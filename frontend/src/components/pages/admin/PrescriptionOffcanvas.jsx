import React, { useState, useEffect } from 'react';
import { X, User, Phone, FileText, Check, Flag, Download, ChevronDown, Glasses } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const fmt = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '—');

const parseRxText = (text) => {
  if (!text) return null;
  const hasOD = text.toUpperCase().includes('OD:');
  const hasOS = text.toUpperCase().includes('OS:');
  if (!hasOD && !hasOS) return null;

  const parsed = {
    od_sphere: '0.00', od_cylinder: '0.00', od_axis: '0', od_add: '0.00',
    os_sphere: '0.00', os_cylinder: '0.00', os_axis: '0', os_add: '0.00',
    pd_distance: null
  };
  
  // Patient Name
  const patientMatch = text.match(/Patient:\s*([^|]+)/i);
  if (patientMatch) parsed.patient_name = patientMatch[1].trim();
  
  // OD SPH/CYL/AXIS
  const odMatch = text.match(/OD:\s*SPH\s*([+-]?\d*(?:\.\d+)?)\s*CYL\s*([+-]?\d*(?:\.\d+)?)\s*AXIS\s*(\d+)/i);
  if (odMatch) {
    parsed.od_sphere = odMatch[1];
    parsed.od_cylinder = odMatch[2];
    parsed.od_axis = odMatch[3];
  }
  
  // OS SPH/CYL/AXIS
  const osMatch = text.match(/OS:\s*SPH\s*([+-]?\d*(?:\.\d+)?)\s*CYL\s*([+-]?\d*(?:\.\d+)?)\s*AXIS\s*(\d+)/i);
  if (osMatch) {
    parsed.os_sphere = osMatch[1];
    parsed.os_cylinder = osMatch[2];
    parsed.os_axis = osMatch[3];
  }
  
  // PD
  const pdMatch = text.match(/PD:\s*([+-]?\d*(?:\.\d+)?)\s*mm/i);
  if (pdMatch) {
    parsed.pd_distance = pdMatch[1];
  }
  
  return parsed;
};

const PrescriptionOffcanvas = ({ order, onClose, onApproved }) => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Notes per item index
  const [itemNotes, setItemNotes]         = useState({});

  // Reject mode/reason states
  const [showRejectIndex, setShowRejectIndex] = useState(null);
  const [rejectReason, setRejectReason]       = useState('');
  const [rejectMode, setRejectMode]           = useState('Rejected'); // 'Rejected' or 'Reupload Requested'
  const [rejectError, setRejectError]         = useState('');

  // Local PDF Blob URLs to bypass X-Frame-Options
  const [pdfBlobUrls, setPdfBlobUrls]         = useState({});

  useEffect(() => {
    if (!order) return;
    setLoading(true);
    setPrescriptions([]);
    setExpandedIndex(0);
    
    // Revoke old blob URLs
    Object.values(pdfBlobUrls).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    setPdfBlobUrls({});

    // Fetch from order detail endpoint which includes all items with prescriptions
    apiClient.get(`/sales/orders/${order.id}/`)
      .then(res => {
        const orderData = res.data;
        // Filter items that have prescriptions
        const itemsWithRx = (orderData.items || []).filter(item => item.prescription);
        
        // Transform each item+prescription into a prescription object for the accordion
        const rxList = itemsWithRx.map(item => {
          // Get status label from prescription status or metadata
          let statusLabel = 'Pending Review';
          if (item.prescription.status?.label) {
            statusLabel = item.prescription.status.label;
          } else if (item.prescription.status) {
            statusLabel = item.prescription.status;
          }
          
          return {
            id: item.prescription.id,
            order_item_id: item.id,
            order_id: orderData.id,
            prescription_file: item.prescription.prescription_file,
            prescription_text: item.prescription.prescription_text,
            od_sphere: item.prescription.od_sphere,
            od_cylinder: item.prescription.od_cylinder,
            od_axis: item.prescription.od_axis,
            od_add: item.prescription.od_add,
            os_sphere: item.prescription.os_sphere,
            os_cylinder: item.prescription.os_cylinder,
            os_axis: item.prescription.os_axis,
            os_add: item.prescription.os_add,
            pd_distance: item.prescription.pd_distance,
            vision_type: item.prescription.vision_type,
            submission_type: item.prescription_submission_type,
            submitted_at: item.prescription.submitted_at,
            status: item.prescription.status,
            status_label: statusLabel,
            review_notes: item.prescription.review_notes,
            itemPatient: item.patient_name,
            itemVariant: item.variant_name,
            itemSku: item.variant_sku,
            itemName: item.variant_name || item.variant_sku || 'Item',
            itemImage: item.variant_image,
            lensName: item.lens?.name,
            lens_prescription_text: item.lens_prescription_text,
            patient_name: item.patient_name,
          };
        });
        
        setPrescriptions(rxList);
      })
      .catch(err => {
        console.error('Failed to fetch order with prescriptions:', err);
        setPrescriptions([]);
      })
      .finally(() => setLoading(false));
  }, [order?.id]);

  // Synchronize internal notes when prescriptions load
  useEffect(() => {
    if (prescriptions.length > 0) {
      const initialNotes = {};
      prescriptions.forEach((p, idx) => {
        initialNotes[idx] = p.review_notes || '';
      });
      setItemNotes(initialNotes);
    }
  }, [prescriptions]);

  // Clean-up blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(pdfBlobUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [pdfBlobUrls]);

  // Lazy-load PDF blob url when accordion item expands
  const fetchPdfBlob = (filePath, index) => {
    if (pdfBlobUrls[index]) return;
    const rel = filePath.replace(/^https?:\/\/[^/]+/, '');
    if (!/\.pdf$/i.test(rel.split('?')[0])) return;

    fetch(rel, { credentials: 'same-origin' })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrls(prev => ({ ...prev, [index]: blobUrl }));
      })
      .catch(() => {});
  };

  const handleApproveItem = async (p, idx) => {
    setSaving(true);
    try {
      let targetId = p.id;
      
      // Create manual prescription object first if needed
      if (!targetId) {
        const createRes = await apiClient.post('/sales/prescriptions/manual/', {
          order_id: order.id,
          item_id: p.order_item_id,
          rx: {
            od: { sph: p.od_sphere, cyl: p.od_cylinder, axis: p.od_axis, add: p.od_add },
            os: { sph: p.os_sphere, cyl: p.os_cylinder, axis: p.os_axis, add: p.os_add }
          },
          name: p.itemPatient || '',
          vision_type: p.vision_type || 'Single Vision'
        });
        
        if (createRes.data.prescription_ids && createRes.data.prescription_ids.length > 0) {
          targetId = createRes.data.prescription_ids[0];
        } else {
          throw new Error('Failed to create manual prescription object on server.');
        }
      }
      
      const notesForReview = itemNotes[idx] || '';
      await apiClient.patch(`/catalog/prescriptions/${targetId}/review/`, {
        status: 'Approved',
        notes: notesForReview || `Approved via offcanvas. Patient: ${p.itemPatient || ''}`,
      });
      
      // Refresh list
      const res = await apiClient.get(`/sales/prescriptions/by-order/${order.id}/`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPrescriptions(list);
      
      // Auto-advance
      const nextPendingIdx = list.findIndex(
        item => getStatusString(item.status_label).toLowerCase() !== 'approved'
      );
      if (nextPendingIdx !== -1) {
        setExpandedIndex(nextPendingIdx);
      } else {
        onApproved(order.id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectItem = async (p, idx, mode, reason) => {
    if (!reason.trim()) { setRejectError('Reason is required.'); return; }
    setSaving(true);
    setRejectError('');
    try {
      let targetId = p.id;
      
      // Create manual prescription object first if needed
      if (!targetId) {
        const createRes = await apiClient.post('/sales/prescriptions/manual/', {
          order_id: order.id,
          item_id: p.order_item_id,
          rx: {
            od: { sph: p.od_sphere, cyl: p.od_cylinder, axis: p.od_axis, add: p.od_add },
            os: { sph: p.os_sphere, cyl: p.os_cylinder, axis: p.os_axis, add: p.os_add }
          },
          name: p.itemPatient || '',
          vision_type: p.vision_type || 'Single Vision'
        });
        
        if (createRes.data.prescription_ids && createRes.data.prescription_ids.length > 0) {
          targetId = createRes.data.prescription_ids[0];
        } else {
          throw new Error('Failed to create manual prescription object on server.');
        }
      }
      
      await apiClient.patch(`/catalog/prescriptions/${targetId}/review/`, {
        status: mode,
        notes: reason
      });
      
      const res = await apiClient.get(`/sales/prescriptions/by-order/${order.id}/`);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setPrescriptions(list);
      setShowRejectIndex(null);
      setRejectReason('');
      
      const nextPendingIdx = list.findIndex(
        item => getStatusString(item.status_label).toLowerCase() !== 'approved'
      );
      if (nextPendingIdx !== -1) {
        setExpandedIndex(nextPendingIdx);
      }
    } catch (err) {
      console.error(err);
      setRejectError('Failed to reject prescription. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFlagIssue = () => {
    onClose();
    navigate('/admin/prescriptions', { state: { selectOrderId: order.id } });
  };

  const handleDownloadFile = (p) => {
    if (!p?.prescription_file) return;
    const url = p.prescription_file.replace(/^https?:\/\/[^/]+/, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'prescription';
    a.click();
  };

  // Process and enrich prescription items
  const getDaysLeft = (orderCreatedAt) => {
    if (!orderCreatedAt) return 15;
    const createdDate = new Date(orderCreatedAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = 15 - diffDays;
    return daysLeft > 0 ? daysLeft : 0;
  };
  const daysLeft = getDaysLeft(order?.created_at);

  const enrichedPrescriptions = prescriptions.map((p) => {
    const linkedItems = (order?.items || []).filter(
      (item) => item.id === p.order_item_id || (p.id !== null && item.prescription?.id === p.id)
    );
    const firstItem = linkedItems[0];
    
    // Fallback parsing for manual entry from lens_prescription_text
    let parsedRx = {};
    if (!p.prescription_file && firstItem?.lens_prescription_text) {
      const parsed = parseRxText(firstItem.lens_prescription_text);
      if (parsed) {
        parsedRx = parsed;
      }
    }
    
    // Override status label if it contains manual details but shows awaiting submission
    let currentStatus = p.status_label || 'Pending';
    if (currentStatus === 'Awaiting Submission' && firstItem?.lens_prescription_text && firstItem.lens_prescription_text.includes('OD:')) {
      currentStatus = 'Pending Review';
    }

    const itemHasFile = !!p.prescription_file && typeof p.prescription_file === 'string' && p.prescription_file.trim() !== '';

    return {
      ...p,
      od_sphere:   p.od_sphere || parsedRx.od_sphere || '0.00',
      od_cylinder: p.od_cylinder || parsedRx.od_cylinder || '0.00',
      od_axis:     p.od_axis || parsedRx.od_axis || '0',
      od_add:      p.od_add || '0.00',
      os_sphere:   p.os_sphere || parsedRx.os_sphere || '0.00',
      os_cylinder: p.os_cylinder || parsedRx.os_cylinder || '0.00',
      os_axis:     p.os_axis || parsedRx.os_axis || '0',
      os_add:      p.os_add || '0.00',
      pd_distance: p.pd_distance || parsedRx.pd_distance || null,
      patient_name: p.patient_name || parsedRx.patient_name || null,
      status_label: currentStatus,
      itemName:    p.itemName || firstItem?.variant_name || firstItem?.variant_sku || 'Standard Frame',
      itemImage:   p.itemImage || firstItem?.variant_image || null,
      lensName:    p.lensName || firstItem?.lens?.name || null,
      itemPatient: p.itemPatient || firstItem?.patient_name || p.patient_name || parsedRx.patient_name || 'Patient',
      hasFile:     itemHasFile,
      lens_prescription_text: firstItem?.lens_prescription_text || null,
    };
  });

  const orderId = order ? `#LO-${String(order.id).padStart(7, '0')}` : '';
  const customerName = order?.customer_name || 'Customer';
  const customerPhone = order?.customer_phone || order?.items?.[0]?.customer_phone || '';

  // Helpers for Status styling
  const statusDotColor = (label = '') => {
    const l = label.toLowerCase();
    if (l === 'approved') return '#10b981';
    if (l === 'rejected') return '#ef4444';
    if (l.includes('reupload') || l.includes('pending')) return '#f59e0b';
    return '#64748b'; // default/awaiting submission
  };

  // Safe getter for status label as string
  const getStatusString = (status) => {
    if (typeof status === 'string') return status;
    if (status?.label && typeof status.label === 'string') return status.label;
    return 'Pending Review';
  };

  const statusBadgeStyle = (label = '') => {
    const safeLabel = getStatusString(label);
    const l = safeLabel.toLowerCase();
    if (l === 'approved') return { bg: '#dcfce7', color: '#166534' };
    if (l === 'rejected') return { bg: '#fee2e2', color: '#991b1b' };
    if (l.includes('reupload') || l.includes('pending')) return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#f1f5f9', color: '#475569' }; // awaiting submission
  };

  const approvedCount = prescriptions.filter(
    p => getStatusString(p.status_label).toLowerCase() === 'approved'
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}
      />

      {/* Offcanvas Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw',
        zIndex: 1001,
        background: '#fcfbfe',
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.06), -30px 0 50px rgba(0,0,0,0.04)',
        transition: 'transform 0.25s ease-in-out',
        fontFamily: 'Inter, sans-serif'
      }}>

        {/* Header */}
        <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Order Prescription Review
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: '#64748b', fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: '#68408d' }}>{orderId}</span>
              <span>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={13} />
                <span>{customerName}</span>
              </div>
              {customerPhone && (
                <>
                  <span>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={13} />
                    <span>{customerPhone}</span>
                  </div>
                </>
              )}
              {order?.created_at && (
                <>
                  <span>·</span>
                  <span style={{ fontWeight: enrichedPrescriptions.some(p => p.status_label === 'Awaiting Submission') ? 700 : 400, color: enrichedPrescriptions.some(p => p.status_label === 'Awaiting Submission') ? '#ef4444' : '#64748b' }}>
                    {enrichedPrescriptions.some(p => p.status_label === 'Awaiting Submission')
                      ? `(${daysLeft} days left)`
                      : new Date(order.created_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>

            {/* Total progress */}
            {enrichedPrescriptions.length > 1 && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(approvedCount / prescriptions.length) * 100}%`, background: '#10b981', borderRadius: 9999, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {approvedCount}/{prescriptions.length} items verified
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', padding: 6, borderRadius: '50%', flexShrink: 0, display: 'flex', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={18} color="#475569" />
          </button>
        </div>

        {/* Content Body - Accordion List with proper scrolling */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '20px 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 16,
          minHeight: 0,  // Critical for flex containers to scroll properly
        }}>
          
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 10 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#68408d', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>Loading order details…</span>
            </div>
          ) : enrichedPrescriptions && enrichedPrescriptions.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8', padding: '48px 0' }}>
              <FileText size={48} style={{ opacity: 0.3, color: '#68408d' }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>No lens prescriptions found on this order</span>
            </div>
          ) : (enrichedPrescriptions || []).map((p, idx) => {
              const isExpanded = expandedIndex === idx;
              const hasFile = p.hasFile;
              const fileUrl = hasFile ? p.prescription_file.replace(/^https?:\/\/[^/]+/, '') : '';
              const isImage = hasFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl.split('?')[0]);
              const isPdf   = hasFile && /\.pdf$/i.test(fileUrl.split('?')[0]);
              const fileName = hasFile ? (fileUrl.split('/').pop() || 'Prescription File') : null;
              
              if (isExpanded && hasFile) {
                fetchPdfBlob(p.prescription_file, idx);
              }

              const badge = statusBadgeStyle(p.status_label);
              
              const rows = [
                { eye: 'OD', sub: '(Right)', sph: p.od_sphere, cyl: p.od_cylinder, axis: p.od_axis, add: p.od_add },
                { eye: 'OS', sub: '(Left)',  sph: p.os_sphere, cyl: p.os_cylinder, axis: p.os_axis, add: p.os_add },
              ];

              return (
                <div
                  key={p.order_item_id || p.id || idx}
                  style={{
                    background: '#ffffff',
                    border: isExpanded ? '1.5px solid #68408d' : '1px solid #e2e8f0',
                    borderRadius: 14,
                    overflow: isExpanded ? 'visible' : 'hidden',
                    boxShadow: isExpanded ? '0 8px 24px rgba(104,64,141,0.06)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    style={{
                      padding: '14px 18px',
                      background: isExpanded ? 'rgba(104,64,141,0.03)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {/* Item Thumbnail */}
                    <div style={{ width: 42, height: 42, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {p.itemImage
                        ? <img src={p.itemImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Glasses size={20} color="#94a3b8" />}
                    </div>

                    {/* Text Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.itemName}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#68408d' }}>Patient: {p.itemPatient}</span>
                        <span>·</span>
                        <span>{p.lensName || 'Frame Only'}</span>
                        {p.status_label === 'Awaiting Submission' && (
                          <>
                            <span>·</span>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>({daysLeft} days left)</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Subtype details */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                        background: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.2px'
                      }}>
                        {p.status_label}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, maxWidth: 220, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hasFile 
                          ? 'Uploaded Document' 
                          : (p.status_label === 'Awaiting Submission' 
                              ? 'Waiting for customer to upload or enter prescription details / PDF' 
                              : 'Manual Entry')}
                      </span>
                    </div>

                    <ChevronDown size={16} color="#64748b" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }} />
                  </div>

                  {/* Accordion Expanded Body */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: '#ffffff' }}>
                      
                      {hasFile ? (
                        /* Sub-view A: File Document Preview */
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Customer Uploaded Document</span>
                            <button
                              onClick={() => handleDownloadFile(p)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#68408d', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Download size={14} /> Download File
                            </button>
                          </div>
                          
                          <div style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                            minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                          }}>
                            {isImage ? (
                              <img src={fileUrl} alt="Prescription" style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }} />
                            ) : isPdf ? (
                              pdfBlobUrls[idx] ? (
                                <iframe src={pdfBlobUrls[idx]} title={`PDF Doc ${idx}`} style={{ width: '100%', height: 300, border: 'none' }} />
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 24 }}>
                                  <FileText size={36} color="#94a3b8" />
                                  <span style={{ fontSize: 12, color: '#64748b' }}>{fileName}</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Loading secure file...</span>
                                </div>
                              )
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <FileText size={36} color="#94a3b8" />
                                <span style={{ fontSize: 12, color: '#64748b' }}>{fileName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (p.lens_prescription_text && (p.lens_prescription_text.includes('OD:') || p.lens_prescription_text.includes('OS:'))) ? (
                        /* Sub-view B: Manual Table Preview */
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 10 }}>Manually Entered Prescription Table</span>
                          
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  {['Eye', 'SPH', 'CYL', 'AXIS', 'ADD'].map(h => (
                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map(row => (
                                  <tr key={row.eye} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 12px' }}>
                                      <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>{row.eye}</span>
                                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{row.sub}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#334155' }}>{fmt(row.sph)}</td>
                                    <td style={{ padding: '10px 12px', color: '#334155' }}>{fmt(row.cyl)}</td>
                                    <td style={{ padding: '10px 12px', color: '#334155' }}>{fmt(row.axis)}</td>
                                    <td style={{ padding: '10px 12px', color: '#334155' }}>{fmt(row.add)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            <div style={{ background: '#f8fafc', padding: '10px 12px', display: 'flex', gap: 20, borderTop: '1px solid #e2e8f0' }}>
                              <div>
                                <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>PD (Pupillary Distance)</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{p.pd_distance ? `${p.pd_distance} mm` : '—'}</span>
                              </div>
                              {p.vision_type && (
                                <div>
                                  <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Vision Type</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{p.vision_type}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Sub-view C: Awaiting customer submission */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '24px 12px', border: '1px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc' }}>
                          <FileText size={28} color="#94a3b8" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textAlign: 'center' }}>
                            Waiting for customer to upload or enter prescription details / PDF
                          </span>
                          <span style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', fontWeight: 700 }}>
                            ({daysLeft} days left)
                          </span>
                        </div>
                      )}

                      {/* Internal Notes Box */}
                      {p.status_label !== 'Awaiting Submission' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Internal Review Notes</label>
                          <textarea
                            value={itemNotes[idx] || ''}
                            onChange={(e) => setItemNotes({ ...itemNotes, [idx]: e.target.value })}
                            placeholder="Add any internal verification notes here (visible to team only)..."
                            rows={2}
                            style={{
                              width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                              border: '1px solid #e2e8f0', borderRadius: 8,
                              fontSize: 12, outline: 'none', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit'
                            }}
                          />
                        </div>
                      )}

                      {/* Reject Form Drawer */}
                      {showRejectIndex === idx && (
                        <div style={{ background: '#fff8f8', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>Reason for {rejectMode}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => setRejectMode('Rejected')}
                                style={{ fontSize: 10, background: rejectMode === 'Rejected' ? '#ef4444' : '#fff', color: rejectMode === 'Rejected' ? '#fff' : '#ef4444', border: '1px solid #ef4444', padding: '1px 5px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                              >Reject</button>
                              <button
                                onClick={() => setRejectMode('Reupload Requested')}
                                style={{ fontSize: 10, background: rejectMode === 'Reupload Requested' ? '#f59e0b' : '#fff', color: rejectMode === 'Reupload Requested' ? '#fff' : '#f59e0b', border: '1px solid #f59e0b', padding: '1px 5px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                              >Reupload</button>
                            </div>
                          </div>
                          
                          <textarea
                            value={rejectReason}
                            onChange={e => { setRejectReason(e.target.value); setRejectError(''); }}
                            placeholder={`Explain why this prescription is being ${rejectMode === 'Rejected' ? 'rejected' : 'requested for reupload'}...`}
                            rows={2}
                            style={{
                              width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                              border: `1px solid ${rejectError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 6,
                              fontSize: 12, color: '#0f172a', resize: 'vertical', outline: 'none', fontFamily: 'inherit'
                            }}
                          />
                          {rejectError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 500 }}>{rejectError}</div>}
                          
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                              onClick={() => { setShowRejectIndex(null); setRejectReason(''); setRejectError(''); }}
                              style={{ flex: 1, padding: '6px', borderRadius: 5, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#475569' }}
                            >Cancel</button>
                            <button
                              onClick={() => handleRejectItem(p, idx, rejectMode, rejectReason)}
                              disabled={saving}
                              style={{ flex: 1, padding: '6px', borderRadius: 5, border: 'none', background: rejectMode === 'Rejected' ? '#ef4444' : '#f59e0b', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                            >Confirm Action</button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons for expanded item */}
                      {getStatusString(p.status_label) !== 'Awaiting Submission' && (() => {
                        const isApproved = getStatusString(p.status_label).toLowerCase().trim() === 'approved';
                        const isProcessed = ['approved', 'rejected', 'reupload requested'].includes(getStatusString(p.status_label).toLowerCase().trim());
                        return (
                          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                            <button
                              onClick={() => handleApproveItem(p, idx)}
                              disabled={saving || isProcessed}
                              style={{
                                flex: 2, padding: '10px 12px', borderRadius: 8, border: 'none',
                                background: isApproved ? '#e2e8f0' : (isProcessed ? '#cbd5e1' : '#10b981'),
                                color: isApproved ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 600, cursor: isProcessed ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                              }}
                            >
                              <Check size={16} />
                              {isApproved ? 'Approved' : 'Approve & continue'}
                            </button>
                            
                            <button
                              onClick={() => { setShowRejectIndex(idx); setRejectMode('Reupload Requested'); }}
                              disabled={isProcessed}
                              style={{
                                flex: 1, padding: '10px 8px', borderRadius: 8, border: '1px solid #fca5a5',
                                background: isProcessed ? '#f8fafc' : '#fff',
                                color: isProcessed ? '#cbd5e1' : '#ef4444',
                                fontSize: 12, fontWeight: 600, cursor: isProcessed ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                              }}
                            >
                              Reject / Issue
                            </button>
                            
                            <button
                              onClick={handleFlagIssue}
                              style={{
                                padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                                background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Flag issue and go to full dashboard"
                            >
                              <Flag size={14} />
                            </button>
                          </div>
                        );
                      })()}

                    </div>
                  )}
                </div>
              );
            })
          }
          
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

      </div>
    </>
  );
};

export default PrescriptionOffcanvas;
