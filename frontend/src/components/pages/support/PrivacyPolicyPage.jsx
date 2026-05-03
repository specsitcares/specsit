import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const PrivacyPolicyPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="privacy" />

            <main className="support-content">
                <div className="support-page-header">
                    <div className="policy-accent-bar"></div>
                    <h1 className="policy-heading-large">Privacy Policy</h1>
                    <p className="policy-subtitle">
                        Your privacy is important to us. This policy explains what data we collect, how we use it, and your rights regarding your personal information.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">PERSONAL INFORMATION</p>
                    <p className="policy-text">
                        When you create an account or place an order on Specsit, we collect personal information including your name, email address, phone number, delivery address, and payment details. This information is used solely to fulfil your orders, manage your account, and communicate with you about your purchases.
                    </p>
                    <p className="policy-text">
                        We also collect prescription data when you upload or submit a power prescription. This sensitive health information is encrypted at rest and in transit, is accessible only to our licensed opticians, and is never sold or shared with third parties except as required by law.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">AUTOMATIC COLLECTION OF DATA AND ITS USAGE</p>
                    <p className="policy-text">
                        Like most web platforms, Specsit automatically collects certain technical data when you visit our site. This includes your IP address, browser type, device identifiers, pages visited, and time spent on the Platform. This data is used to improve our services, diagnose technical issues, and personalise your shopping experience.
                    </p>
                    <ul className="policy-list">
                        <li>Session analytics to understand browsing patterns and improve navigation</li>
                        <li>Performance monitoring to detect and resolve platform errors</li>
                        <li>Aggregated shopping data to improve product recommendations</li>
                        <li>Fraud detection signals to protect your account and transactions</li>
                    </ul>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">COLLECTION OF INFORMATION BY THIRD-PARTY SITES</p>
                    <p className="policy-text">
                        Our Platform may include links to third-party websites, payment gateways, and social media platforms. When you interact with these third-party services, their respective privacy policies apply. Specsit is not responsible for the data collection practices of third-party sites.
                    </p>
                    <blockquote className="policy-blockquote">
                        "Our payment gateway partners (Razorpay, Stripe) operate under their own PCI-DSS compliance frameworks. Specsit does not store your full card number or CVV at any point."
                    </blockquote>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">COOKIES</p>
                    <p className="policy-text">
                        Specsit uses cookies and similar tracking technologies to enhance your experience on our Platform. Cookies allow us to remember your preferences, keep you logged in, and understand how you interact with our site. You can control cookie settings through your browser preferences; however, disabling certain cookies may affect the functionality of the Platform.
                    </p>
                    <p className="policy-text">
                        We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device for a set period). Third-party cookies from analytics providers like Google Analytics may also be present, subject to their own privacy policies.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">CHANGE IN OUR PRIVACY POLICY</p>
                    <p className="policy-text">
                        Specsit reserves the right to update this Privacy Policy at any time. We will notify you of material changes by posting the revised policy on this page with a new effective date and, where appropriate, by sending an email notification to your registered address. Your continued use of the Platform after such changes constitutes your acceptance of the updated policy. We encourage you to review this page periodically to stay informed about how we protect your information.
                    </p>
                </div>

                <div className="policy-confirmation">
                    <h3>Confirmation</h3>
                    <p>
                        By continuing to use the Specsit Platform, you confirm that you have read and understood this Privacy Policy and agree to the collection and use of your information as described herein. If you have questions or wish to exercise any of your data rights, contact us at cs@luminaoptique.com.
                    </p>
                    <button className="policy-confirmation__btn">I UNDERSTAND →</button>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicyPage;
