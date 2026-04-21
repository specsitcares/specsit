import React, { useState } from 'react';
import { MapPin, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { checkDelivery } from '../../../services/deliveryService';

/**
 * Pincode delivery check widget for the Product Detail page.
 * Keeps all delivery-check state local — no prop drilling needed.
 */
const PincodeDeliveryCheck = ({ productId, sellerId }) => {
  const [pincode, setPincode]               = useState('');
  const [confirmed, setConfirmed]           = useState('');   // pincode that was checked
  const [checkState, setCheckState]         = useState('idle'); // idle | loading | fast | standard | unavailable | error
  const [result, setResult]                 = useState(null);
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    if (validationError) setValidationError('');
  };

  const handleCheck = async () => {
    if (!pincode)            { setValidationError('Please enter a pincode.'); return; }
    if (pincode.length !== 6){ setValidationError('Please enter a valid 6-digit pincode.'); return; }

    setCheckState('loading');
    setValidationError('');

    try {
      const data = await checkDelivery({ productId, sellerId, pincode });

      if (data.error === 'not_serviceable') {
        setCheckState('unavailable');
        setConfirmed(pincode);
        setResult(null);
      } else {
        setResult(data);
        setConfirmed(pincode);
        setCheckState(data.canDeliverIn1or2Hours ? 'fast' : 'standard');
      }
    } catch {
      setCheckState('error');
    }
  };

  const handleReset = () => {
    setPincode('');
    setConfirmed('');
    setResult(null);
    setCheckState('idle');
    setValidationError('');
  };

  const showInput = checkState === 'idle' || checkState === 'loading';

  return (
    <div className="pd-delivery-details">
      <label className="pd-section-label">Delivery Details</label>

      {/* ── Input row or confirmed-pincode row ── */}
      {showInput ? (
        <div className="pd-pincode-group">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter pincode"
            className={`pd-pincode-input${validationError ? ' pd-pincode-input--error' : ''}`}
            value={pincode}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            maxLength={6}
          />
          <button
            className="pd-pincode-btn"
            onClick={handleCheck}
            disabled={checkState === 'loading'}
          >
            {checkState === 'loading' ? 'Checking…' : 'Check'}
          </button>
        </div>
      ) : (
        <div className="pd-pincode-confirmed">
          <span>Checking for: <strong>{confirmed}</strong></span>
          <button className="pd-pincode-change-btn" onClick={handleReset}>Change</button>
        </div>
      )}

      {/* Inline validation error */}
      {validationError && (
        <p className="pd-delivery-msg pd-delivery-msg--error">{validationError}</p>
      )}

      {/* ── Result states ── */}
      {checkState === 'fast' && result && (
        <div className="pd-delivery-result pd-delivery-result--fast">
          <CheckCircle size={18} />
          <div>
            <strong>Delivered in 1–2 hours</strong>
            <span>{result.message}</span>
          </div>
        </div>
      )}

      {checkState === 'standard' && result && (
        <div className="pd-delivery-result pd-delivery-result--standard">
          <Package size={18} />
          <div>
            <strong>{result.message}</strong>
            <span>{result.estimatedDeliveryTime}</span>
          </div>
        </div>
      )}

      {checkState === 'unavailable' && (
        <div className="pd-delivery-result pd-delivery-result--unavailable">
          <AlertCircle size={18} />
          <span>We don't deliver to this area yet.</span>
        </div>
      )}

      {checkState === 'error' && (
        <div className="pd-delivery-result pd-delivery-result--unavailable">
          <AlertCircle size={18} />
          <span>Unable to check delivery. Please try again.</span>
        </div>
      )}

      {/* ── Default info banner (shown only before any check) ── */}
      {checkState === 'idle' && (
        <div className="pd-delivery-info-banner">
          <div className="pd-banner-content">
            <strong>Check delivery details</strong>
            <span>Express delivery might be applicable</span>
          </div>
          <div className="pd-banner-icon-box">
            <MapPin size={18} color="#0D9488" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PincodeDeliveryCheck;
