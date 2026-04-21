import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/address-book.css';

const ADDRESS_TYPES = ['Home', 'Office', 'Friends or family', 'Other'];

const EMPTY_FORM = {
    title: 'Home',
    full_name_contact: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    pin_code: '',
    country: 'India',
    is_default: false,
};

/* ── Small inline SVGs ──────────────────────────────────── */
const PhoneIcon = () => (
    <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.03 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
    </svg>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#68408D"/>
        <polyline points="7 12 10.5 15.5 17 9" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#040205" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);

const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

/* ── Type badge ─────────────────────────────────────────── */
const TypeBadge = ({ title, selected }) => {
    const isHome = title?.toLowerCase() === 'home';
    return (
        <span className={`addr-badge${isHome && selected ? ' addr-badge--home-selected' : ' addr-badge--default'}`}>
            {title}
        </span>
    );
};

/* ── Address card ───────────────────────────────────────── */
const AddressCard = ({ addr, selected, onSelect, onEdit, onDelete }) => {
    const fullAddr = [addr.street_address, addr.city, addr.state, addr.pin_code, addr.country]
        .filter(Boolean).join(', ');

    return (
        <div className={`addr-card${selected ? ' addr-card--selected' : ' addr-card--idle'}`}>
            {/* Left: info */}
            <div className="addr-card__info">
                <div className="addr-card__name-row">
                    <span className="addr-card__name">{addr.full_name_contact}</span>
                    <TypeBadge title={addr.title} selected={selected} />
                </div>
                <div className="addr-card__details">
                    <span className="addr-card__street">{fullAddr}</span>
                    {addr.phone && (
                        <span className="addr-card__phone">
                            <span className="addr-card__phone-icon"><PhoneIcon /></span>
                            {addr.phone}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: actions */}
            <div className="addr-card__actions">
                {selected ? (
                    /* Selected layout: Edit | Delete | (vertical border) | checkmark */
                    <>
                        <div className="addr-card__edit-delete addr-card__edit-delete--bordered">
                            <button className="addr-action-btn addr-action-btn--edit" onClick={() => onEdit(addr)}>Edit</button>
                            <button className="addr-action-btn addr-action-btn--delete" onClick={() => onDelete(addr.id)}>Delete</button>
                        </div>
                        <CheckIcon />
                    </>
                ) : (
                    /* Idle layout: Edit | Delete | Select pill */
                    <>
                        <div className="addr-card__edit-delete">
                            <button className="addr-action-btn addr-action-btn--edit" onClick={() => onEdit(addr)}>Edit</button>
                            <button className="addr-action-btn addr-action-btn--delete" onClick={() => onDelete(addr.id)}>Delete</button>
                        </div>
                        <button className="addr-select-btn" onClick={() => onSelect(addr.id)}>Select</button>
                    </>
                )}
            </div>
        </div>
    );
};

/* ── Main page ──────────────────────────────────────────── */
const AddressBookPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            const res = await apiClient.get('/accounts/addresses/');
            const list = res.data.results || res.data;
            setAddresses(list);
            // Pre-select default address
            const def = list.find(a => a.is_default);
            if (def) setSelectedId(def.id);
            else if (list.length > 0) setSelectedId(list[0].id);
        } catch {
            setError('Failed to load addresses.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (id) => {
        setSelectedId(id);
        // Persist as default
        try {
            await apiClient.patch(`/accounts/addresses/${id}/`, { is_default: true });
            setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
        } catch { /* silent — selection is still shown in UI */ }
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setFormError(null);
        setShowForm(true);
    };

    const openEdit = (addr) => {
        setForm({
            title: addr.title || 'Home',
            full_name_contact: addr.full_name_contact || '',
            phone: addr.phone || '',
            street_address: addr.street_address || '',
            city: addr.city || '',
            state: addr.state || '',
            pin_code: addr.pin_code || '',
            country: addr.country || 'India',
            is_default: addr.is_default || false,
        });
        setEditingId(addr.id);
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError(null);
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSaving(true);
        try {
            if (editingId) {
                const res = await apiClient.put(`/accounts/addresses/${editingId}/`, form);
                setAddresses(prev => prev.map(a => a.id === editingId ? res.data : a));
            } else {
                const res = await apiClient.post('/accounts/addresses/', form);
                const newAddr = res.data;
                setAddresses(prev => [...prev, newAddr]);
                if (newAddr.is_default || addresses.length === 0) setSelectedId(newAddr.id);
            }
            closeForm();
        } catch (err) {
            const data = err.response?.data;
            setFormError(
                typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : 'Failed to save address.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this address?')) return;
        try {
            await apiClient.delete(`/accounts/addresses/${id}/`);
            const remaining = addresses.filter(a => a.id !== id);
            setAddresses(remaining);
            if (selectedId === id) {
                const def = remaining.find(a => a.is_default);
                setSelectedId(def ? def.id : (remaining[0]?.id ?? null));
            }
        } catch {
            setError('Failed to delete address.');
        }
    };

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="address-book" />

                <div className="account-content">
                    <h1 className="addr-page-title">Select Shipping Address</h1>

                    {error && <div className="account-error" style={{ marginBottom: 20 }}>{error}</div>}

                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading addresses…</span>
                        </div>
                    ) : (
                        <div className="addr-list">
                            {addresses.map(addr => (
                                <AddressCard
                                    key={addr.id}
                                    addr={addr}
                                    selected={addr.id === selectedId}
                                    onSelect={handleSelect}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}

                            {/* Add New Address card */}
                            <button className="addr-add-card" onClick={openAdd}>
                                <div className="addr-add-card__icon">
                                    <PlusIcon />
                                </div>
                                <div className="addr-add-card__text">
                                    <span className="addr-add-card__title">Add New Address</span>
                                    <span className="addr-add-card__sub">
                                        Save a new shipping location to your profile for faster checkout
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit modal */}
            {showForm && (
                <div
                    className="address-form-overlay"
                    onClick={e => { if (e.target === e.currentTarget) closeForm(); }}
                >
                    <div className="address-form-panel">
                        <div className="address-form-panel__header">
                            <h2 className="address-form-panel__title">
                                {editingId ? 'Edit Address' : 'Add New Address'}
                            </h2>
                            <button className="address-form-panel__close" onClick={closeForm}>
                                <CloseIcon />
                            </button>
                        </div>

                        {formError && <div className="account-error" style={{ marginBottom: 16 }}>{formError}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Type selector */}
                                <div className="address-form-field">
                                    <label>Address Type</label>
                                    <div className="address-form-type-row">
                                        {ADDRESS_TYPES.map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`address-type-btn${form.title === type ? ' address-type-btn--active' : ''}`}
                                                onClick={() => handleChange('title', type)}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="address-form-grid">
                                    <div className="address-form-field address-form-grid--full">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            placeholder="Full name of recipient"
                                            value={form.full_name_contact}
                                            onChange={e => handleChange('full_name_contact', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="address-form-field address-form-grid--full">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            value={form.phone}
                                            onChange={e => handleChange('phone', e.target.value)}
                                        />
                                    </div>
                                    <div className="address-form-field address-form-grid--full">
                                        <label>Street Address</label>
                                        <input
                                            type="text"
                                            placeholder="House No, Building, Street"
                                            value={form.street_address}
                                            onChange={e => handleChange('street_address', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="address-form-field">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            placeholder="City"
                                            value={form.city}
                                            onChange={e => handleChange('city', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="address-form-field">
                                        <label>PIN Code</label>
                                        <input
                                            type="text"
                                            placeholder="PIN Code"
                                            value={form.pin_code}
                                            onChange={e => handleChange('pin_code', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="address-form-field">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            placeholder="State"
                                            value={form.state}
                                            onChange={e => handleChange('state', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="address-form-field">
                                        <label>Country</label>
                                        <input
                                            type="text"
                                            placeholder="Country"
                                            value={form.country}
                                            onChange={e => handleChange('country', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="address-form-checkbox-row">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={form.is_default}
                                        onChange={e => handleChange('is_default', e.target.checked)}
                                    />
                                    <label htmlFor="is_default">Set as default address</label>
                                </div>
                            </div>

                            <div className="address-form-footer">
                                <button type="button" className="account-btn-ghost" onClick={closeForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="account-btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : editingId ? 'Update Address' : 'Save Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressBookPage;
