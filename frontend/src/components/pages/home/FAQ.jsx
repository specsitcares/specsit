import React, { useState } from 'react';
import { useHomeData } from '../../../context/HomeDataContext';

const FAQ = ({ faqs: faqsProp = null }) => {
  const [openIdx, setOpenIdx] = useState(-1);
  const home = useHomeData();

  const faqs = faqsProp || home?.faqs || [];
  if (faqs.length === 0) return null;

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? -1 : idx);
  };

  return (
    <section className="faq hp-reveal" id="faq-section">
      <h2 className="faq__title">Frequently Asked Questions</h2>
      <div className="faq__list">
        {faqs.map((faq, idx) => (
          <div key={idx} className={`faq__item ${openIdx === idx ? 'faq__item--open' : ''}`}>
            <button className="faq__question" onClick={() => toggle(idx)}>
              <span>{faq.question}</span>
              <span className="faq__icon">+</span>
            </button>
            <div className="faq__answer">
              <p className="faq__answer-text">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
