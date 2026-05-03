import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../../styles/layout.css';

const Footer = () => {
    const { pathname } = useLocation();
    const currentYear = new Date().getFullYear();
    const isProductsPage = pathname === '/products' || pathname.startsWith('/product/');

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    {/* Brand Section (Node 401:8806) */}
                    <div className="footer-section footer-brand">
                        <h2 className="footer-brand-name">Specsit</h2>
                        <p className="footer-tagline">
                            Elevating your vision with curated international brands and bespoke craftsmanship. Hyderabad's premium eyewear atelier.
                        </p>
                        {/* Social Icons (Node 401:8811) */}
                        <div className="footer-social">
                            <a href="#" className="social-link" title="Website">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            </a>
                            <a href="#" className="social-link" title="Chat">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </a>
                            <a href="#" className="social-link" title="Share">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Shop Section (Node 401:8818) */}
                    <div className="footer-section">
                        <h3 className="footer-section-title">Shop</h3>
                        <ul className="footer-links">
                            <li><Link to="/eyeglasses">Eyeglasses</Link></li>
                            <li><Link to="/sunglasses">Sunglasses</Link></li>
                            <li><Link to="/lens-care">Lens Care</Link></li>
                            <li><Link to="/new-arrivals">New Arrivals</Link></li>
                        </ul>
                    </div>

                    {/* Company Section (Node 401:8830) */}
                    <div className="footer-section">
                        <h3 className="footer-section-title">Company</h3>
                        <ul className="footer-links">
                            <li><Link to="/about">About Us</Link></li>
                            <li><Link to="/support/contact">Contact</Link></li>
                            <li><Link to="/store-locator">Store Locator</Link></li>
                            <li><Link to="/at-home-trial">At-Home Trial</Link></li>
                        </ul>
                    </div>

                    {/* Support Section (Node 401:8842) */}
                    <div className="footer-section">
                        <h3 className="footer-section-title">Support</h3>
                        <ul className="footer-links">
                            <li><Link to="/support/faq">FAQs</Link></li>
                            <li><Link to="/support/delivery-timeline">Shipping Policy</Link></li>
                            <li><Link to="/support/warranty">Warranty</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Footer Bottom (Node 401:8852) */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2026 Specsit. Premium Eyewear.
                    </p>
                    <div className="footer-policies">
                        <Link to="/support/privacy" className="policy-link">Privacy Policy</Link>
                        <Link to="/support/terms" className="policy-link">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
