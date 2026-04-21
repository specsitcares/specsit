import React, { useState } from 'react';

const defaultFaqs = [
  {
    question: 'How long does express delivery take in Hyderabad?',
    answer: 'We offer 1-2 hour express delivery across Hyderabad on all in-stock eyewear products. Standard delivery takes 2-3 business days for the rest of India.'
  },
  {
    question: 'Do you offer a warranty on frames?',
    answer: 'Yes, all our frames come with a 1-year manufacturer warranty covering manufacturing defects. Premium frames include an extended 2-year warranty.'
  },
  {
    question: 'Can I try frames before purchasing?',
    answer: 'Absolutely! Visit our flagship atelier in Madhapur, Hyderabad to try any frame from our collection. We also offer a virtual try-on feature on our website.'
  },
  {
    question: 'What is your return and exchange policy?',
    answer: 'We offer a 14-day hassle-free return and exchange policy on all unused products in original packaging. Prescription lenses are non-returnable once crafted.'
  },
];

const FAQ = ({ faqs = defaultFaqs }) => {
  const [openIdx, setOpenIdx] = useState(-1);

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
