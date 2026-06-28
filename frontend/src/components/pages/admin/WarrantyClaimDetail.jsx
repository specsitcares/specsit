import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

const STATUS_PILL = {
    pending: { bg: '#FEF3C7', color: '#D97706', label: 'Under Review' },
    approved: { bg: '#EBE3F2', color: '#6B3FA8', label: 'Approved' },
    in_service: { bg: '#DBEAFE', color: '#1D4ED8', label: 'In Service' },
    completed: { bg: '#DCFCE7', color: '#16A34A', label: 'Resolved' },
    rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
};

const Card = ({ title, children }) => (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#F3F3F3', padding: '14px 20px' }}>
            <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: 15, color: '#040205' }}>{title}</span>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
    </div>
);

const Field = ({ label, value }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 12, color: '#9CA3AF' }}>{label}</span>
        <span style={{ fontFamily: 'Roboto, sans-serif', fontSize: 14, fontWeight: 500, color: '#040205' }}>{value || '—'}</span>
    </div>
);

const COVERED = ['Frame & hinge manufacturing defects', 'Lens coating defects', 'Structural breakage under normal use'];
const NOT_COVERED = ['Accidental damage / drops', 'Scratches from misuse', 'Lost or stolen frames'];

const WarrantyClaimDetail = () => {
    const { claimId } = useParams();
    const navigate = useNavigate();

    const [claim, setClaim] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/sales/warranty-claims/${claimId}/`);
            setClaim(res.data);
            setNote(res.data.admin_notes || '');
            if (res.data.order) {
                const ordRes = await apiClient.get(`/sales/orders/${res.data.order}/`);
                setOrder(ordRes.data);
            }
        } catch {
            setError('Failed to load this warranty claim.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [claimId]);

    const patch = async (data) => {
        setBusy(true);
        try {
            const res = await apiClient.patch(`/sales/warranty-claims/${claimId}/`, data);
            setClaim(res.data);
        } catch {
            setError('Action failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const saveNote = async () => {
        setBusy(true);
        try {
            const res = await apiClient.patch(`/sales/warranty-claims/${claimId}/`, { admin_notes: note });
            setClaim(res.data);
        } catch {
            setError('Could not save the resolution note.');
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#667085' }}>Loading warranty claim…</div>;
    if (error && !claim) return <div style={{ padding: 40, fontFamily: 'Roboto, sans-serif', color: '#B42318' }}>{error}</div>;

    const items = order?.items || [];
    const first = items[0] || {};
    const addr = order?.shipping_address_detail || {};
    const orderTotal = parseFloat(order?.total_amount || 0);
    const pill = STATUS_PILL[claim.status] || { bg: '#F3F4F6', color: '#374151', label: claim.status };

    const purple = '#6B3FA8';
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const purchase = order?.delivery_date || order?.created_at;
    const expiry = purchase ? new Date(new Date(purchase).getTime() + 365 * 86400000) : null;
    const daysLeft = expiry ? Math.ceil((expiry - new Date()) / 86400000) : null;
    const active = daysLeft != null && daysLeft > 0;

    const stageMap = { pending: 1, rejected: 1, approved: 2, in_service: 3, completed: 4 };
    const stage = stageMap[claim.status] ?? 1;
    const rejected = claim.status === 'rejected';
    const resolved = claim.status === 'completed';

    const lifecycle = [
        { label: 'Claim Submitted', sub: fmtDate(claim.claimed_at || claim.created_at) },
        {
            label: rejected ? 'Rejected' : 'Under Review',
            sub: rejected ? 'Claim was rejected by admin' : 'Admin assessing claim validity',
            action: { label: '✓ Approve Claim', primary: true, onClick: () => patch({ status: 'approved' }) },
            secondary: { label: '✕ Reject Claim', danger: true, onClick: () => patch({ status: 'rejected' }) },
        },
        {
            label: 'Claim Approved', sub: 'Repair / replacement authorised',
            action: { label: 'Send to Repair Centre', primary: true, onClick: () => patch({ status: 'in_service' }) },
            alternates: [
                { label: 'Dispatch Replacement', onClick: () => patch({ status: 'completed' }) },
                { label: 'Process Refund', onClick: () => patch({ status: 'completed' }) },
            ],
        },
        {
            label: 'Sent to Repair Centre', sub: 'Item dispatched for repair',
            action: { label: 'Mark as Resolved', primary: true, onClick: () => patch({ status: 'completed' }) },
        },
        { label: 'Claim Resolved', sub: 'Repaired item returned to customer' },
    ];

    const cardGap = { display: 'flex', flexDirection: 'column', gap: 20 };

    return (
        <div style={{ fontFamily: 'Roboto, sans-serif', maxWidth: 1600, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders')}>Orders</span>
                {'  ›  '}
                <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/orders/warranty')}>Warranty Claims</span>
                {'  ›  '}
                <span>#WRN-{String(claim.id).padStart(4, '0')}</span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#040205' }}>Warranty Claim #WRN-{String(claim.id).padStart(4, '0')}</h1>
                <span style={{ background: pill.bg, color: pill.color, fontSize: 13, fontWeight: 500, padding: '6px 16px', borderRadius: 16 }}>{pill.label}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <button disabled={busy || claim.status !== 'pending'} onClick={() => patch({ status: 'approved' })}
                        style={{ height: 36, padding: '0 18px', borderRadius: 6, border: 'none', background: claim.status === 'pending' ? purple : '#C4B5D6', color: '#fff', fontSize: 13, fontWeight: 500, cursor: claim.status === 'pending' ? 'pointer' : 'not-allowed' }}>
                        Approve Claim
                    </button>
                    <button disabled={busy || claim.status !== 'pending'} onClick={() => patch({ status: 'rejected' })}
                        style={{ height: 36, padding: '0 18px', borderRadius: 6, border: '1px solid #FECACA', background: '#FFF1F2', color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: claim.status === 'pending' ? 'pointer' : 'not-allowed', opacity: claim.status === 'pending' ? 1 : 0.5 }}>
                        Reject
                    </button>
                </div>
            </div>

            {/* Warranty banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: active ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${active ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, padding: '14px 20px', marginBottom: 24 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#16A34A' : '#DC2626' }}>{active ? '✓ WARRANTY ACTIVE' : '✕ WARRANTY EXPIRED'}</div>
                    <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
                        Purchased: {fmtDate(purchase)} • Warranty expires: {fmtDate(expiry)}{active ? ` • ${daysLeft} days remaining` : ''}
                    </div>
                </div>
                {active && <span style={{ background: '#16A34A', color: '#fff', fontSize: 13, fontWeight: 500, padding: '8px 16px', borderRadius: 8 }}>Eligible for Claim</span>}
            </div>

            {error && <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
                {/* Left column */}
                <div style={cardGap}>
                    <Card title="Claim Information">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 16 }}>
                            <Field label="Customer" value={order?.customer_name} />
                            <Field label="Product" value={first.variant_name} />
                            <Field label="Order ID" value={order ? `#LO-${String(order.id).padStart(7, '0')}` : '—'} />
                            <Field label="Submitted" value={fmtDate(claim.claimed_at || claim.created_at)} />
                        </div>
                    </Card>

                    <Card title="Issue Reported">
                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            {claim.issue_description ? `"${claim.issue_description}"` : 'No issue description provided.'}
                        </div>
                    </Card>

                    <Card title="Warranty Coverage Check">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 14 }}>
                                <div style={{ color: '#16A34A', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>✓ Covered</div>
                                {COVERED.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>• {c}</div>)}
                            </div>
                            <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 8, padding: 14 }}>
                                <div style={{ color: '#DC2626', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>✗ Not Covered</div>
                                {NOT_COVERED.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>• {c}</div>)}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right column */}
                <div style={cardGap}>
                    <Card title="Claim Lifecycle">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {lifecycle.map((step, i) => {
                                const done = i < stage;
                                const isActive = i === stage && !rejected && !resolved;
                                const isRejectStep = rejected && i === 1;
                                const dotBg = isRejectStep ? '#DC2626' : done ? '#16A34A' : isActive ? purple : '#D1D5DB';
                                const showCheck = (done || isActive) && !isRejectStep;
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
                                            <div style={{ fontSize: 15, fontWeight: 500, color: (done || isActive || isRejectStep) ? '#040205' : '#9CA3AF' }}>{step.label}</div>
                                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{step.sub}</div>
                                            {isActive && step.action && (
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
                                                    {(step.alternates || []).map((alt, j) => (
                                                        <button key={j} disabled={busy} onClick={alt.onClick}
                                                            style={{ height: 38, padding: '0 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontFamily: 'Roboto, sans-serif', fontSize: 13, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                                                            {alt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {resolved && <div style={{ marginTop: 4, background: '#DCFCE7', color: '#16A34A', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>✓ This claim has been resolved.</div>}
                            {rejected && <div style={{ marginTop: 4, background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>✕ This warranty claim was rejected.</div>}
                        </div>
                    </Card>

                    <Card title="Resolution Note">
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                            placeholder="Add a resolution note for the team / customer..."
                            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', fontFamily: 'Roboto, sans-serif', fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button disabled={busy} onClick={saveNote}
                                style={{ height: 32, padding: '0 18px', borderRadius: 6, border: 'none', background: purple, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                                Save Note
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

export default WarrantyClaimDetail;
