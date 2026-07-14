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
    replaced: { bg: '#DCFCE7', color: '#16A34A', label: 'Replaced' },
};

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

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const ReplacementRequestDetail = () => {
    const { returnId } = useParams();
    const navigate = useNavigate();

    const [rr, setRr] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [stageFiles, setStageFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

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
            setError('Failed to load this replacement request.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [returnId]);

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

    if (loading) return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading replacement request…</div>;
    if (error && !rr) return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>{error}</div>;
    if (rr && rr.request_type !== 'replacement') {
        // Guard: refund requests belong on the return page.
        navigate(`/admin/returns/${returnId}`, { replace: true });
        return null;
    }

    const purple = '#6B3FA8';
    const items = order?.items || [];
    const first = items.find(i => i.id === rr.order_item) || items[0] || {};
    const addr = order?.shipping_address_detail || {};
    const newItem = rr.replacement_variant_detail;
    const origPrice = Number(first.unit_price || first.price_at_purchase || 0);
    const diffPaid = Number(rr.replacement_price_difference || 0);
    const pill = STATUS_PILL[rr.status] || { bg: '#F3F4F6', color: '#374151', label: rr.status };

    const today = new Date().toISOString().slice(0, 10);
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const TIME_SLOTS = ['9 AM – 12 PM', '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM'];
    const CONDITIONS = [
        { value: 'good', label: 'Good — resaleable', desc: 'Unused, original packaging intact' },
        { value: 'minor', label: 'Minor wear', desc: 'Light signs of use, still acceptable' },
        { value: 'damaged', label: 'Damaged', desc: 'Broken / not resaleable' },
        { value: 'not_as_described', label: 'Not as described', desc: 'Different item / mismatch vs claim' },
    ];
    const conditionLabel = (v) => (CONDITIONS.find(c => c.value === v) || {}).label || '';

    const stageMap = { pending: 1, rejected: 1, approved: 2, picked_up: 3, received: 4, replaced: 5 };
    const stage = stageMap[rr.status] ?? 1;
    const rejected = rr.status === 'rejected';

    const STATUS_FOR = { approve: 'approved', reject: 'rejected', pickup: 'picked_up', received: 'received', replace: 'replaced' };
    const openModal = (which) => {
        const seed = {
            approve: { pickup_date: rr.pickup_date || today, pickup_slot: rr.pickup_slot || TIME_SLOTS[0], pickup_agent_name: rr.pickup_agent_name || '', pickup_agent_phone: rr.pickup_agent_phone || '' },
            reject: { rejection_reason: '' },
            pickup: { picked_up_date: rr.picked_up_date || today, pickup_tracking_id: rr.pickup_tracking_id || '' },
            received: { received_date: rr.received_date || today, received_condition: rr.received_condition || 'good', received_notes: rr.received_notes || '' },
            replace: { replacement_sku: rr.replacement_sku || newItem?.sku || '', replacement_courier: rr.replacement_courier || '', replacement_tracking_id: rr.replacement_tracking_id || '' },
        }[which] || {};
        setForm(seed);
        setStageFiles([]);
        setError('');
        setModal(which);
    };
    const submitModal = async () => {
        setSubmitting(true);
        setError('');
        try {
            if ((modal === 'received' || modal === 'pickup') && stageFiles.length) {
                const endpoint = modal === 'pickup' ? 'upload_pickup_images' : 'upload_received_images';
                const fd = new FormData();
                stageFiles.forEach(f => fd.append('photos', f));
                await apiClient.post(`/sales/return-requests/${returnId}/${endpoint}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            const res = await apiClient.patch(`/sales/return-requests/${returnId}/`, { ...form, status: STATUS_FOR[modal] });
            setRr(res.data);
            setModal(null);
            // Shipping the replacement spawns a real order — jump straight to its lifecycle.
            if (modal === 'replace') {
                let ro = res.data.replacement_order;
                if (!ro) { try { const r2 = await apiClient.get(`/sales/return-requests/${returnId}/`); ro = r2.data.replacement_order; } catch { /* ignore */ } }
                if (ro) { navigate(`/admin/orders/${ro}`); return; }
            }
        } catch {
            setError('Action failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const lifecycle = [
        { label: 'Replacement Requested', sub: `Customer submitted on ${fmtD(rr.created_at) || '—'}` },
        {
            label: rejected ? 'Rejected' : 'Under Review',
            sub: rejected ? (rr.rejection_reason || 'Request was rejected by admin') : 'Admin review in progress',
            action: { label: '✓ Approve & Schedule Pickup', onClick: () => openModal('approve') },
            secondary: { label: '✕ Reject Request', onClick: () => openModal('reject') },
        },
        {
            label: 'Pickup Scheduled',
            sub: rr.pickup_date
                ? `Pickup ${fmtD(rr.pickup_date)}${rr.pickup_slot ? `, ${rr.pickup_slot}` : ''}${rr.pickup_agent_name ? ` · ${rr.pickup_agent_name}${rr.pickup_agent_phone ? ` (${rr.pickup_agent_phone})` : ''}` : ''}`
                : 'Courier assigned, pickup date set',
            action: { label: 'Mark as Picked Up', onClick: () => openModal('pickup') },
            extra: (rr.pickup_images && rr.pickup_images.length > 0) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {rr.pickup_images.map((src, k) => (
                        <a key={k} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`pickup ${k + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} /></a>
                    ))}
                </div>
            ) : null,
        },
        {
            label: 'Item Received',
            sub: rr.received_date ? `Received ${fmtD(rr.received_date)}${rr.received_condition ? ` · ${conditionLabel(rr.received_condition)}` : ''}` : 'Warehouse confirms item receipt',
            action: { label: 'Mark as Item Received', onClick: () => openModal('received') },
            extra: (rr.received_notes || (rr.received_images && rr.received_images.length > 0)) ? (
                <div style={{ marginTop: 10 }}>
                    {rr.received_notes && <div style={{ fontSize: 12, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{rr.received_notes}</div>}
                    {rr.received_images && rr.received_images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {rr.received_images.map((src, k) => (
                                <a key={k} href={src} target="_blank" rel="noreferrer"><img src={src} alt={`received ${k + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} /></a>
                            ))}
                        </div>
                    )}
                </div>
            ) : null,
        },
        {
            label: 'Replacement Shipped',
            sub: rr.replacement_tracking_id ? `${rr.replacement_courier ? `${rr.replacement_courier} · ` : ''}${rr.replacement_tracking_id}` : 'Replacement dispatched to customer',
            action: { label: 'Ship Replacement', onClick: () => openModal('replace') },
        },
    ];

    const ghostBtn = { padding: '0 16px', height: 44, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontFamily: 'Roboto, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
    const cardGap = { display: 'flex', flexDirection: 'column', gap: 20 };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', maxWidth: 1600, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate('/admin/orders/returns')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 6 }}>← Back to Returns & Replacements</button>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#040205', margin: 0 }}>
                        Replacement #{String(rr.id).padStart(5, '0')}
                        <span style={{ marginLeft: 12, background: pill.bg, color: pill.color, padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, verticalAlign: 'middle' }}>{pill.label}</span>
                    </h1>
                </div>
            </div>

            {error && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

                {/* ── Left column ── */}
                <div style={cardGap}>
                    <Card title="Replacement Information">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 16 }}>
                            <Field label="Customer" value={order?.customer_name} />
                            <Field label="Order ID" value={order ? `#LO-${String(order.id).padStart(7, '0')}` : '—'} />
                            <Field label="Request Date" value={fmtD(rr.created_at)} />
                            <Field label="Reason" value={REASON_LABELS[rr.reason] || rr.reason} />
                        </div>
                    </Card>

                    {/* Exchange summary — the heart of a replacement */}
                    <Card title="Exchange Summary">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', alignItems: 'center', gap: 12 }}>
                            {/* Original */}
                            <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12 }}>
                                <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Returning</div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{ width: 56, height: 56, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {first.variant_image ? <img src={first.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👓</span>}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#040205' }}>{first.variant_name || 'Product'}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>{first.variant_sku || '—'}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#040205', marginTop: 2 }}>{inr(origPrice)}</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 22, color: purple }}>→</div>
                            {/* New */}
                            <div style={{ border: `1px solid ${purple}`, borderRadius: 10, padding: 12, background: '#FBF9FE' }}>
                                <div style={{ fontSize: 11, color: purple, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Replacing with</div>
                                {newItem ? (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <div style={{ width: 56, height: 56, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {newItem.image ? <img src={newItem.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👓</span>}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#040205' }}>{newItem.name}</div>
                                            <div style={{ fontSize: 11, color: '#6B7280' }}>{newItem.sku || '—'}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#040205', marginTop: 2 }}>{inr(newItem.price)}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                                        {rr.replacement_sku ? `Selected: ${rr.replacement_sku}` : 'Same model, different options (customer will confirm at pickup).'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
                            <span style={{ fontSize: 13, color: '#6B7280' }}>Difference paid by customer</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: diffPaid > 0 ? '#B54708' : '#16A34A' }}>{diffPaid > 0 ? `+ ${inr(diffPaid)}` : 'No extra charge'}</span>
                        </div>
                    </Card>

                    <Card title="Reason & Notes">
                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            {rr.description ? `"${rr.description}"` : 'No additional notes provided.'}
                        </div>
                    </Card>

                    <Card title="Evidence Photos">
                        {Array.isArray(rr.images) && rr.images.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                                {rr.images.map((src, i) => (
                                    <a key={i} href={src} target="_blank" rel="noreferrer">
                                        <div style={{ height: 130, borderRadius: 8, border: '1px solid #E5E7EB', background: '#F3F4F6', overflow: 'hidden' }}>
                                            <img src={src} alt={`Evidence ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#9CA3AF' }}>No photos uploaded by the customer.</div>
                        )}
                    </Card>
                </div>

                {/* ── Right column ── */}
                <div style={cardGap}>
                    <Card title="Replacement Lifecycle">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {lifecycle.map((step, i) => {
                                const done = i < stage;
                                const active = i === stage && !rejected && rr.status !== 'replaced';
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
                                            {active && step.action && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                                                    <button disabled={busy} onClick={step.action.onClick} style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: purple, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{step.action.label}</button>
                                                    {step.secondary && (
                                                        <button disabled={busy} onClick={step.secondary.onClick} style={{ height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #FECACA', background: '#FFF1F2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{step.secondary.label}</button>
                                                    )}
                                                </div>
                                            )}
                                            {step.extra}
                                        </div>
                                    </div>
                                );
                            })}
                            {rr.status === 'replaced' && (
                                <div style={{ marginTop: 4, background: '#DCFCE7', color: '#16A34A', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>
                                    ✓ Replacement shipped.
                                    {rr.replacement_order && (
                                        <span> New order <button onClick={() => navigate(`/admin/orders/${rr.replacement_order}`)} style={{ background: 'none', border: 'none', padding: 0, color: '#15803D', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>#LO-{String(order?.id || '').padStart(7, '0')}-R</button> is now in the orders pipeline.</span>
                                    )}
                                </div>
                            )}
                            {rejected && (
                                <div style={{ marginTop: 4, background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>✕ This replacement request was rejected.</div>
                            )}
                        </div>
                    </Card>

                    <Card title="Internal Notes">
                        {(rr.notes && rr.notes.length > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto', marginBottom: 16, paddingRight: 4 }}>
                                {rr.notes.map(n => (
                                    <div key={n.id} style={{ background: '#F9F7FC', border: '1px solid #EBE3F2', borderRadius: 10, padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: purple }}>{n.author_name || 'Admin'}</span>
                                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>No internal notes yet. Start the thread below.</div>
                        )}
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Write a note visible to the team only..." style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', fontFamily: 'Roboto, sans-serif', fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button disabled={busy || !note.trim()} onClick={saveNote} style={{ height: 32, padding: '0 18px', borderRadius: 6, border: 'none', background: purple, color: '#fff', fontSize: 13, fontWeight: 500, cursor: (busy || !note.trim()) ? 'not-allowed' : 'pointer', opacity: (busy || !note.trim()) ? 0.6 : 1 }}>Add Note</button>
                        </div>
                    </Card>

                    <Card title="Customer Information">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 24, background: '#4D3838', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{(order?.customer_name || 'C').charAt(0).toUpperCase()}</div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 500, color: '#040205' }}>{order?.customer_name || 'Customer'}</div>
                                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Order #LO-{String(order?.id || '').padStart(7, '0')}</div>
                            </div>
                        </div>
                        {order?.customer_email && <div style={{ fontSize: 14, color: '#040205', marginBottom: 6 }}>{order.customer_email}</div>}
                        {addr.phone && <div style={{ fontSize: 14, color: '#040205', marginBottom: 6 }}>{addr.phone}</div>}
                        {(addr.street || addr.city) && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>{[addr.street, addr.city, addr.state, addr.pin_code].filter(Boolean).join(', ')}</div>}
                        <button onClick={() => order && navigate(`/admin/orders/${order.id}`)} style={{ background: 'none', border: 'none', padding: 0, color: purple, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>View Order →</button>
                    </Card>
                </div>
            </div>

            {/* ── Stage form modal ── */}
            {modal && (() => {
                const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
                const TITLES = { approve: 'Approve & Schedule Pickup', reject: 'Reject Replacement Request', pickup: 'Mark as Picked Up', received: 'Mark as Item Received', replace: 'Ship Replacement' };
                const SUBS = {
                    approve: 'Confirm the pickup schedule — the agent details are shared with the customer.',
                    reject: 'Let the team know why this request was declined.',
                    pickup: 'Record that the courier has collected the original item.',
                    received: 'Log the condition and upload photos of the returned item.',
                    replace: 'Record the replacement shipment — this creates a fresh order in the pipeline.',
                };
                const SUBMIT = { approve: 'Approve & Schedule', reject: 'Reject Request', pickup: 'Confirm Pickup', received: 'Confirm Receipt', replace: 'Ship & Create Order' };
                const inp = { width: '100%', boxSizing: 'border-box', height: 40, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontFamily: 'Roboto, sans-serif', fontSize: 14, color: '#040205', outline: 'none', background: '#fff' };
                const lbl = { fontSize: 12, color: '#6B7280', marginBottom: 6, display: 'block', fontWeight: 500 };
                const fieldWrap = { marginBottom: 14 };
                const ta = { ...inp, height: 'auto', minHeight: 72, padding: '10px 12px', resize: 'vertical' };
                const canSubmit = modal === 'reject' ? !!(form.rejection_reason || '').trim() : true;
                const photoField = (labelText) => (
                    <div style={fieldWrap}><label style={lbl}>{labelText} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(up to 8)</span></label>
                        <input type="file" accept="image/*" multiple onChange={e => setStageFiles(prev => [...prev, ...Array.from(e.target.files)].slice(0, 8))} style={{ fontSize: 13 }} />
                        {stageFiles.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                {stageFiles.map((f, k) => (
                                    <div key={k} style={{ position: 'relative' }}>
                                        <img src={URL.createObjectURL(f)} alt={`upload ${k + 1}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                                        <button onClick={() => setStageFiles(files => files.filter((_, i) => i !== k))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={(e) => e.target === e.currentTarget && !submitting && setModal(null)}>
                        <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Roboto, sans-serif' }}>
                            <div style={{ padding: '18px 22px', borderBottom: '1px solid #EFEFEF' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#040205' }}>{TITLES[modal]}</div>
                                <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>{SUBS[modal]}</div>
                            </div>
                            <div style={{ padding: '18px 22px', overflowY: 'auto' }}>
                                {modal === 'approve' && (<>
                                    <div style={fieldWrap}><label style={lbl}>Pickup date</label><input type="date" style={inp} value={form.pickup_date || ''} onChange={e => set('pickup_date', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Time slot</label><select style={inp} value={form.pickup_slot || ''} onChange={e => set('pickup_slot', e.target.value)}>{TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    <div style={fieldWrap}><label style={lbl}>Pickup agent name</label><input style={inp} placeholder="e.g. Rakesh" value={form.pickup_agent_name || ''} onChange={e => set('pickup_agent_name', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Agent phone</label><input style={inp} placeholder="+91-9876543210" value={form.pickup_agent_phone || ''} onChange={e => set('pickup_agent_phone', e.target.value)} /></div>
                                </>)}
                                {modal === 'reject' && (
                                    <div style={fieldWrap}><label style={lbl}>Reason for rejection</label><textarea style={ta} placeholder="e.g. Outside the exchange window / signs of misuse" value={form.rejection_reason || ''} onChange={e => set('rejection_reason', e.target.value)} /></div>
                                )}
                                {modal === 'pickup' && (<>
                                    <div style={fieldWrap}><label style={lbl}>Picked-up date</label><input type="date" style={inp} value={form.picked_up_date || ''} onChange={e => set('picked_up_date', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Return AWB / tracking ID</label><input style={inp} placeholder="e.g. AWB123456789" value={form.pickup_tracking_id || ''} onChange={e => set('pickup_tracking_id', e.target.value)} /></div>
                                    {photoField('Photo of item handed to driver')}
                                </>)}
                                {modal === 'received' && (<>
                                    <div style={fieldWrap}><label style={lbl}>Received date</label><input type="date" style={inp} value={form.received_date || ''} onChange={e => set('received_date', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Condition on arrival</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {CONDITIONS.map(c => (
                                                <div key={c.value} onClick={() => set('received_condition', c.value)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: `1px solid ${form.received_condition === c.value ? purple : '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', background: form.received_condition === c.value ? '#F9F5FF' : '#fff' }}>
                                                    <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${form.received_condition === c.value ? purple : '#D1D5DB'}`, marginTop: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.received_condition === c.value && <div style={{ width: 8, height: 8, borderRadius: 4, background: purple }} />}</div>
                                                    <div><div style={{ fontSize: 13, fontWeight: 500, color: '#040205' }}>{c.label}</div><div style={{ fontSize: 12, color: '#6B7280' }}>{c.desc}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={fieldWrap}><label style={lbl}>Inspection notes</label><textarea style={ta} placeholder="Any observations about the returned item…" value={form.received_notes || ''} onChange={e => set('received_notes', e.target.value)} /></div>
                                    {photoField('Photos of received item')}
                                </>)}
                                {modal === 'replace' && (<>
                                    <div style={{ ...fieldWrap, background: '#FBF9FE', border: `1px solid #E9D7FE`, borderRadius: 8, padding: '10px 12px' }}>
                                        <div style={{ fontSize: 11, color: purple, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>New item</div>
                                        <div style={{ fontSize: 13, color: '#040205' }}>{newItem ? `${newItem.name} · ${inr(newItem.price)}` : (rr.replacement_sku || 'Same-model exchange')}</div>
                                    </div>
                                    <div style={fieldWrap}><label style={lbl}>Replacement SKU</label><input style={inp} placeholder="Variant / SKU being shipped" value={form.replacement_sku || ''} onChange={e => set('replacement_sku', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Courier</label><input style={inp} placeholder="e.g. Delhivery, DTDC" value={form.replacement_courier || ''} onChange={e => set('replacement_courier', e.target.value)} /></div>
                                    <div style={fieldWrap}><label style={lbl}>Tracking ID</label><input style={inp} placeholder="e.g. AWB987654321" value={form.replacement_tracking_id || ''} onChange={e => set('replacement_tracking_id', e.target.value)} /></div>
                                </>)}
                                {error && <div style={{ fontSize: 13, color: '#B42318', marginTop: 4 }}>{error}</div>}
                            </div>
                            <div style={{ padding: '14px 22px', borderTop: '1px solid #EFEFEF', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button onClick={() => !submitting && setModal(null)} style={{ ...ghostBtn, height: 40 }}>Cancel</button>
                                <button onClick={submitModal} disabled={submitting || !canSubmit} style={{ height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: modal === 'reject' ? '#DC2626' : purple, color: '#fff', fontSize: 14, fontWeight: 600, cursor: (submitting || !canSubmit) ? 'not-allowed' : 'pointer', opacity: (submitting || !canSubmit) ? 0.6 : 1 }}>{submitting ? 'Saving…' : SUBMIT[modal]}</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default ReplacementRequestDetail;
