import React from 'react';
import '../../../styles/end-nav-bar.css';

const EndNavBar = () => {
  return (
    <div className="end-nav-bar" data-name="End nav bar">
      {/* Brand Logo */}
      <div className="end-nav-brand" data-name="Brand Logo">
        <div className="brand-text">SPECSIT</div>
      </div>

      {/* Trailing Actions (Right) */}
      <div className="end-nav-trailing" data-name="Trailing Actions (Right)">
        {/* Help Section */}
        <div className="help-section" data-name="Secondary Action Section">
          <div className="help-item" data-name="Container">
            <span className="help-icon">❓</span>
            <span className="help-text">Need Help?</span>
          </div>
        </div>

        {/* Phone Section */}
        <div className="phone-section" data-name="Secondary Action Section">
          <div className="phone-item" data-name="Container">
            <span className="phone-text">Call +1 (800)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EndNavBar;
