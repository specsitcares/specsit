import React, { useState } from 'react';
import '../../../styles/location-modal.css';

const CloseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.3995 22.6538L9.3457 21.6L14.9457 16L9.3457 10.4L10.3995 9.34619L15.9995 14.9462L21.5995 9.34619L22.6533 10.4L17.0533 16L22.6533 21.6L21.5995 22.6538L15.9995 17.0538L10.3995 22.6538Z" fill="#71717A"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.2 14.45C12.5472 14.45 14.45 12.5472 14.45 10.2C14.45 7.85279 12.5472 5.95 10.2 5.95C7.85279 5.95 5.95 7.85279 5.95 10.2C5.95 12.5472 7.85279 14.45 10.2 14.45ZM10.2 16.15C6.91386 16.15 4.25 13.4861 4.25 10.2C4.25 6.91386 6.91386 4.25 10.2 4.25C13.4861 4.25 16.15 6.91386 16.15 10.2C16.15 13.4861 13.4861 16.15 10.2 16.15ZM10.2 2H10.2013M10.2 18.4H10.2013M2 10.2H2.00133M18.4 10.2H18.4013" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin-animation">
    <circle cx="10.5" cy="10.5" r="8" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 20" />
  </svg>
);

const LightningIcon = () => (
  <svg width="8" height="10" viewBox="0 0 8 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 4H4.5V0.5L0.5 6H3.5V9.5L7.5 4Z" fill="#0EA5E9"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L6 6L1 11" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 10.5V9.5C10 8.96957 9.78929 8.46086 9.41421 8.08579C9.03914 7.71071 8.53043 7.5 8 7.5H4C3.46957 7.5 2.96086 7.71071 2.58579 8.08579C2.21071 8.46086 2 8.96957 2 9.5v1M8 3.5C8 4.60457 7.10457 5.5 6 5.5C4.89543 5.5 4 4.60457 4 3.5C4 2.39543 4.89543 1.5 6 1.5C7.10457 1.5 8 2.39543 8 3.5Z" stroke="#040205" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 8.46v1.5a1 1 0 0 1-1.09 1 9.88 9.88 0 0 1-4.33-1.54 9.75 9.75 0 0 1-3-3A9.88 9.88 0 0 1 1 2.09 1 1 0 0 1 2 1h1.5a1 1 0 0 1 1 .85 6.4 6.4 0 0 0 .3 1.25 1 1 0 0 1-.23 1l-.63.64a8 8 0 0 0 3 3l.64-.63a1 1 0 0 1 1-.23 6.4 6.4 0 0 0 1.25.3 1 1 0 0 1 .85 1z" stroke="#040205" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PromoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="12" fill="#EBE3F2"/>
    <path d="M22 14H18V9L10 18H14V23L22 14Z" fill="#68408D"/>
  </svg>
);

const LocationModal = ({ isOpen, onClose, onSelectAddress }) => {
  const [pincode, setPincode] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [pincodeError, setPincodeError] = useState('');

  if (!isOpen) return null;

  // Handle pincode input — only allow digits, max 6
  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    if (pincodeError) setPincodeError('');
  };

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Helper: Extract structured location from Google Geocoding result
  const extractGoogleLocation = (result) => {
    const components = result.address_components || [];
    const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
    
    const locality = get('locality');                        // City (e.g., "Hyderabad")
    const sublocality = get('sublocality_level_1') || get('sublocality'); // Area (e.g., "Secunderabad")
    const district = get('administrative_area_level_2');     // District
    const state = get('administrative_area_level_1');        // State (e.g., "Telangana")
    const postalCode = get('postal_code');                   // Pincode
    const route = get('route');                              // Street/Road
    const neighborhood = get('neighborhood');                // Neighborhood

    // City: prefer locality > sublocality > district
    const city = locality || sublocality || district || 'Unknown';
    
    // Build a readable full address
    const addressParts = [route, neighborhood, sublocality, locality, district, state].filter(Boolean);
    const uniqueParts = [...new Set(addressParts)];
    const fullAddress = uniqueParts.join(', ') || result.formatted_address || '';

    return { city, fullAddress, postalCode, state, district, sublocality };
  };

  // Handle pincode check — Google API primary, India Post fallback
  const handleCheckPincode = async () => {
    if (!pincode.trim()) {
      setPincodeError('Please enter a pincode.');
      return;
    }
    if (pincode.length !== 6) {
      setPincodeError('Please enter a valid 6-digit pincode.');
      return;
    }

    setIsCheckingPincode(true);
    setPincodeError('');

    try {
      let resolved = false;

      // Primary: Google Geocoding API (most accurate)
      if (GOOGLE_API_KEY && GOOGLE_API_KEY !== 'YOUR_API_KEY_HERE') {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}+India&key=${GOOGLE_API_KEY}&language=en`
          );
          const data = await response.json();

          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = extractGoogleLocation(data.results[0]);

            onSelectAddress({
              id: 'pincode-location',
              tag: 'Pincode',
              address: location.fullAddress,
              city: location.city,
              name: '',
              phone: '',
              pincode: pincode,
              isFastDelivery: false,
            });
            resolved = true;
          }
        } catch (googleErr) {
          console.warn('Google Geocoding failed, trying fallback...', googleErr);
        }
      }

      // Fallback: India Post API
      if (!resolved) {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          const data = await response.json();

          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const firstPO = data[0].PostOffice[0];
            const district = firstPO.District || '';
            const state = firstPO.State || '';
            const area = firstPO.Name || '';
            const block = firstPO.Block !== 'NA' ? firstPO.Block : '';
            const city = district || firstPO.Region || state;

            const addressParts = [area, block, district, state].filter(p => p && p !== 'NA');
            const uniqueParts = [...new Set(addressParts)];
            const fullAddress = uniqueParts.join(', ');

            onSelectAddress({
              id: 'pincode-location',
              tag: 'Pincode',
              address: fullAddress,
              city: city,
              name: '',
              phone: '',
              pincode: pincode,
              isFastDelivery: false,
            });
            resolved = true;
          }
        } catch (postErr) {
          console.warn('India Post API fallback also failed:', postErr);
        }
      }

      if (!resolved) {
        setPincodeError('Could not find location for this pincode. Please check and try again.');
      }
    } catch (err) {
      console.error('Pincode lookup failed:', err);
      setPincodeError('Failed to look up pincode. Please check your internet connection.');
    } finally {
      setIsCheckingPincode(false);
    }
  };

  // Support Enter key in pincode input
  const handlePincodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCheckPincode();
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let resolved = false;

        // Primary: Google Geocoding API (most accurate for Indian addresses)
        if (GOOGLE_API_KEY && GOOGLE_API_KEY !== 'YOUR_API_KEY_HERE') {
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=en`
            );
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
              const location = extractGoogleLocation(data.results[0]);

              onSelectAddress({
                id: 'current-location',
                tag: 'Current',
                address: location.fullAddress,
                city: location.city,
                name: '',
                phone: '',
                pincode: location.postalCode,
                isFastDelivery: false,
              });
              resolved = true;
            }
          } catch (googleErr) {
            console.warn('Google reverse geocoding failed, trying fallback...', googleErr);
          }
        }

        // Fallback: BigDataCloud (free, no key, good accuracy)
        if (!resolved) {
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();

            if (data && (data.city || data.locality)) {
              const city = data.city || data.locality || data.principalSubdivision || 'Unknown';
              const locality = data.locality || '';
              const state = data.principalSubdivision || '';
              const postcode = data.postcode || '';

              const addressParts = [locality, city, state].filter(Boolean);
              const uniqueParts = [...new Set(addressParts)];
              const fullAddress = uniqueParts.join(', ');

              onSelectAddress({
                id: 'current-location',
                tag: 'Current',
                address: fullAddress,
                city: city,
                name: '',
                phone: '',
                pincode: postcode,
                isFastDelivery: false,
              });
              resolved = true;
            }
          } catch (bdcErr) {
            console.warn('BigDataCloud failed, trying Nominatim...', bdcErr);
          }
        }

        // Last resort: Nominatim
        if (!resolved) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=14`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data && data.address) {
              const addr = data.address;
              const city = addr.city || addr.state_district || addr.town || addr.county || addr.village || 'Unknown';
              const suburb = addr.suburb || addr.neighbourhood || '';
              const state = addr.state || '';
              const postcode = addr.postcode || '';

              const addressParts = [suburb, city, state].filter(Boolean);
              const uniqueParts = [...new Set(addressParts)];
              const fullAddress = uniqueParts.join(', ');

              onSelectAddress({
                id: 'current-location',
                tag: 'Current',
                address: fullAddress || data.display_name,
                city: city,
                name: '',
                phone: '',
                pincode: postcode,
                isFastDelivery: false,
              });
              resolved = true;
            }
          } catch (nomErr) {
            console.warn('Nominatim also failed:', nomErr);
          }
        }

        if (!resolved) {
          setLocationError('Could not determine your address. Please try pincode instead.');
        }
        setIsDetectingLocation(false);
      },
      (error) => {
        setIsDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please allow location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('An unknown error occurred while detecting location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const savedAddresses = [
    {
      id: 1,
      tag: 'Home',
      address: '12-118, Jangam Gally, Mudhole, Mudhole mandal, Nirmal district',
      city: 'Mudhole',
      name: 'Ragini Patil',
      phone: '9100951504',
      isFastDelivery: true
    },
    {
      id: 2,
      tag: 'Work',
      address: 'Presidency Avenue, High Tension Road, Alwal',
      city: 'Secunderabad',
      name: 'Ragini Patil',
      phone: '9100951504',
      isFastDelivery: false
    }
  ];

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal-content" onClick={e => e.stopPropagation()}>
        <div className="location-modal-header">
          <h2>Select Delivery Location</h2>
          <button className="close-button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="location-modal-body">
          <div className="pincode-search-container">
            <div className="pincode-input-wrapper">
              <input 
                type="text" 
                inputMode="numeric"
                className={`pincode-input ${pincodeError ? 'pincode-input-error' : ''}`}
                placeholder="Enter pincode"
                value={pincode}
                onChange={handlePincodeChange}
                onKeyDown={handlePincodeKeyDown}
                maxLength={6}
              />
            </div>
            <button 
              className="check-button"
              onClick={handleCheckPincode}
              disabled={isCheckingPincode}
            >
              {isCheckingPincode ? 'Checking...' : 'Check'}
            </button>
          </div>
          {pincodeError && (
            <p className="location-error-msg" style={{ marginTop: '-20px' }}>{pincodeError}</p>
          )}

          <button 
            className="current-location-btn"
            onClick={handleUseCurrentLocation}
            disabled={isDetectingLocation}
          >
            {isDetectingLocation ? <SpinnerIcon /> : <LocationIcon />}
            <span>
              {isDetectingLocation ? 'Detecting your location...' : 'Use your current location'}
            </span>
          </button>
          {locationError && (
            <p className="location-error-msg">{locationError}</p>
          )}

          <div className="saved-addresses-section">
            <h3 className="section-title">Use Saved Address</h3>
            <div className="address-list">
              {savedAddresses.map(addr => (
                <div 
                  key={addr.id} 
                  className="address-card"
                  onClick={() => onSelectAddress(addr)}
                >
                  <div className="address-card-header">
                    <div className="tags-container">
                      <span className={`tag ${addr.tag === 'Home' ? 'tag-home' : 'tag-work'}`}>
                        {addr.tag}
                      </span>
                      {addr.isFastDelivery && (
                        <div className="delivery-badge">
                          <LightningIcon />
                          <span>1-2 HR DELIVERY</span>
                        </div>
                      )}
                    </div>
                    <ArrowRightIcon />
                  </div>
                  <p className="address-text">{addr.address}</p>
                  <p className="address-subtext">{addr.city}</p>
                  <div className="address-footer">
                    <div className="contact-info">
                      <div className="contact-item">
                        <UserIcon />
                        <span>{addr.name}</span>
                      </div>
                      <span className="contact-divider">|</span>
                      <div className="contact-item">
                        <PhoneIcon />
                        <span>{addr.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-promotion-footer">
          <PromoIcon />
          <p className="promotion-text">
            Get lightning fast delivery in{' '}
            <strong className="promotion-highlight">1–2 hours</strong>
            {' '}for selected location in Hyderabad.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
