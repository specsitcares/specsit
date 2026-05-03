import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

/* TODO: Replace with permanent CDN assets before production */
const portalIcon   = '';
const powerIcon    = '';
const locationIcon = '';
const freeIcon     = '';
const otpIcon      = '';
const warningIcon  = '';

const DeliveryTimelinePage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="delivery" />

            <main className="support-content">
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="support-page-header">
                    <h1 className="support-page-heading">Delivery Timeline</h1>
                    <p className="support-page-description">
                        Experience white-glove logistics curated for the discerning client. At present, our elite delivery network is exclusively dedicated to the Hyderabad area, ensuring absolute precision within our local atelier radius.
                    </p>
                    <div className="support-warning-badge">
                        <img src={warningIcon} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />
                        Service restricted to Hyderabad only
                    </div>
                </div>

                {/* ── Section 1: Hyderabad Priority Bento ────────────── */}
                <div className="dt-bento">
                    <span className="dt-bento__chip">Regional Exclusive</span>
                    <h2 className="dt-bento__heading">Hyderabad Priority Service</h2>
                    <p className="dt-bento__description">
                        For our patrons in the heart of Hyderabad, time is the ultimate luxury. Our dedicated fleet ensures your eyewear arrives with unmatched speed from the moment of order verification.
                    </p>

                    <div className="dt-bento__cards-row">
                        {/* Left: two stacked white cards */}
                        <div className="dt-bento__cards-stack">
                            <div className="dt-service-card">
                                <p className="dt-service-card__label">Standard Optics</p>
                                <p className="dt-service-card__time">1–2 Hours</p>
                                <p className="dt-service-card__sub">Single Vision &amp; Frames</p>
                            </div>
                            <div className="dt-service-card">
                                <p className="dt-service-card__label">Bifocal Lenses</p>
                                <p className="dt-service-card__time">4–5 Hours</p>
                                <p className="dt-service-card__sub">Specialized Craftsmanship</p>
                            </div>
                        </div>

                        {/* Right: tall purple portal card */}
                        <div className="dt-portal-card">
                            <img src={portalIcon} alt="" className="dt-portal-card__icon" />
                            <h3 className="dt-portal-card__heading">{`Portal  Handling`}</h3>
                            <p className="dt-portal-card__description">
                                Our couriers are trained to handle bespoke optics with surgical precision, exclusively within Hyderabad city limits.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Sections 2 & 3: Submit Power Later + Service Area ── */}
                <div className="dt-split">
                    {/* Submit Power Later */}
                    <div className="dt-power-card">
                        <div className="dt-power-card__header">
                            <div className="dt-power-card__icon-wrap">
                                <img src={powerIcon} alt="" />
                            </div>
                            <h2 className="dt-power-card__heading">Submit Power Later</h2>
                        </div>

                        <div className="dt-power-card__body">
                            <p className="dt-power-card__description">
                                Secure your preferred frames today and finalize your vision requirements at your convenience.
                            </p>

                            <div className="dt-grace-box">
                                <p className="dt-grace-box__label">15-Day Grace Period</p>
                                <p className="dt-grace-box__text">
                                    You may submit your prescription power up to 15 days after your initial order placement.
                                </p>
                            </div>

                            <div className="dt-timeline">
                                <p className="dt-timeline__label">Post-Submission Timeline</p>
                                <div className="dt-timeline__row">
                                    <p className="dt-timeline__type">Standard Glasses</p>
                                    <p className="dt-timeline__duration">1–2 Hours</p>
                                </div>
                                <div className="dt-timeline__row">
                                    <p className="dt-timeline__type">Bifocal Glasses</p>
                                    <p className="dt-timeline__duration">4–5 Hours</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Area Status */}
                    <div className="dt-area-card">
                        <div className="dt-area-card__header">
                            <div className="dt-area-card__top">
                                <div className="dt-area-card__icon-wrap">
                                    <img src={locationIcon} alt="" />
                                </div>
                                <h2 className="dt-area-card__heading">Service Area Status</h2>
                            </div>
                            <p className="dt-area-card__description">
                                To maintain our uncompromising standard of delivery speed and white-glove care, we currently focus all operations within a single premium corridor.
                            </p>
                        </div>

                        <div className="dt-area-zone">
                            <p className="dt-area-zone__label">Current Active Zone</p>
                            <p className="dt-area-zone__value">Hyderabad Only</p>
                            <p className="dt-area-zone__sub">Domestic and International shipping currently suspended.</p>
                        </div>

                        <div className="dt-area-fee">
                            <div className="dt-area-fee__left">
                                <p className="dt-area-fee__label">Local Shipping Fee</p>
                                <p className="dt-area-fee__value">Complimentary</p>
                            </div>
                            <img src={freeIcon} alt="" className="dt-area-fee__icon" />
                        </div>
                    </div>
                </div>

                {/* ── Section 4: GPS Tracking + OTP ──────────────────── */}
                <div className="dt-split">
                    {/* GPS Tracking */}
                    <div className="dt-gps-card">
                        <div className="dt-gps-card__text">
                            <h2 className="dt-gps-card__heading">Real-time GPS Tracking</h2>
                            <p className="dt-gps-card__description">
                                Follow your delivery in real-time across Hyderabad. From the moment it leaves our secure facility to its arrival at your concierge, you are always informed.
                            </p>
                        </div>
                        <div className="dt-gps-card__map">
                            <div className="dt-gps-card__map-badge">
                                <span className="dt-gps-card__map-label">LIVE HYDERABAD TRACKING</span>
                            </div>
                        </div>
                    </div>

                    {/* OTP Verified */}
                    <div className="dt-otp-card">
                        <img src={otpIcon} alt="" className="dt-otp-card__icon" />
                        <h3 className="dt-otp-card__heading">OTP Verified</h3>
                        <p className="dt-otp-card__description">
                            Secure, touchless delivery ensured via encrypted OTP verification upon arrival at your doorstep.
                        </p>
                    </div>
                </div>

                {/* ── Section 5: Order Modifications ─────────────────── */}
                <div className="dt-modifications">
                    <div className="dt-modifications__text">
                        <h2 className="dt-modifications__heading">Order Modifications</h2>
                        <p className="dt-modifications__description">
                            We understand plans change. Within the Hyderabad express network, delivery addresses can be modified within 30 minutes of order placement or prescription submission.
                        </p>
                    </div>
                    <button className="dt-modifications__btn">CONTACT DISPATCH</button>
                </div>
            </main>
        </div>
    );
};

export default DeliveryTimelinePage;
