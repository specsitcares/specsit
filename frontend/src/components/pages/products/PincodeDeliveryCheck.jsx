import React, { useState, useEffect } from 'react';
import { CheckCircle, Package, AlertCircle, X, ChevronRight, User, Phone, Crosshair, MapPin } from 'lucide-react';
import { checkDelivery } from '../../../services/deliveryService';
import apiClient from '../../../services/api';

/**
 * Pincode delivery check widget for the Product Detail page.
 * Clicking the field opens the "Select Delivery Location" modal
 * (pincode entry, current location, and saved addresses).
 */
const PincodeDeliveryCheck = ({ productId, sellerId }) => {
  const [pincode, setPincode]               = useState('');
  const [confirmed, setConfirmed]           = useState('');   // pincode that was checked
  const [checkState, setCheckState]         = useState('idle'); // idle | loading | fast | standard | unavailable | error
  const [result, setResult]                 = useState(null);
  const [validationError, setValidationError] = useState('');

  const [modalOpen, setModalOpen]           = useState(false);
  const [addresses, setAddresses]           = useState([]);
  const [locating, setLocating]             = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null); // saved address chosen in the modal
  const [estimateOnly, setEstimateOnly]     = useState(false);  // result derived from current location (not guaranteed)

  useEffect(() => {
    apiClient.get('/accounts/addresses/')
      .then(r => setAddresses(r.data.results || r.data || []))
      .catch(() => { /* not logged in / no addresses */ });
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    setSelectedAddress(null); // manual entry → not tied to a saved address
    if (validationError) setValidationError('');
  };

  const runCheck = async (code, isEstimate = false) => {
    const pc = (code ?? pincode);
    if (!pc)             { setValidationError('Please enter a pincode.'); return false; }
    if (pc.length !== 6) { setValidationError('Please enter a valid 6-digit pincode.'); return false; }

    setCheckState('loading');
    setEstimateOnly(isEstimate);
    setValidationError('');
    try {
      const data = await checkDelivery({ productId, sellerId, pincode: pc });
      if (data.error === 'not_serviceable') {
        setCheckState('unavailable'); setConfirmed(pc); setResult(null);
      } else {
        setResult(data); setConfirmed(pc);
        setCheckState(data.canDeliverIn1or2Hours ? 'fast' : 'standard');
      }
      return true;
    } catch {
      setCheckState('error');
      return false;
    }
  };

  const handleModalCheck = async () => {
    const ok = await runCheck();
    if (ok) setModalOpen(false);
  };

  const handleSelectAddress = async (addr) => {
    const pc = (addr.pin_code || '').replace(/\D/g, '').slice(0, 6);
    setPincode(pc);
    setSelectedAddress(addr);
    const ok = await runCheck(pc);
    if (ok) setModalOpen(false);
  };

  // Reverse-geocode coordinates to a 6-digit pincode (Nominatim first, BigDataCloud fallback)
  const pincodeFromCoords = async (lat, lon) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`, {
        headers: { Accept: 'application/json' },
      });
      const d = await r.json();
      const pc = (d?.address?.postcode || '').replace(/\D/g, '').slice(0, 6);
      if (pc.length === 6) return pc;
    } catch { /* fall through */ }
    try {
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const d = await r.json();
      const pc = (d?.postcode || '').replace(/\D/g, '').slice(0, 6);
      if (pc.length === 6) return pc;
    } catch { /* fall through */ }
    return '';
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) { setValidationError('Geolocation is not supported on this device.'); return; }
    setLocating(true);
    setValidationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const pc = await pincodeFromCoords(latitude, longitude);
          if (pc.length === 6) {
            setPincode(pc);
            setSelectedAddress(null);
            const ok = await runCheck(pc, true); // location-derived → shown as estimate
            if (ok) setModalOpen(false);
          } else {
            setValidationError('Could not detect your exact pincode. Please enter it manually.');
          }
        } catch {
          setValidationError('Could not fetch your location. Please enter a pincode.');
        } finally {
          setLocating(false);
        }
      },
      () => { setLocating(false); setValidationError('Location permission denied.'); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleReset = () => {
    setPincode('');
    setConfirmed('');
    setResult(null);
    setCheckState('idle');
    setValidationError('');
    setSelectedAddress(null);
  };

  const showInput = checkState === 'idle' || checkState === 'loading';

  return (
    <div className="pd-delivery-details">
      <label className="pd-section-label">Delivery Details</label>

      {/* ── Trigger row (opens the modal) or confirmed-pincode row ── */}
      {showInput ? (
        <div className="pd-pincode-group">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter pincode"
            className="pd-pincode-input"
            value={pincode}
            readOnly
            onClick={() => setModalOpen(true)}
            onFocus={() => setModalOpen(true)}
          />
          <button
            className="pd-pincode-btn"
            onClick={() => (pincode.length === 6 ? runCheck() : setModalOpen(true))}
          >
            Check
          </button>
        </div>
      ) : selectedAddress ? (
        <div className="pd-selected-address">
          <div className="pd-selected-address-info">
            <div className="pd-selected-address-top">
              <span className={`pdloc-tag ${(selectedAddress.title || '').toLowerCase().includes('home') ? 'pdloc-tag--home' : 'pdloc-tag--other'}`}>
                {selectedAddress.title}
              </span>
              <span className="pd-selected-address-pin">{confirmed}</span>
            </div>
            <p className="pd-selected-address-street">{selectedAddress.street_address}</p>
            {(selectedAddress.city || selectedAddress.state) && (
              <p className="pd-selected-address-city">
                {[selectedAddress.city, selectedAddress.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <button className="pd-pincode-change-btn" onClick={() => setModalOpen(true)}>Change</button>
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
      {/* Current-location estimate (not a guaranteed promise) */}
      {estimateOnly && (checkState === 'fast' || checkState === 'standard') && result && (
        <div className="pd-delivery-result pd-delivery-result--estimate">
          <MapPin size={18} />
          <div>
            <strong>Estimated delivery: {result.estimatedDeliveryTime || (checkState === 'fast' ? '1–2 hours' : result.message)}</strong>
            <span>Based on your current location — this is an estimate, not guaranteed.</span>
          </div>
        </div>
      )}

      {!estimateOnly && checkState === 'fast' && result && (
        <div className="pd-delivery-result pd-delivery-result--fast">
          <CheckCircle size={18} />
          <div>
            <strong>Delivered in 1–2 hours</strong>
            <span>{result.message}</span>
          </div>
        </div>
      )}

      {!estimateOnly && checkState === 'standard' && result && (
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

      {/* ── Helper text (shown only before any check) ── */}
      {checkState === 'idle' && (
        <p className="pd-delivery-helper">Check your pincode to see if Blot delivery is available in your area.</p>
      )}

      {/* ── Select Delivery Location modal ── */}
      {modalOpen && (
        <div className="pdloc-overlay" onClick={() => setModalOpen(false)}>
          <div className="pdloc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdloc-header">
              <h2 className="pdloc-title">Select Delivery Location</h2>
              <button className="pdloc-close" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="pdloc-body">
              {/* Pincode search */}
              <div className="pdloc-search">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter pincode"
                  className="pdloc-input"
                  value={pincode}
                  onChange={handleChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleModalCheck()}
                  maxLength={6}
                  autoFocus
                />
                <button className="pdloc-check" onClick={handleModalCheck} disabled={checkState === 'loading'}>
                  {checkState === 'loading' ? 'Checking…' : 'Check'}
                </button>
              </div>

              {validationError && (
                <p className="pd-delivery-msg pd-delivery-msg--error">{validationError}</p>
              )}

              {/* Use current location */}
              <button className="pdloc-current" onClick={handleUseLocation} disabled={locating}>
                <Crosshair size={18} />
                {locating ? 'Locating…' : 'Use your current location'}
              </button>

              {/* Saved addresses */}
              {addresses.length > 0 && (
                <div className="pdloc-saved">
                  <span className="pdloc-saved-label">Use Saved Address</span>
                  <div className="pdloc-addr-list">
                    {addresses.map((a) => {
                      const isHome = (a.title || '').toLowerCase().includes('home');
                      return (
                        <button key={a.id} className="pdloc-addr" onClick={() => handleSelectAddress(a)}>
                          <div className="pdloc-addr-top">
                            <div className="pdloc-tags">
                              <span className={`pdloc-tag ${isHome ? 'pdloc-tag--home' : 'pdloc-tag--other'}`}>{a.title}</span>
                              {a.is_default && (
                                <span className="pdloc-tag-fast">⚡ 1-2 HR DELIVERY</span>
                              )}
                            </div>
                            <ChevronRight size={16} color="#9ca3af" />
                          </div>
                          <div className="pdloc-addr-street">{a.street_address}</div>
                          {a.city && <div className="pdloc-addr-city">{a.city}</div>}
                          <div className="pdloc-addr-foot">
                            <span className="pdloc-addr-meta"><User size={12} /> {a.full_name_contact}</span>
                            {a.phone && (
                              <>
                                <span className="pdloc-sep">|</span>
                                <span className="pdloc-addr-meta"><Phone size={12} /> {a.phone}</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pdloc-footer">
              <span className="pdloc-footer-bolt">⚡</span>
              <p className="pdloc-footer-text">
                Get lightning fast delivery in <strong>1–2 hours</strong> for selected location in Hyderabad.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PincodeDeliveryCheck;
