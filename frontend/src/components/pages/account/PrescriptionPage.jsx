import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/prescription.css';

const VISION_TYPES = ['', 'Single Vision', 'Progressive', 'Bifocal', 'Reading'];
const PD_TYPES = ['binocular', 'monocular'];

const EMPTY_FORM = {
    patient_name: '',
    od_sphere: '', od_cylinder: '', od_axis: '', od_add: '',
    os_sphere: '', os_cylinder: '', os_axis: '', os_add: '',
    pd_distance: '', pd_type: 'binocular',
    vision_type: '',
};

const PrescriptionPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchPrescriptions();
    }, [user]);

    const fetchPrescriptions = async () => {
        try {
            const res = await apiClient.get('/catalog/prescriptions/');
            setPrescriptions(res.data.results || res.data);
        } catch {
            setError('Failed to load prescriptions.');
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setFormError(null);
        setShowForm(true);
    };

    const openEdit = (rx) => {
        setForm({
            patient_name: rx.patient_name || '',
            od_sphere: rx.od_sphere ?? '',
            od_cylinder: rx.od_cylinder ?? '',
            od_axis: rx.od_axis ?? '',
            od_add: rx.od_add ?? '',
            os_sphere: rx.os_sphere ?? '',
            os_cylinder: rx.os_cylinder ?? '',
            os_axis: rx.os_axis ?? '',
            os_add: rx.os_add ?? '',
            pd_distance: rx.pd_distance ?? '',
            pd_type: rx.pd_type || 'binocular',
            vision_type: rx.vision_type || '',
        });
        setEditingId(rx.id);
        setFormError(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this prescription?')) return;
        try {
            await apiClient.delete(`/catalog/prescriptions/${id}/`);
            setPrescriptions(prev => prev.filter(p => p.id !== id));
        } catch {
            setError('Failed to delete prescription.');
        }
    };

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            const payload = {
                patient_name: form.patient_name,
                od_sphere: parseFloat(form.od_sphere) || 0,
                od_cylinder: parseFloat(form.od_cylinder) || 0,
                od_axis: parseInt(form.od_axis) || 0,
                od_add: parseFloat(form.od_add) || 0,
                os_sphere: parseFloat(form.os_sphere) || 0,
                os_cylinder: parseFloat(form.os_cylinder) || 0,
                os_axis: parseInt(form.os_axis) || 0,
                os_add: parseFloat(form.os_add) || 0,
                pd_distance: form.pd_distance ? parseFloat(form.pd_distance) : null,
                pd_type: form.pd_type,
                vision_type: form.vision_type,
            };
            if (editingId) {
                const res = await apiClient.put(`/catalog/prescriptions/${editingId}/`, payload);
                setPrescriptions(prev => prev.map(p => p.id === editingId ? res.data : p));
            } else {
                const res = await apiClient.post('/catalog/prescriptions/', payload);
                setPrescriptions(prev => [res.data, ...prev]);
            }
            setShowForm(false);
        } catch (err) {
            const data = err.response?.data;
            setFormError(
                typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : 'Failed to save prescription.'
            );
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatVal = (v) => {
        if (v === null || v === undefined || v === '') return '—';
        const n = parseFloat(v);
        if (isNaN(n)) return '—';
        return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
    };

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="prescription" />

                <div className="account-content">
                    <div className="account-content__header">
                        <h1 className="account-content__title">My Prescriptions</h1>
                        <button className="account-btn-primary" onClick={openAdd}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Prescription
                        </button>
                    </div>

                    {error && <div className="account-error" style={{ marginBottom: 20 }}>{error}</div>}

                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading prescriptions…</span>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="account-empty">
                            <div className="account-empty__icon">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="4"/>
                                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/>
                                </svg>
                            </div>
                            <p className="account-empty__title">No prescriptions saved</p>
                            <p className="account-empty__sub">Add your eye prescription to make lens ordering seamless.</p>
                            <button className="account-btn-primary" style={{ marginTop: 8 }} onClick={openAdd}>
                                Add Prescription
                            </button>
                        </div>
                    ) : (
                        <div className="rx-list">
                            {prescriptions.map(rx => (
                                <div key={rx.id} className="rx-card">
                                    <div className="rx-card__header">
                                        <div>
                                            <span className="rx-card__patient">
                                                {rx.patient_name || 'My Prescription'}
                                            </span>
                                            {rx.vision_type && (
                                                <span className="rx-card__badge">{rx.vision_type}</span>
                                            )}
                                        </div>
                                        <span className="rx-card__date">{formatDate(rx.created_at)}</span>
                                    </div>

                                    <div className="rx-table-wrap">
                                        <table className="rx-table">
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th>Sphere</th>
                                                    <th>Cylinder</th>
                                                    <th>Axis</th>
                                                    <th>Add</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="rx-table__eye-label">OD (Right)</td>
                                                    <td>{formatVal(rx.od_sphere)}</td>
                                                    <td>{formatVal(rx.od_cylinder)}</td>
                                                    <td>{rx.od_axis ?? '—'}°</td>
                                                    <td>{formatVal(rx.od_add)}</td>
                                                </tr>
                                                <tr>
                                                    <td className="rx-table__eye-label">OS (Left)</td>
                                                    <td>{formatVal(rx.os_sphere)}</td>
                                                    <td>{formatVal(rx.os_cylinder)}</td>
                                                    <td>{rx.os_axis ?? '—'}°</td>
                                                    <td>{formatVal(rx.os_add)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {rx.pd_distance && (
                                        <div className="rx-card__pd">
                                            <span className="rx-pd-label">PD</span>
                                            <span className="rx-pd-value">{rx.pd_distance}mm</span>
                                            <span className="rx-pd-type">({rx.pd_type})</span>
                                        </div>
                                    )}

                                    <div className="rx-card__actions">
                                        <button className="account-btn-ghost" onClick={() => openEdit(rx)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                            Edit
                                        </button>
                                        <button className="account-btn-danger" onClick={() => handleDelete(rx.id)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                                                <path d="M10 11v6M14 11v6"/>
                                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit modal */}
            {showForm && (
                <div className="address-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
                    <div className="rx-form-panel">
                        <div className="address-form-panel__header">
                            <h2 className="address-form-panel__title">
                                {editingId ? 'Edit Prescription' : 'Add Prescription'}
                            </h2>
                            <button className="address-form-panel__close" onClick={() => setShowForm(false)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        {formError && <div className="account-error" style={{ marginBottom: 20 }}>{formError}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="rx-form-section">
                                <div className="rx-form-section__label">Patient Name & Vision Type</div>
                                <div className="address-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div className="address-form-field">
                                        <label>Patient Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Self, John Doe"
                                            value={form.patient_name}
                                            onChange={e => handleFieldChange('patient_name', e.target.value)}
                                        />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Vision Type</label>
                                        <select value={form.vision_type} onChange={e => handleFieldChange('vision_type', e.target.value)}>
                                            {VISION_TYPES.map(v => <option key={v} value={v}>{v || 'Select…'}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="rx-form-section">
                                <div className="rx-form-section__label">Right Eye (OD)</div>
                                <div className="rx-form-eye-grid">
                                    <div className="address-form-field">
                                        <label>Sphere</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.od_sphere} onChange={e => handleFieldChange('od_sphere', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Cylinder</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.od_cylinder} onChange={e => handleFieldChange('od_cylinder', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Axis (°)</label>
                                        <input type="number" min="0" max="180" placeholder="0" value={form.od_axis} onChange={e => handleFieldChange('od_axis', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Add</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.od_add} onChange={e => handleFieldChange('od_add', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="rx-form-section">
                                <div className="rx-form-section__label">Left Eye (OS)</div>
                                <div className="rx-form-eye-grid">
                                    <div className="address-form-field">
                                        <label>Sphere</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.os_sphere} onChange={e => handleFieldChange('os_sphere', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Cylinder</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.os_cylinder} onChange={e => handleFieldChange('os_cylinder', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Axis (°)</label>
                                        <input type="number" min="0" max="180" placeholder="0" value={form.os_axis} onChange={e => handleFieldChange('os_axis', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Add</label>
                                        <input type="number" step="0.25" placeholder="0.00" value={form.os_add} onChange={e => handleFieldChange('os_add', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="rx-form-section">
                                <div className="rx-form-section__label">Pupillary Distance (PD)</div>
                                <div className="address-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div className="address-form-field">
                                        <label>PD (mm)</label>
                                        <input type="number" step="0.5" placeholder="64.0" value={form.pd_distance} onChange={e => handleFieldChange('pd_distance', e.target.value)} />
                                    </div>
                                    <div className="address-form-field">
                                        <label>PD Type</label>
                                        <select value={form.pd_type} onChange={e => handleFieldChange('pd_type', e.target.value)}>
                                            {PD_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="address-form-footer">
                                <button type="button" className="account-btn-ghost" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="account-btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : editingId ? 'Update' : 'Save Prescription'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrescriptionPage;
