import React, { useState } from 'react';
import SupportSidebar from './SupportSidebar';
import '../../../styles/support.css';

const cartIcon = 'https://www.figma.com/api/mcp/asset/81ab4813-4139-414b-b56f-d709d026ed3a';
const eyeIcon = 'https://www.figma.com/api/mcp/asset/1116f6f8-aa4f-4bfe-893e-3f657def507e';
const glassesIcon = 'https://www.figma.com/api/mcp/asset/2e83756d-a52a-4fcf-a5d3-820ac1405183';
const lensIcon = 'https://www.figma.com/api/mcp/asset/85157f31-45d1-4d8a-b690-99535bd4101d';
const chevronUp = 'https://www.figma.com/api/mcp/asset/026b41b3-4dd6-49e6-8e4d-2870fb1b929b';
const chevronDown = 'https://www.figma.com/api/mcp/asset/fbae70d1-3b3c-439d-b3fc-60619cb69cfe';
const phoneIcon = 'https://www.figma.com/api/mcp/asset/3b5327aa-a5c4-40fa-b00d-339987434fe8';

const faqGroups = [
    {
        id: 'orders',
        icon: cartIcon,
        title: 'Orders & Purchasing',
        items: [
            {
                q: 'How quickly will my order be delivered?',
                a: 'Standard single-vision orders within Hyderabad are delivered within 1–2 hours of order confirmation. Bifocal and progressive lenses may take 4–5 hours. Delivery is complimentary for all Hyderabad orders.'
            },
            {
                q: 'Can I place an order without a prescription?',
                a: 'Yes. You can choose "Submit Power Later" at checkout and upload your prescription within 15 days. Your frames will be reserved at our atelier until your prescription is received.'
            },
            {
                q: 'Can I cancel or modify my order after placing it?',
                a: 'Modifications and cancellations are possible before lens fabrication begins. Given our rapid 1–2 hour fulfilment window, please contact our dispatch team immediately via WhatsApp or call 1800-266-0123.'
            },
            {
                q: 'What payment methods do you accept?',
                a: 'We accept UPI, credit/debit cards, net banking, and popular wallets including Paytm and PhonePe. All transactions are secured via PCI-DSS compliant payment gateways.'
            },
            {
                q: 'Is cash on delivery available?',
                a: 'Cash on delivery is available for select Hyderabad pin codes. You will see this option at checkout if it is applicable to your delivery address.'
            }
        ]
    },
    {
        id: 'prescription',
        icon: eyeIcon,
        title: 'Prescription Questions',
        items: [
            {
                q: 'How do I submit my prescription?',
                a: 'You can upload your prescription during checkout, send it via WhatsApp to 1800-266-0123, or email a scan to cs@luminaoptique.com. If you selected "Submit Power Later," upload it from your My Prescriptions portal within 15 days.'
            },
            {
                q: 'What prescription formats do you accept?',
                a: 'We accept prescriptions from registered ophthalmologists or optometrists in PDF, JPG, or PNG format. The prescription must be dated within the last 12 months and include your full name, sphere, cylinder, axis, and pupillary distance (PD) values.'
            },
            {
                q: 'What if my prescription is incorrect after delivery?',
                a: 'If we fabricated lenses based on an incorrect prescription provided by us, we will replace them at no charge. If the prescription you submitted was incorrect, a remake will be charged at a nominal rate. Contact support within 7 days of delivery.'
            }
        ]
    },
    {
        id: 'fit',
        icon: glassesIcon,
        title: 'Fit & Comfort',
        items: [
            {
                q: 'How do I find my frame size?',
                a: 'Your frame size is usually printed on the inside of the temple arm — it looks like three numbers separated by dashes (e.g., 52-18-140). These represent lens width, bridge width, and temple length in millimetres. Use our Frame Size Guide for a full walkthrough.'
            },
            {
                q: 'Can I adjust my frames if they feel uncomfortable?',
                a: 'Most metal and acetate frames can be gently adjusted by a professional optician. Visit any local optician for a complimentary adjustment. Eyenic frames are covered under our 2-year warranty for manufacturing defects.'
            }
        ]
    },
    {
        id: 'lenses',
        icon: lensIcon,
        title: 'Contact Lenses',
        items: [
            {
                q: 'Do you sell contact lenses?',
                a: 'Currently, Eyenic specialises exclusively in prescription eyeglasses and sunglasses. Contact lens availability is planned for a future launch. Sign up for our newsletter to be notified.'
            },
            {
                q: 'Can I use my glasses prescription for contact lenses?',
                a: 'Glasses and contact lens prescriptions are not interchangeable. Contact lenses require additional measurements such as base curve and diameter. Please consult a licensed eye care professional for a separate contact lens fitting.'
            }
        ]
    }
];

const AccordionItem = ({ item }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="faq-item">
            <div className="faq-item__question" onClick={() => setOpen(o => !o)}>
                <span>{item.q}</span>
                <img
                    src={open ? chevronUp : chevronDown}
                    alt={open ? 'collapse' : 'expand'}
                    className="faq-item__chevron"
                />
            </div>
            {open && <p className="faq-item__answer">{item.a}</p>}
        </div>
    );
};

const FAQPage = () => {
    return (
        <div className="support-layout">
            <SupportSidebar activePage="faq" />

            <main className="support-content">
                <div className="support-page-header">
                    <h1 className="support-page-heading">FAQs</h1>
                    <p className="support-page-description">
                        Answers to the questions we hear most often. Can't find what you're looking for? Our concierge team is a call away.
                    </p>
                </div>

                {faqGroups.map(group => (
                    <div key={group.id} className="faq-group">
                        <div className="faq-group__header">
                            <img src={group.icon} alt={group.title} className="faq-group__icon" />
                            <h2 className="faq-group__title">{group.title}</h2>
                        </div>
                        <div className="faq-accordion">
                            {group.items.map((item, i) => (
                                <AccordionItem key={i} item={item} />
                            ))}
                        </div>
                    </div>
                ))}

                <div className="faq-callout">
                    <h2 className="faq-callout__heading">Still need guidance?</h2>
                    <button className="faq-callout__btn">
                        <img src={phoneIcon} alt="phone" />
                        Call Us: 1234567890
                    </button>
                </div>
            </main>
        </div>
    );
};

export default FAQPage;
