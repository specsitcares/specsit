import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const REASON_LABELS = {
    defective: 'Damaged / Defective product',
    wrong_item: 'Wrong item delivered',
    size_issue: 'Size / fit issue',
    not_as_described: 'Not as described',
    other: 'Other',
};

const STATUS_PILL = {
    pending: { bg: '#FEF3C7', color: '#D97706', label: 'Pending Review' },
    approved: { bg: '#EBE3F2', color: '#6B3FA8', label: 'Approved' },
    rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    picked_up: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Picked Up' },
    received: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Item Received' },
    refunded: { bg: '#DCFCE7', color: '#16A34A', label: 'Refunded' },
    replaced: { bg: '#DCFCE7', color: '#16A34A', label: 'Replaced' },
};

/* Card with a grey header strip + white body (matches the design) */
const Card = ({ title, children, bodyStyle }) => (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#F3F3F3', padding: '14px 20px' }}>
            <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: 15, color: '#040205' }}>{title}</span>
        </div>
        <div style={{ padding: 20, ...bodyStyle }}>{children}</div>
    </div>
);

const Field = ({ label, value, valueColor }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 12, color: '#9CA3AF' }}>{label}</span>
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 14, fontWeight: 500, color: valueColor || '#040205' }}>{value || '—'}</span>
    </div>
);

const ReturnRequestDetail = () => {
    const { returnId } = useParams();
    const navigate = useNavigate();

    const [rr, setRr] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const [noteSaved, setNoteSaved] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/sales/return-requests/${returnId}/`);
            setRr(res.data);
            setNote(res.data.admin_notes || '');
            if (res.data.order) {
                const ordRes = await apiClient.get(`/sales/orders/${res.data.order}/`);
                setOrder(ordRes.data);
            }
        } catch {
            setError('Failed to load this return request.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [returnId]);

    const patch = async (data) => {
        setBusy(true);
        try {
            const res = await apiClient.patch(`/sales/return-requests/${returnId}/`, data);
            setRr(res.data);
        } catch {
            setError('Action failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const saveNote = async () => {
        const text = note.trim();
        if (!text) return;
        setBusy(true);
        try {
            const res = await apiClient.post(`/sales/return-requests/${returnId}/add_note/`, { text });
            setRr(res.data);
            setNote('');
        } catch {
            setError('Could not save note.');
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading return request…</div>;
    }
    if (error && !rr) {
        return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>{error}</div>;
    }

    const items = order?.items || [];
    const first = items[0] || {};
    const addr = order?.shipping_address_detail || {};
    const orderTotal = parseFloat(order?.total_amount || 0);
    const refundAmount = parseFloat(rr.refund_amount || orderTotal);
    const pill = STATUS_PILL[rr.status] || { bg: '#F3F4F6', color: '#374151', label: rr.status };
    const isRefund = rr.request_type === 'refund';

    const stageMap = { pending: 1, rejected: 1, approved: 2, picked_up: 3, received: 4, refunded: 5, replaced: 5 };
    const stage = stageMap[rr.status] ?? 1;
    const rejected = rr.status === 'rejected';
    const today = new Date().toISOString().slice(0, 10);
    /* Sequential lifecycle — the current step carries the action that advances it,
       mirroring the order-details stepper. */
    const lifecycle = [
        { label: 'Return Requested', sub: `Customer submitted on ${rr.created_at ? new Date(rr.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}` },
        {
            label: rejected ? 'Rejected' : 'Under Review',
            sub: rejected ? 'Request was rejected by admin' : 'Admin review in progress',
            action: { label: '✓ Approve & Schedule Pickup', primary: true, onClick: () => patch({ status: 'approved' }) },
            secondary: { label: '✕ Reject Request', danger: true, onClick: () => patch({ status: 'rejected' }) },
        },
        {
            label: 'Pickup Scheduled', sub: 'Courier assigned, pickup date set',
            action: { label: 'Mark as Picked Up', onClick: () => patch({ status: 'picked_up' }) },
        },
        {
            label: 'Item Received', sub: 'Warehouse confirms item receipt',
            action: { label: 'Mark as Item Received', onClick: () => patch({ status: 'received' }) },
        },
        {
            label: isRefund ? 'Refund Processed' : 'Replacement Shipped',
            sub: isRefund ? 'Amount credited back to customer' : 'Replacement dispatched to customer',
            action: isRefund
                ? { label: `Process Refund  ₹${refundAmount.toLocaleString('en-IN')}`, primary: true, onClick: () => patch({ status: 'refunded', refund_amount: orderTotal, refund_date: today }) }
                : { label: 'Mark as Replaced', primary: true, onClick: () => patch({ status: 'replaced' }) },
        },
    ];

    const purple = '#6B3FA8';
    const ghostBtn = { padding: '0 16px', height: 44, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontFamily: 'Roboto, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
    const cardGap = { display: 'flex', flexDirection: 'column', gap: 20 };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', maxWidth: 1600, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders')}>Orders</span>
                {'  ›  '}
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders/returns')}>Returns &amp; Exchanges</span>
                {'  ›  '}
                <span>#RET-{String(rr.id).padStart(4, '0')}</span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#040205' }}>Return Request #RET-{String(rr.id).padStart(4, '0')}</h1>
                <span style={{ background: pill.bg, color: pill.color, fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 16 }}>{pill.label}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <button disabled={busy || rr.status !== 'pending'} onClick={() => patch({ status: 'approved' })}
                        style={{ height: 36, padding: '0 18px', borderRadius: 6, border: 'none', background: rr.status === 'pending' ? purple : '#C4B5D6', color: '#fff', fontSize: 13, fontWeight: 500, cursor: rr.status === 'pending' ? 'pointer' : 'not-allowed' }}>
                        Approve Return
                    </button>
                    <button disabled={busy || rr.status !== 'pending'} onClick={() => patch({ status: 'rejected' })}
                        style={{ height: 36, padding: '0 18px', borderRadius: 6, border: '1px solid #EF4444', background: '#fff', color: '#EF4444', fontSize: 13, fontWeight: 500, cursor: rr.status === 'pending' ? 'pointer' : 'not-allowed', opacity: rr.status === 'pending' ? 1 : 0.5 }}>
                        Reject
                    </button>
                </div>
            </div>

            {error && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

                {/* ── Left column ── */}
                <div style={cardGap}>
                    <Card title="Return Information">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 16 }}>
                            <Field label="Customer" value={order?.customer_name} />
                            <Field label="Order ID" value={order ? `#LO-${String(order.id).padStart(7, '0')}` : '—'} />
                            <Field label="Request Date" value={rr.created_at ? new Date(rr.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                            <Field label="Refund Method" value={(order?.payment_method || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Original Payment'} />
                        </div>
                    </Card>

                    <Card title="Product">
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {first.variant_image ? <img src={first.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26 }}>👓</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                                <span style={{ fontSize: 15, fontWeight: 500, color: '#040205' }}>{first.variant_name || 'Product'}</span>
                                {(first.lens?.name || first.brand_name) && <span style={{ fontSize: 13, color: '#6B7280' }}>{[first.brand_name, first.lens?.name].filter(Boolean).join('  |  ')}</span>}
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#040205' }}>Order Value: ₹{orderTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </Card>

                    <Card title="Return Reason">
                        <div style={{ background: '#FEF2F2', borderRadius: 6, padding: '7px 10px', display: 'inline-flex', marginBottom: 16 }}>
                            <span style={{ color: '#DC2626', fontSize: 14, fontWeight: 500 }}>⚠ {REASON_LABELS[rr.reason] || rr.reason}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Customer notes:</div>
                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            {rr.description ? `"${rr.description}"` : 'No additional notes provided.'}
                        </div>
                    </Card>

                    <Card title="Evidence Photos / Videos">
                        {Array.isArray(rr.images) && rr.images.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                                {rr.images.map((src, i) => (
                                    <div key={i}>
                                        <a href={src} target="_blank" rel="noopener noreferrer">
                                            <div style={{ height: 148, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', overflow: 'hidden' }}>
                                                <img src={src} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        </a>
                                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Photo {i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#9CA3AF' }}>No evidence uploaded by the customer.</div>
                        )}
                    </Card>

                    <Card title="Pickup Schedule">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 16, marginBottom: 16 }}>
                            <Field label="Scheduled Date" value={rr.status === 'approved' || rr.status === 'picked_up' ? 'To be confirmed' : 'Pending approval'} />
                            <Field label="Time Slot" value="9 AM – 6 PM" />
                        </div>
                        <Field label="Pickup Address" value={[addr.street, addr.city, addr.state, addr.pin_code].filter(Boolean).join(', ') || '—'} />
                    </Card>
                </div>

                {/* ── Right column ── */}
                <div style={cardGap}>
                    <Card title="Request Lifecycle">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {lifecycle.map((step, i) => {
                                const done = i < stage;
                                const active = i === stage && !rejected && !['refunded', 'replaced'].includes(rr.status);
                                const isRejectStep = rejected && i === 1;
                                const dotBg = isRejectStep ? '#DC2626' : done ? '#16A34A' : active ? purple : '#D1D5DB';
                                const showCheck = (done || active) && !isRejectStep;
                                const last = i === lifecycle.length - 1;
                                return (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: 24, height: 24, borderRadius: 12, background: dotBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                {isRejectStep ? '✕' : showCheck ? '✓' : ''}
                                            </div>
                                            {!last && <div style={{ flex: 1, minHeight: 28, width: 2, background: i < stage ? '#16A34A' : '#E5E7EB', margin: '2px 0' }} />}
                                        </div>
                                        <div style={{ paddingBottom: last ? 0 : 16, flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 15, fontWeight: 500, color: (done || active || isRejectStep) ? '#040205' : '#9CA3AF' }}>{step.label}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{step.sub}</div>

                                            {/* Inline action on the current step (advances the lifecycle) */}
                                            {active && step.action && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                                                    <button disabled={busy} onClick={step.action.onClick}
                                                        style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: purple, color: '#fff', fontFamily: 'Roboto, sans-serif', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                                                        {step.action.label}
                                                    </button>
                                                    {step.secondary && (
                                                        <button disabled={busy} onClick={step.secondary.onClick}
                                                            style={{ height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #FECACA', background: '#FFF1F2', color: '#DC2626', fontFamily: 'Roboto, sans-serif', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                                                            {step.secondary.label}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {(['refunded', 'replaced'].includes(rr.status)) && (
                                <div style={{ marginTop: 4, background: '#DCFCE7', color: '#16A34A', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>
                                    ✓ This return is complete — {isRefund ? `refund of ₹${refundAmount.toLocaleString('en-IN')} processed` : 'replacement shipped'}.
                                </div>
                            )}
                            {rejected && (
                                <div style={{ marginTop: 4, background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>
                                    ✕ This return request was rejected.
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Internal Notes">
                        {/* Note thread (chat) */}
                        {(rr.notes && rr.notes.length > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto', marginBottom: 16, paddingRight: 4 }}>
                                {rr.notes.map(n => (
                                    <div key={n.id} style={{ background: '#F9F7FC', border: '1px solid #EBE3F2', borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: purple }}>{n.author_name || 'Admin'}</span>
                                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>No internal notes yet. Start the thread below.</div>
                        )}

                        {/* Composer */}
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            placeholder="Write a note visible to the team only..."
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNote(); } }}
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', fontFamily: 'Roboto, sans-serif', fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                            <button disabled={busy || !note.trim()} onClick={saveNote}
                                style={{ height: 32, padding: '0 18px', borderRadius: 6, border: 'none', background: purple, color: '#fff', fontSize: 13, fontWeight: 500, cursor: (busy || !note.trim()) ? 'not-allowed' : 'pointer', opacity: (busy || !note.trim()) ? 0.6 : 1 }}>
                                Add Note
                            </button>
                        </div>
                    </Card>

                    <Card title="Customer Information">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 24, background: '#4D3838', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                                {(order?.customer_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 500, color: '#040205' }}>{order?.customer_name || 'Customer'}</div>
                                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Order #LO-{String(order?.id || '').padStart(7, '0')}</div>
                            </div>
                        </div>
                        {order?.customer_email && <div style={{ fontSize: 14, color: '#040205', marginBottom: 6 }}>{order.customer_email}</div>}
                        {addr.phone && <div style={{ fontSize: 14, color: '#040205', marginBottom: 12 }}>{addr.phone}</div>}
                        <button onClick={() => order && navigate(`/admin/orders/${order.id}`)}
                            style={{ background: 'none', border: 'none', padding: 0, color: purple, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            View Order →
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReturnRequestDetail;
