import React from 'react';
import { Link } from 'react-router-dom';
import '../../../styles/support.css';

/* ─── Inline SVG icons (avoids expiring Figma URLs) ─────────── */
const IconShipping = () => (
    <svg width="17" height="12" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="15" height="13" rx="1"/><path d="M16 5h3l3 4v4h-6V5z"/><circle cx="5.5" cy="15.5" r="1.5"/><circle cx="18.5" cy="15.5" r="1.5"/>
    </svg>
);
const IconReturns = () => (
    <svg width="14" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
    </svg>
);
const IconPayments = () => (
    <svg width="17" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="22" height="16" rx="2"/><line x1="1" y1="6" x2="23" y2="6"/>
    </svg>
);
const IconProduct = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);
const IconWarranty = () => (
    <svg width="17" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);
const IconFAQ = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
);
const IconContact = () => (
    <svg width="15" height="12" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5 19.79 19.79 0 0 1 1.61 2.9 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.61 5.61l.27-.36a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);
const IconLegal = () => (
    <svg width="14" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
);
const IconChevron = () => (
    <svg width="5" height="7" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 2 6 6 2 10"/>
    </svg>
);

const SupportSidebar = ({ activePage }) => {
    const isDelivery = activePage === 'delivery';
    const isReturns = activePage === 'returns';
    const isWarranty = activePage === 'warranty';
    const isFaq = activePage === 'faq';
    const isContact = activePage === 'contact';
    const isTerms = activePage === 'terms';
    const isPrivacy = activePage === 'privacy';

    return (
        <aside className="support-sidebar">
            {/* Header */}
            <div className="support-sidebar__header">
                <p className="support-sidebar__header-title">Support Center</p>
                <p className="support-sidebar__header-sub">Concierge &amp; Legal Services</p>
            </div>

            <nav className="support-sidebar__nav">
                {/* Shipping & Delivery */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconShipping /></span>
                        <span className="support-sidebar__group-label">Shipping &amp; Delivery</span>
                    </div>
                    <div className={`support-sidebar__sub ${isDelivery ? 'support-sidebar__sub--active' : ''}`}>
                        <Link to="/support/delivery-timeline" className={`support-sidebar__link ${isDelivery ? 'support-sidebar__link--active' : ''}`}>
                            Delivery timeline
                        </Link>
                    </div>
                </div>

                {/* Returns & Refunds */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconReturns /></span>
                        <span className="support-sidebar__group-label">Returns &amp; Refunds</span>
                    </div>
                    <div className={`support-sidebar__sub ${isReturns ? 'support-sidebar__sub--active' : ''}`}>
                        <Link to="/support/returns" className={`support-sidebar__link ${isReturns ? 'support-sidebar__link--active' : ''}`}>
                            Return and Exchange policy
                        </Link>
                    </div>
                </div>

                {/* Payments */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconPayments /></span>
                        <span className="support-sidebar__group-label">Payments</span>
                    </div>
                    <div className="support-sidebar__sub">
                        <span className="support-sidebar__link" style={{ cursor: 'default' }}>Payment methods</span>
                        <span className="support-sidebar__link" style={{ cursor: 'default' }}>Invoice / GST</span>
                    </div>
                </div>

                {/* Product Information */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconProduct /></span>
                        <span className="support-sidebar__group-label">Product Information</span>
                    </div>
                    <div className="support-sidebar__sub">
                        <span className="support-sidebar__link" style={{ cursor: 'default' }}>Lens types guide</span>
                        <span className="support-sidebar__link" style={{ cursor: 'default' }}>Frame size guide</span>
                        <span className="support-sidebar__link" style={{ cursor: 'default' }}>Product care</span>
                    </div>
                </div>

                {/* Warranty Policy → */}
                <div className="support-sidebar__group">
                    <Link to="/support/warranty" className={`support-sidebar__direct-link ${isWarranty ? 'support-sidebar__direct-link--active' : ''}`}>
                        <span className="support-sidebar__group-icon" style={{ color: isWarranty ? '#68408D' : '#040205' }}><IconWarranty /></span>
                        <span className="support-sidebar__group-label" style={{ color: isWarranty ? '#68408D' : '#040205' }}>Warranty Policy</span>
                        <span className="support-sidebar__chevron"><IconChevron /></span>
                    </Link>
                </div>

                {/* FAQ → */}
                <div className="support-sidebar__group">
                    <Link to="/support/faq" className={`support-sidebar__direct-link ${isFaq ? 'support-sidebar__direct-link--active' : ''}`}>
                        <span className="support-sidebar__group-icon" style={{ color: isFaq ? '#68408D' : '#040205' }}><IconFAQ /></span>
                        <span className="support-sidebar__group-label" style={{ color: isFaq ? '#68408D' : '#040205' }}>FAQ</span>
                        <span className="support-sidebar__chevron"><IconChevron /></span>
                    </Link>
                </div>

                {/* Contact */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconContact /></span>
                        <span className="support-sidebar__group-label">Contact</span>
                    </div>
                    {isContact && (
                        <div className="support-sidebar__sub support-sidebar__sub--active">
                            <Link to="/support/contact" className="support-sidebar__link support-sidebar__link--active">
                                Get in touch
                            </Link>
                        </div>
                    )}
                </div>

                {/* Legal */}
                <div className="support-sidebar__group">
                    <div className="support-sidebar__group-heading">
                        <span className="support-sidebar__group-icon"><IconLegal /></span>
                        <span className="support-sidebar__group-label">Legal</span>
                    </div>
                    <div className={`support-sidebar__sub ${isTerms || isPrivacy ? 'support-sidebar__sub--active' : ''}`}>
                        <Link to="/support/terms" className={`support-sidebar__link ${isTerms ? 'support-sidebar__link--active' : ''}`}>
                            Terms &amp; Conditions
                        </Link>
                        <Link to="/support/privacy" className={`support-sidebar__link ${isPrivacy ? 'support-sidebar__link--active' : ''}`}>
                            Privacy policy
                        </Link>
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default SupportSidebar;
