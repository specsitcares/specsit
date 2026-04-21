import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../services/api';
import AccountSidebar from './AccountSidebar';
import '../../../styles/account.css';
import '../../../styles/notifications.css';

const CHANNELS = [
    {
        key: 'whatsapp',
        label: 'WhatsApp Notification',
        description: 'Direct updates and appointment reminders via WhatsApp.',
        iconBg: '#E7F7F2',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/>
            </svg>
        ),
    },
    {
        key: 'sms',
        label: 'SMS Notification',
        description: 'Receive concise text messages for order tracking.',
        iconBg: '#EFF6FF',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
        ),
    },
    {
        key: 'push',
        label: 'Push Notification',
        description: 'Instant alerts on your device for new collection drops.',
        iconBg: '#FEFCFF',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#68408D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
        ),
    },
    {
        key: 'email',
        label: 'Email Notification',
        description: 'Detailed editorial newsletters and transaction receipts.',
        iconBg: '#FFFBEB',
        icon: (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
            </svg>
        ),
    },
];

const DEFAULTS = { whatsapp: true, sms: false, push: true, email: true };

const NotificationsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [prefs, setPrefs] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchPrefs();
    }, []);

    const fetchPrefs = async () => {
        try {
            const res = await apiClient.get('/accounts/notifications/');
            setPrefs(res.data);
        } catch {
            setError('Failed to load notification preferences.');
        } finally {
            setLoading(false);
        }
    };

    const toggle = (key) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
        setError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const res = await apiClient.patch('/accounts/notifications/', prefs);
            setPrefs(res.data);
            setSaved(true);
        } catch {
            setError('Failed to save preferences. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="account-page">
            <div className="account-body">
                <AccountSidebar active="notifications" />

                <div className="account-content">
                    <div className="notif-page-header">
                        <h1 className="notif-page-title">Manage Notifications</h1>
                        <p className="notif-page-subtitle">
                            Choose how you want to be updated on your atelier experience.
                        </p>
                    </div>

                    {error && <div className="account-error" style={{ marginBottom: 20 }}>{error}</div>}

                    {loading ? (
                        <div className="account-loading">
                            <div className="account-spinner" />
                            <span>Loading preferences…</span>
                        </div>
                    ) : (
                        <div className="notif-card">
                            <div className="notif-rows">
                                {CHANNELS.map((ch, idx) => (
                                    <div key={ch.key} className={`notif-row${idx < CHANNELS.length - 1 ? ' notif-row--bordered' : ''}`}>
                                        <div className="notif-row__left">
                                            <div className="notif-row__icon" style={{ background: ch.iconBg }}>
                                                {ch.icon}
                                            </div>
                                            <div className="notif-row__text">
                                                <span className="notif-row__label">{ch.label}</span>
                                                <span className="notif-row__desc">{ch.description}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`notif-toggle${prefs[ch.key] ? ' notif-toggle--on' : ''}`}
                                            onClick={() => toggle(ch.key)}
                                            role="switch"
                                            aria-checked={!!prefs[ch.key]}
                                            aria-label={`Toggle ${ch.label}`}
                                        >
                                            <span className="notif-toggle__knob" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="notif-card__footer">
                                {saved && (
                                    <div className="notif-saved-msg">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        Preferences saved
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="notif-save-btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving…' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
