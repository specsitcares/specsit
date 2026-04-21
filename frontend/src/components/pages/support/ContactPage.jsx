import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const whatsappArrow = 'https://www.figma.com/api/mcp/asset/cf4855fe-0d6a-4741-b7b8-b479a1c1bbee';

const ContactPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="contact" />

            <main className="support-content">
                <div className="support-page-header">
                    <p className="contact-label">CONCIERGE SERVICES</p>
                    <h1 className="support-page-heading" style={{ letterSpacing: '-1.2px' }}>Get in Touch</h1>
                    <p className="support-page-description" style={{ fontSize: '18px' }}>
                        Our concierge team is available every day of the week. Whether you have a pre-purchase question or need post-delivery assistance, we're here.
                    </p>
                </div>

                <div className="contact-row">
                    <div className="contact-block">
                        <p className="contact-block__section-label">Direct Contact</p>
                        <p className="contact-block__value">1800-266-0123</p>
                        <p className="contact-block__value">cs@luminaoptique.com</p>
                    </div>
                    <div className="contact-block">
                        <p className="contact-block__section-label">Instant Support</p>
                        <a href="#" className="contact-block__whatsapp">
                            MESSAGE ON WHATSAPP
                            <img src={whatsappArrow} alt="arrow" />
                        </a>
                    </div>
                </div>

                <div className="contact-hours-row">
                    <div>
                        <p className="contact-block__section-label">Atelier Hours</p>
                        <p className="contact-hours__days">Monday — Sunday</p>
                        <p className="contact-hours__time">10:00 AM — 10:00 PM</p>
                    </div>
                    <div>
                        <p className="contact-block__section-label">The Store</p>
                        <p className="contact-store__address">
                            Road No. 36, Suchitra,<br />
                            Hyderabad, Telangana 500033
                        </p>
                        <p className="contact-store__note">1-2 Hour Delivery available for nearby zones.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ContactPage;
