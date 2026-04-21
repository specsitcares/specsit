import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'];

const AccountInfoPage = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        birthday: '',
        gender: '',
        username: '',
    });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchMe();
    }, []);

    const fetchMe = async () => {
        try {
            const res = await apiClient.get('/accounts/me/');
            const d = res.data;
            setForm({
                full_name: [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username || '',
                email: d.email || '',
                phone: d.phone || '',
                birthday: d.birthday || '',
                gender: d.gender || '',
                username: d.username || '',
            });
        } catch {
            setError('Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (saved) setSaved(false);
        if (error) setError(null);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        setSaving(true);

        try {
            const parts = form.full_name.trim().split(/\s+/);
            const first_name = parts[0] || '';
            const last_name = parts.slice(1).join(' ') || '';

            const res = await apiClient.put('/accounts/me/', {
                first_name,
                last_name,
                email: form.email,
                phone: form.phone,
                birthday: form.birthday || '',
                gender: form.gender,
            });

            // Sync auth context with updated user fields
            const updated = {
                ...user,
                email: res.data.email,
                first_name: res.data.first_name,
                last_name: res.data.last_name,
            };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));

            // Refresh form from server to ensure consistency
            setForm({
                full_name: [res.data.first_name, res.data.last_name].filter(Boolean).join(' ') || res.data.username || '',
                email: res.data.email || '',
                phone: res.data.phone || '',
                birthday: res.data.birthday || '',
                gender: res.data.gender || '',
                username: res.data.username || '',
            });

            setSaved(true);
        } catch (err) {
            const data = err.response?.data;
            setError(
                typeof data === 'object'
                    ? Object.values(data).flat().join(' ')
                    : 'Failed to save profile. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    const initials = form.full_name
        ? form.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : (form.username[0] || '?').toUpperCase();

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="account-info" />

                <div className="acctinfo-canvas">
                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading profile…</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* ── Avatar ── */}
                            <div className="acctinfo-avatar-section">
                                <div className="acctinfo-avatar-wrap">
                                    <div className="acctinfo-avatar">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Profile" className="acctinfo-avatar__img" />
                                        ) : (
                                            <span className="acctinfo-avatar__initials">{initials}</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="acctinfo-avatar__edit-btn"
                                        onClick={() => fileRef.current?.click()}
                                        title="Change photo"
                                    >
                                        <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarChange}
                                    />
                                </div>
                                <h1 className="acctinfo-heading">Edit Profile</h1>
                                <p className="acctinfo-subheading">Update your personal details for a bespoke experience.</p>
                            </div>

                            {error && <div className="account-error" style={{ marginBottom: 24 }}>{error}</div>}

                            {/* ── Form fields ── */}
                            <div className="acctinfo-form">
                                {/* Full Name */}
                                <div className="acctinfo-field">
                                    <label className="acctinfo-label">Full Name</label>
                                    <input
                                        className="acctinfo-input"
                                        type="text"
                                        placeholder="Your full name"
                                        value={form.full_name}
                                        onChange={e => handleChange('full_name', e.target.value)}
                                    />
                                </div>

                                {/* Mobile Number */}
                                <div className="acctinfo-field">
                                    <label className="acctinfo-label">Mobile Number</label>
                                    <div className="acctinfo-input-wrap">
                                        <input
                                            className="acctinfo-input"
                                            type="tel"
                                            placeholder="+91 00000 00000"
                                            value={form.phone}
                                            onChange={e => handleChange('phone', e.target.value)}
                                        />
                                        {form.phone && (
                                            <span className="acctinfo-verified-badge">
                                                <svg width="10" height="9.5" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="acctinfo-field">
                                    <label className="acctinfo-label">Email Address</label>
                                    <div className="acctinfo-input-wrap">
                                        <input
                                            className="acctinfo-input"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={form.email}
                                            onChange={e => handleChange('email', e.target.value)}
                                        />
                                        {form.email && (
                                            <span className="acctinfo-verified-badge">
                                                <svg width="10" height="9.5" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                </svg>
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Birthday + Gender */}
                                <div className="acctinfo-two-col">
                                    <div className="acctinfo-field">
                                        <label className="acctinfo-label">Birthday</label>
                                        <input
                                            className="acctinfo-input"
                                            type="date"
                                            value={form.birthday}
                                            onChange={e => handleChange('birthday', e.target.value)}
                                        />
                                    </div>
                                    <div className="acctinfo-field">
                                        <label className="acctinfo-label">Gender</label>
                                        <div className="acctinfo-input-wrap acctinfo-input-wrap--select">
                                            <select
                                                className="acctinfo-input acctinfo-select"
                                                value={form.gender}
                                                onChange={e => handleChange('gender', e.target.value)}
                                            >
                                                {GENDER_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt || 'Select…'}</option>
                                                ))}
                                            </select>
                                            <svg className="acctinfo-select-chevron" width="12" height="7" viewBox="0 0 12 7" fill="none">
                                                <path d="M1 1L6 6L11 1" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <button type="submit" className="acctinfo-submit-btn" disabled={saving}>
                                    {saving ? 'Updating…' : 'Update Profile'}
                                </button>

                                {saved && (
                                    <div className="acctinfo-saved-msg">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Profile updated successfully
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountInfoPage;
