import React from 'react';
import '../../../styles/about.css';

const heroImg = 'https://www.figma.com/api/mcp/asset/ef90809d-7138-4bff-86d0-75df618faabb';
const icon1 = 'https://www.figma.com/api/mcp/asset/895498da-afe6-4197-ba6c-f6df1936c4ca';
const icon2 = 'https://www.figma.com/api/mcp/asset/019ac10d-9bf6-479a-ac7b-827f89c3a436';
const icon3 = 'https://www.figma.com/api/mcp/asset/1e22f72c-8e7e-4ee0-8eef-a4d31d742dae';

const AboutPage = () => {
    return (
        <div className="about-page">
            {/* Hero */}
            <section className="about-hero">
                <div className="about-hero__content">
                    <p className="about-hero__label">EYENIC</p>
                    <h1 className="about-hero__heading">Precision Vision, Curated Style.</h1>
                    <div className="about-hero__description">
                        <p style={{ marginBottom: '0' }}>
                            Our vision is to redefine eyewear by combining thoughtful design with everyday functionality. Each frame is selected for its craftsmanship, comfort, and ability to complement individual style. We collaborate with trusted brands and use quality lens technology to ensure clarity, durability, and a refined wearing experience.
                        </p>
                        <p style={{ marginBottom: '0' }}>
                            With a focus on efficiency and customer convenience, we streamline the journey from selection to delivery. Our platform offers curated collections, intuitive browsing, and fast fulfillment so customers can access premium eyewear without compromise.
                        </p>
                    </div>
                </div>
                <div className="about-hero__image-wrap">
                    <img src={heroImg} alt="Eyenic premium glasses" className="about-hero__image" />
                </div>
            </section>

            {/* Speed Section */}
            <section className="about-speed">
                <div className="about-speed__top-row">
                    <p className="about-speed__bg-text">SPEED.</p>
                    <p className="about-speed__label">The 1-2 Hour Promise</p>
                </div>
                <div className="about-speed__bottom-row">
                    <h2 className="about-speed__heading">Rapid Precision. No Compromise.</h2>
                    <p className="about-speed__description">
                        Luxury shouldn't be defined by waiting. Our in-house vertical integration allows us to process, cut, and fit high-index lenses in under two hours. Whether it's a sudden prescription change or a last-minute styling need, we deliver clarity at the speed of your life.
                    </p>
                </div>
            </section>

            {/* Promises */}
            <section className="about-promises">
                <div className="about-promise-card">
                    <div className="about-promise-card__icon-wrap">
                        <img src={icon1} alt="Fast delivery" className="about-promise-card__icon" />
                    </div>
                    <h3 className="about-promise-card__title">1-2 Hour Delivery</h3>
                    <p className="about-promise-card__description">
                        Our hyper-local logistics network ensures your custom-fitted eyewear arrives at your location faster than a lunch break.
                    </p>
                </div>

                <div className="about-promise-card">
                    <div className="about-promise-card__icon-wrap">
                        <img src={icon2} alt="Bespoke craftsmanship" className="about-promise-card__icon" />
                    </div>
                    <h3 className="about-promise-card__title">Bespoke Craftsmanship</h3>
                    <p className="about-promise-card__description">
                        Each frame is hand-finished by artisans who have dedicated decades to the art of optical design and facial ergonomics.
                    </p>
                </div>

                <div className="about-promise-card">
                    <div className="about-promise-card__icon-wrap">
                        <img src={icon3} alt="Premium materials" className="about-promise-card__icon" />
                    </div>
                    <h3 className="about-promise-card__title">Premium Materials</h3>
                    <p className="about-promise-card__description">
                        We source the finest Italian acetates and Japanese titanium, paired with world-class Carl Zeiss lenses for ultimate clarity.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default AboutPage;
