import React from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const TermsPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="terms" />

            <main className="support-content">
                <div className="support-page-header">
                    <h1 className="policy-heading-medium">Terms &amp; Conditions</h1>
                    <p className="support-page-description">
                        Welcome to Specsit. By accessing or using our platform, you agree to be bound by the following terms and conditions. Please read them carefully before placing an order or using any part of our service.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">01. INTRODUCTION &amp; SCOPE</p>
                    <p className="policy-text">
                        These Terms &amp; Conditions ("Terms") govern your access to and use of the Specsit website, mobile applications, and related services (collectively, the "Platform"). These Terms constitute a legally binding agreement between you ("User") and Specsit ("we," "us," or "our"). By creating an account, placing an order, or otherwise engaging with the Platform, you confirm that you are at least 18 years of age and have the legal capacity to enter into these Terms.
                    </p>
                    <p className="policy-text">
                        These Terms apply to all visitors, registered users, and customers. If you do not agree to these Terms in their entirety, you must discontinue use of the Platform immediately. We reserve the right to amend these Terms at any time; continued use of the Platform following such amendments constitutes your acceptance of the revised Terms.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">02. ORDERS &amp; PAYMENT</p>
                    <p className="policy-text">
                        All orders placed through the Platform are subject to acceptance by Specsit. We reserve the right to refuse or cancel any order for reasons including, but not limited to, product unavailability, errors in pricing or product description, or suspected fraudulent activity. Payment must be made in full at the time of order placement unless a deferred prescription option is selected, in which case the full purchase price is collected upfront and the order is fulfilled upon receipt of the prescription.
                    </p>
                    <p className="policy-text">
                        Prices displayed on the Platform are inclusive of applicable taxes unless stated otherwise. We reserve the right to modify pricing without prior notice; however, orders confirmed prior to a price change will be honoured at the price displayed at the time of confirmation.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">03. PRESCRIPTION RESPONSIBILITY</p>
                    <p className="policy-text">
                        Specsit fabricates lenses based on the prescription information provided by the customer. It is the customer's sole responsibility to ensure the accuracy of the prescription submitted. We strongly recommend consulting a licensed ophthalmologist or optometrist before placing an order. Specsit will not be held liable for adverse visual outcomes resulting from an incorrect prescription submitted by the customer.
                    </p>
                    <p className="policy-text">
                        Prescriptions submitted to Specsit are processed and stored securely. By submitting a prescription, you grant Specsit a limited licence to use that information solely for the purpose of fabricating your ordered lenses.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">04. INTELLECTUAL PROPERTY</p>
                    <p className="policy-text">
                        All content on the Platform, including but not limited to text, images, graphics, logos, and software, is the intellectual property of Specsit or its licensors. Unauthorised reproduction, distribution, or use of any content from the Platform is strictly prohibited and may result in legal action.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">05. LIMITATION OF LIABILITY</p>
                    <p className="policy-text">
                        To the maximum extent permitted by applicable law, Specsit shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform or any products purchased through it. Our total liability to you for any claim arising out of or relating to these Terms shall not exceed the amount you paid for the order in question.
                    </p>
                </div>

                <div className="policy-section">
                    <div className="policy-section-divider"></div>
                    <p className="policy-section-label">06. GOVERNING LAW</p>
                    <p className="policy-text">
                        These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana.
                    </p>
                    <p className="policy-text">
                        If you have any questions regarding these Terms, please contact us at cs@luminaoptique.com or call 1800-266-0123.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default TermsPage;
