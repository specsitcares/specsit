import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const ReturnPolicyPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="returns" />

            <main className="support-content">
                <div className="support-page-header">
                    <h1 className="support-page-heading">RETURN &amp; EXCHANGE POLICY</h1>
                    <p className="support-page-description">
                        Our goal is your complete satisfaction. Please read the following policy carefully to understand your rights and our process for cancellations, returns, exchanges, and refunds.
                    </p>
                </div>

                {/* 01. Cancellation */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">01. Cancellation Policy</p>

                    <p className="support-section-text">
                        Orders may be cancelled without penalty before lens fabrication has commenced. Once our opticians begin cutting and coating your lenses, the order enters a non-cancellable state due to the bespoke nature of the work.
                    </p>

                    <div className="returns-callout">
                        <p className="returns-callout__label">Priority — Hyderabad Orders</p>
                        <p className="returns-callout__text">
                            Given our 1-2 hour fulfilment window, fabrication typically begins within minutes of order confirmation for Hyderabad customers. If you need to cancel, contact our dispatch team immediately via WhatsApp or call 1800-266-0123. We will do our best to halt production, but cannot guarantee cancellation once fabrication has started.
                        </p>
                    </div>
                </div>

                {/* 02. Return and Exchange Process */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">02. Return and/or Exchange Process</p>

                    <p className="support-section-text">
                        We accept returns and exchanges within 7 days of delivery for manufacturing defects, incorrect prescriptions fulfilled by us, or frames that arrive damaged. Hygiene-sealed lens products are not eligible for return once opened unless defective.
                    </p>

                    <div className="returns-steps">
                        <div className="returns-step">
                            <span className="returns-step__number">01</span>
                            <div className="returns-step__content">
                                <h4>Initiate via Support</h4>
                                <p>Contact our support team via WhatsApp, email at cs@luminaoptique.com, or call 1800-266-0123. Provide your order number and a brief description of the issue.</p>
                            </div>
                        </div>
                        <div className="returns-step">
                            <span className="returns-step__number">02</span>
                            <div className="returns-step__content">
                                <h4>Photo Documentation</h4>
                                <p>Share clear photographs of the defect or damage. Our quality team reviews submissions within 24 hours and will confirm eligibility for return or exchange.</p>
                            </div>
                        </div>
                        <div className="returns-step">
                            <span className="returns-step__number">03</span>
                            <div className="returns-step__content">
                                <h4>Pickup Arranged</h4>
                                <p>Once approved, we will schedule a reverse pickup from your delivery address at no charge. Please ensure the product is returned in its original packaging with all accessories.</p>
                            </div>
                        </div>
                        <div className="returns-step">
                            <span className="returns-step__number">04</span>
                            <div className="returns-step__content">
                                <h4>Replacement or Refund</h4>
                                <p>Upon receiving and inspecting the returned item, we will dispatch a replacement or initiate a refund to your original payment method within the timelines outlined below.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 03. Refund Integrity */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">03. Refund Integrity</p>

                    <p className="support-section-text">
                        All refunds are processed with full integrity — the exact amount paid is returned through the original payment channel. No deductions are made for processing fees on approved refund cases.
                    </p>

                    <div className="returns-refund-row">
                        <div className="returns-refund-col">
                            <h4>Refund Timelines</h4>
                            <table className="returns-refund-table">
                                <thead>
                                    <tr>
                                        <th>Method</th>
                                        <th>Timeline</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>UPI / Net Banking</td>
                                        <td>2–3 business days</td>
                                    </tr>
                                    <tr>
                                        <td>Credit / Debit Card</td>
                                        <td>5–7 business days</td>
                                    </tr>
                                    <tr>
                                        <td>Eyenic Store Credit</td>
                                        <td>Instant</td>
                                    </tr>
                                    <tr>
                                        <td>Wallet (Paytm, PhonePe)</td>
                                        <td>1–2 business days</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="returns-refund-col">
                            <h4>Refund Methods</h4>
                            <div className="returns-method-card">
                                <p className="returns-method-card__label">Original Payment Method</p>
                                <p className="returns-method-card__text">Refunded to the exact source — card, UPI, or wallet — used at checkout.</p>
                            </div>
                            <div className="returns-method-card">
                                <p className="returns-method-card__label">Eyenic Store Credit</p>
                                <p className="returns-method-card__text">Opt for instant store credit with an additional 5% bonus on the refund value.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReturnPolicyPage;
