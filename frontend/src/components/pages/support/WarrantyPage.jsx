import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const crossIcon = 'https://www.figma.com/api/mcp/asset/059e5d1b-fef5-4e97-8b6d-ef17915e725a';
const arrowIcon = 'https://www.figma.com/api/mcp/asset/40c79429-8c02-4a42-b42e-4fd7b088949e';

const WarrantyPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="warranty" />

            <main className="support-content">
                <div className="support-page-header">
                    <p className="support-page-meta">LEGAL DOCUMENT / QUALITY ASSURANCE</p>
                    <h1 className="support-page-heading">Warranty Policy</h1>
                    <p className="support-page-description">
                        Specsit stands behind the quality of every product that leaves our atelier. Please read the following warranty terms carefully to understand your coverage.
                    </p>
                </div>

                {/* Limited Warranty */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">LIMITED WARRANTY AGAINST BREAKAGE</p>

                    <p className="support-section-text">
                        Specsit provides a limited warranty covering manufacturing defects in frames and lenses for a period of <strong>two years</strong> from the date of delivery. This warranty is non-transferable and applies solely to the original purchaser.
                    </p>
                    <p className="support-section-text">
                        Under this warranty, Specsit will, at its sole discretion, repair or replace the defective product at no charge. Replacement products may be new or reconditioned to a like-new standard and carry the remainder of the original warranty term or 90 days, whichever is longer.
                    </p>

                    {/* Exclusions */}
                    <div className="warranty-exclusions">
                        <p className="warranty-exclusions__label">EXCLUSIONS — WHAT IS NOT COVERED:</p>
                        <ul className="warranty-exclusions__list">
                            <li>
                                <img src={crossIcon} alt="not covered" />
                                Damage resulting from accidents, misuse, abuse, or unauthorized modifications to the product.
                            </li>
                            <li>
                                <img src={crossIcon} alt="not covered" />
                                Normal wear and tear, including scratches on lens surfaces, worn nose pads, or stretched temples from regular use.
                            </li>
                            <li>
                                <img src={crossIcon} alt="not covered" />
                                Damage caused by exposure to extreme heat, chemicals, or solvents not recommended by Specsit care guidelines.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Requirements */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">WARRANTY REQUIREMENTS</p>

                    <div className="warranty-requirements">
                        <div className="warranty-req-item">
                            <span className="warranty-req-item__number">01</span>
                            <div className="warranty-req-item__content">
                                <h4>Proof of Purchase</h4>
                                <p>The original order confirmation email or invoice must be presented when initiating a warranty claim. Claims without valid proof of purchase will not be processed.</p>
                            </div>
                        </div>
                        <div className="warranty-req-item">
                            <span className="warranty-req-item__number">02</span>
                            <div className="warranty-req-item__content">
                                <h4>Timely Reporting</h4>
                                <p>Defects must be reported within 30 days of discovery. Claims submitted more than 30 days after the defect was first noticed may not be honoured under this warranty.</p>
                            </div>
                        </div>
                        <div className="warranty-req-item">
                            <span className="warranty-req-item__number">03</span>
                            <div className="warranty-req-item__content">
                                <h4>Return of Defective Product</h4>
                                <p>The defective product must be returned to Specsit before a replacement is dispatched. We will arrange a prepaid reverse pickup from your registered address.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Claim */}
                <div className="support-section">
                    <div className="support-section-divider"></div>
                    <p className="support-section-label">WARRANTY CLAIM</p>

                    <p className="support-section-text">
                        To initiate a warranty claim, contact our support team via email at cs@luminaoptique.com or call 1800-266-0123. Please have your order number and a description of the defect ready. Our team will guide you through the claim process and, if approved, arrange a reverse pickup and replacement within 5–7 business days.
                    </p>

                    <button className="warranty-claim-btn">
                        START CLAIM PROCESS
                        <img src={arrowIcon} alt="arrow" />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default WarrantyPage;
