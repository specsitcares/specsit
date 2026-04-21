import React from 'react';

const Newsletter = () => {
    return (
        <section className="newsletter hp-reveal" id="newsletter">
            <div className="newsletter__wrapper">
                <div className="newsletter__content">
                    <h2 className="newsletter__title">Elevate Your Style</h2>
                    <p className="newsletter__desc">Join our elite community and stay updated with the latest in premium eyewear. Receive exclusive offers and styling tips directly in your inbox.</p>
                </div>
                <form className="newsletter__form" onSubmit={(e) => e.preventDefault()}>
                    <div className="newsletter__input-group">
                        <div className="newsletter__input-wrapper">
                            <span className="newsletter__icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            </span>
                            <input 
                                type="email" 
                                className="newsletter__input" 
                                placeholder="Your email address"
                                required 
                            />
                        </div>
                        <button type="submit" className="newsletter__btn">
                            Subscribe Now
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default Newsletter;
