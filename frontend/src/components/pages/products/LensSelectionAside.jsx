import React, { useState, useRef, useEffect, useCallback } from 'react';
import './LensSelectionAside.css';
import apiClient from '../../../services/api';

/* ════════════════════════════════════════════════════════
   ICONS
   ════════════════════════════════════════════════════════ */
const IconWithPower = () => (
    <svg width="21" height="14" viewBox="0 0 21 14" fill="none">
        <ellipse cx="10.5" cy="7" rx="9.5" ry="6" stroke="#68408D" strokeWidth="1.3"/>
        <circle cx="10.5" cy="7" r="2.5" stroke="#68408D" strokeWidth="1.3"/>
        <line x1="1" y1="7" x2="4" y2="7" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="17" y1="7" x2="20" y2="7" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
);
const IconZeroPower = () => (
    <svg width="17" height="18" viewBox="0 0 17 18" fill="none">
        <rect x="1" y="1" width="15" height="13" rx="2" stroke="#71717A" strokeWidth="1.3"/>
        <path d="M5 17H12" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M8.5 14V17" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="8.5" cy="7.5" r="2" stroke="#71717A" strokeWidth="1.1"/>
    </svg>
);
const IconProgressive = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M2 7C2 4.79 3.79 3 6 3H14C16.21 3 18 4.79 18 7V9C18 11.21 16.21 13 14 13H6C3.79 13 2 11.21 2 9V7Z" stroke="#71717A" strokeWidth="1.3"/>
        <line x1="2" y1="10" x2="18" y2="10" stroke="#71717A" strokeWidth="1" strokeDasharray="2 2"/>
        <path d="M5 17L15 17" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
);
const IconFrameOnly = () => (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
        <path d="M1 4H4L5 1H9L10 4H11L12 1H16L17 4H19V10C19 11.1 18.1 12 17 12H12C10.9 12 10 11.1 10 10V8H10C10 9.1 9.1 10 8 10H3C1.9 10 1 9.1 1 8V4Z" stroke="#71717A" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
);
const ChevronRight = () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
        <path d="M1 1L6 6L1 11" stroke="#040205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ChevronLeft = () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
        <path d="M6 1L1 6L6 11" stroke="#040205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ChevronDown = () => (
    <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
        <path d="M1 1L6 6L11 1" stroke="#040205" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const PlusIcon = () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 1V12M1 6.5H12" stroke="#71717A" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
);
const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1L13 13M13 1L1 13" stroke="#040205" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);
const WarrantyIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4.5" stroke="#0D9488" strokeWidth="0.8"/>
        <path d="M3 5L4.5 6.5L7 3.5" stroke="#0D9488" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconPrescriptionDoc = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="13" height="17" rx="2" stroke="#68408D" strokeWidth="1.4"/>
        <path d="M8 7H13" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M8 10H13" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M8 13H11" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M12.5 15.5L14.5 17.5M14.5 15.5L12.5 17.5" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
);
const IconUploadPdf = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 15V8M12 8L9.5 10.5M12 8L14.5 10.5" stroke="#68408D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 17H18" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#68408D" strokeWidth="1.3"/>
    </svg>
);
const IconClock = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#68408D" strokeWidth="1.4"/>
        <path d="M12 7V12L15 14" stroke="#68408D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

/* ════════════════════════════════════════════════════════
   PRESCRIPTION VALUE RANGES
   ════════════════════════════════════════════════════════ */
const SPH_VALUES = (() => {
    const vals = [];
    for (let v = -20; v <= 20.01; v += 0.25) {
        vals.push((Math.round(v * 4) / 4).toFixed(2));
    }
    return vals;
})();

const CYL_VALUES = (() => {
    const vals = [];
    for (let v = -6; v <= 0.01; v += 0.25) {
        vals.push((Math.round(v * 4) / 4).toFixed(2));
    }
    return vals;
})();

/* ════════════════════════════════════════════════════════
   STEPPER
   ════════════════════════════════════════════════════════ */
const STEPS = [
    { label: 'Power' },
    { label: 'Lenses' },
    { label: 'Rx' },
];

const Stepper = ({ current }) => (
    <div className="lsa-stepper">
        {STEPS.map((s, i) => (
            <React.Fragment key={i}>
                <div className="lsa-step">
                    <div className={`lsa-step__circle${i < current ? ' lsa-step__circle--done' : i === current ? ' lsa-step__circle--active' : ''}`}>
                        {i < current ? (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L4 7L9 1" stroke="#FEFCFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <span>{i + 1}</span>
                        )}
                    </div>
                    <span className={`lsa-step__label${i === current ? ' lsa-step__label--active' : i < current ? ' lsa-step__label--done' : ''}`}>
                        {s.label}
                    </span>
                </div>
                {i < STEPS.length - 1 && (
                    <div className={`lsa-step__divider${i < current ? ' lsa-step__divider--done' : ''}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

/* ════════════════════════════════════════════════════════
   GROUP LENSES FROM API BY PACKAGE NAME
   ════════════════════════════════════════════════════════ */
const groupLensesByPackage = (lenses) => {
    const map = {};
    lenses.forEach(lens => {
        const pkgName = lens.package_name || 'Other';
        if (!map[pkgName]) {
            map[pkgName] = { id: pkgName, name: pkgName, packages: [] };
        }
        map[pkgName].packages.push(lens);
    });
    return Object.values(map);
};

/* ════════════════════════════════════════════════════════
   LENS PREVIEW — SVG placeholder (no expiring URLs)
   ════════════════════════════════════════════════════════ */
const LensPreview = ({ selected }) => (
    <div className={`lsa-lens-preview${selected ? ' lsa-lens-preview--selected' : ''}`}>
        <svg width="70%" height="70%" viewBox="0 0 80 56" fill="none">
            <ellipse cx="40" cy="28" rx="38" ry="26" fill={selected ? '#EBE3F2' : '#F4F3F5'}/>
            <ellipse cx="40" cy="28" rx="38" ry="26" stroke={selected ? '#68408D' : '#D4D2D6'} strokeWidth="1.5"/>
            {/* AR coating shimmer */}
            <ellipse cx="28" cy="18" rx="12" ry="7" fill="white" fillOpacity="0.35" transform="rotate(-20 28 18)"/>
            <ellipse cx="52" cy="36" rx="8" ry="4" fill="white" fillOpacity="0.2" transform="rotate(-20 52 36)"/>
        </svg>
        <div className="lsa-lens-preview__warranty">
            <WarrantyIcon />
            <span>1 Year Warranty</span>
        </div>
    </div>
);

/* ════════════════════════════════════════════════════════
   LENS PACKAGE CARD
   ════════════════════════════════════════════════════════ */
const LensPackageCard = ({ pkg, selected, onSelect, productBasePrice = 0 }) => {
    const features = Array.isArray(pkg.features) ? pkg.features : [];
    const lensPrice = parseFloat(pkg.price || 0);
    return (
        <button
            className={`lsa-pkg-card${selected ? ' lsa-pkg-card--selected' : ''}`}
            onClick={() => onSelect(pkg.id)}
        >
            <div className="lsa-pkg-card__inner">
                <LensPreview selected={selected} />
                <div className="lsa-pkg-card__info">
                    <h4 className="lsa-pkg-card__name">{pkg.name}</h4>
                    {pkg.description && (
                        <p style={{ fontSize: 11, color: '#71717a', margin: '2px 0 4px' }}>{pkg.description}</p>
                    )}
                    {features.length > 0 && (
                        <ul className="lsa-pkg-card__features">
                            {features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    )}
                    <div className="lsa-pkg-card__price-row">
                        <div className="lsa-pkg-card__price-stack">
                            <span className="lsa-pkg-card__label">Lens Price</span>
                            <div className="lsa-pkg-card__prices">
                                <span className="lsa-pkg-card__price">₹{lensPrice.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className={`lsa-pkg-card__chevron${selected ? ' lsa-pkg-card__chevron--selected' : ''}`}>
                            <ChevronRight />
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

/* ════════════════════════════════════════════════════════
   BRAND ACCORDION
   ════════════════════════════════════════════════════════ */
const BrandAccordion = ({ brand, isOpen, onToggle, selectedLens, onSelectLens, productBasePrice }) => (
    <div className={`lsa-brand${isOpen ? ' lsa-brand--open' : ''}`}>
        <button className="lsa-brand__header" onClick={onToggle}>
            <div className="lsa-brand__header-left">
                <div className="lsa-brand__logo" style={{ background: '#EBE3F2', color: '#68408D' }}>
                    {(brand.name || '').slice(0, 2).toUpperCase()}
                </div>
                <div className="lsa-brand__meta">
                    <span className="lsa-brand__name">{brand.name}</span>
                    <span className="lsa-brand__tagline">{brand.packages.length} option{brand.packages.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <span className="lsa-brand__toggle-icon">
                {isOpen ? <ChevronDown /> : <PlusIcon />}
            </span>
        </button>

        {isOpen && (
            <div className="lsa-brand__body">
                {brand.packages.map(pkg => (
                    <LensPackageCard
                        key={pkg.id}
                        pkg={pkg}
                        selected={selectedLens === pkg.id}
                        onSelect={onSelectLens}
                        productBasePrice={productBasePrice}
                    />
                ))}
            </div>
        )}
    </div>
);

/* ════════════════════════════════════════════════════════
   STEP 1 — Power Type
   ════════════════════════════════════════════════════════ */
const POWER_OPTIONS = [
    { id: 'with_power',  icon: <IconWithPower />,  iconBg: 'purple', title: 'With Power',            subtitle: 'Positive, Negative or Cylindrical', badge: 'Popular' },
    { id: 'zero_power',  icon: <IconZeroPower />,  iconBg: 'grey',   title: 'Zero Power',            subtitle: 'BLU Screen lenses, blue light block' },
    { id: 'progressive', icon: <IconProgressive />, iconBg: 'grey',  title: 'Progressive / Bifocals', subtitle: 'Two powers in one eye' },
    { id: 'frame_only',  icon: <IconFrameOnly />,  iconBg: 'grey',   title: 'Frame Only',            subtitle: 'With no lenses' },
];

const StepPower = ({ selected, onSelect }) => (
    <div className="lsa-body">
        <h2 className="lsa-heading">Select your Power Type</h2>
        <div className="lsa-options">
            {POWER_OPTIONS.map(opt => (
                <button
                    key={opt.id}
                    className={`lsa-option${selected === opt.id ? ' lsa-option--selected' : ''}`}
                    onClick={() => onSelect(opt.id)}
                >
                    <div className="lsa-option__left">
                        <div className={`lsa-option__icon lsa-option__icon--${opt.iconBg}`}>{opt.icon}</div>
                        <div className="lsa-option__text">
                            <div className="lsa-option__title-row">
                                <span className="lsa-option__title">{opt.title}</span>
                                {opt.badge && <span className="lsa-option__badge">{opt.badge}</span>}
                            </div>
                            <span className="lsa-option__subtitle">{opt.subtitle}</span>
                        </div>
                    </div>
                    <div className={`lsa-option__chevron${selected === opt.id ? ' lsa-option__chevron--selected' : ''}`}>
                        <ChevronRight />
                    </div>
                </button>
            ))}
        </div>
    </div>
);

/* ════════════════════════════════════════════════════════
   STEP 2 — Lens Type (Accordion)
   ════════════════════════════════════════════════════════ */
const StepLenses = ({ selectedLens, onSelectLens, productBasePrice, lensGroups, lensesLoading }) => {
    const [openBrand, setOpenBrand] = useState(null);

    useEffect(() => {
        if (lensGroups.length > 0 && openBrand === null) {
            setOpenBrand(lensGroups[0].id);
        }
    }, [lensGroups]);

    const toggleBrand = (brandId) => {
        setOpenBrand(prev => prev === brandId ? null : brandId);
    };

    if (lensesLoading) {
        return (
            <div className="lsa-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <div style={{ textAlign: 'center', color: '#71717a', fontSize: 13 }}>Loading lenses…</div>
            </div>
        );
    }

    if (lensGroups.length === 0) {
        return (
            <div className="lsa-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <div style={{ textAlign: 'center', color: '#71717a', fontSize: 13 }}>No lenses available.</div>
            </div>
        );
    }

    return (
        <div className="lsa-body lsa-body--lenses">
            <h2 className="lsa-heading">Select your Lens Type</h2>
            <div className="lsa-brands">
                {lensGroups.map(brand => (
                    <BrandAccordion
                        key={brand.id}
                        brand={brand}
                        isOpen={openBrand === brand.id}
                        onToggle={() => toggleBrand(brand.id)}
                        selectedLens={selectedLens}
                        onSelectLens={onSelectLens}
                        productBasePrice={productBasePrice}
                    />
                ))}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   PD MEASURE MODAL — inline camera + AI measurement
   ════════════════════════════════════════════════════════ */
const PDMeasureModal = ({ onClose, onPdMeasured }) => {
    const videoRef   = useRef(null);
    const canvasRef  = useRef(null);
    const streamRef  = useRef(null);

    const [capturedImage, setCapturedImage] = useState(null);
    const [measuring,     setMeasuring]     = useState(false);
    const [result,        setResult]        = useState(null);
    const [error,         setError]         = useState(null);
    const [camReady,      setCamReady]      = useState(false);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            const ms = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });
            streamRef.current = ms;
            if (videoRef.current) {
                videoRef.current.srcObject = ms;
                videoRef.current.onloadedmetadata = () => setCamReady(true);
            }
        } catch {
            setError('Camera access denied. Please allow camera permissions and try again.');
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width  = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
    };

    const dataURLToBlob = (dataURL) => {
        const [header, data] = dataURL.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const bstr = atob(data);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        return new Blob([u8arr], { type: mime });
    };

    const measurePD = async () => {
        if (!capturedImage) return;
        setMeasuring(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('image', dataURLToBlob(capturedImage), 'face.jpg');
            const token = localStorage.getItem('token');
            const res = await fetch('/api/measure-pd/', {
                method: 'POST',
                headers: token ? { Authorization: `Token ${token}` } : {},
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.details || err.error || `Server error ${res.status}`);
            }
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setMeasuring(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
        setResult(null);
        setError(null);
        setCamReady(false);
        startCamera();
    };

    const usePD = () => {
        onPdMeasured(String(result.pd_mm));
        stopCamera();
        onClose();
    };

    const confidenceColor = { high: '#16a34a', medium: '#d97706', low: '#dc2626' };
    const conf = result?.confidence || 'low';

    return (
        <div className="lsa-pd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="lsa-pd-modal">

                {/* Header */}
                <div className="lsa-pd-modal__header">
                    <div className="lsa-pd-modal__header-left">
                        <div className="lsa-pd-modal__icon">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="7.5" stroke="#68408D" strokeWidth="1.3"/>
                                <circle cx="5" cy="9" r="1.2" fill="#68408D"/>
                                <circle cx="13" cy="9" r="1.2" fill="#68408D"/>
                                <line x1="1.5" y1="9" x2="3.5" y2="9" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round"/>
                                <line x1="14.5" y1="9" x2="16.5" y2="9" stroke="#68408D" strokeWidth="1.3" strokeLinecap="round"/>
                                <line x1="5" y1="9" x2="13" y2="9" stroke="#68408D" strokeWidth="1" strokeDasharray="1.5 1.5"/>
                            </svg>
                        </div>
                        <div>
                            <p className="lsa-pd-modal__label">AI Measurement</p>
                            <p className="lsa-pd-modal__title">Measure Your PD</p>
                        </div>
                    </div>
                    <button className="lsa-pd-modal__close" onClick={onClose} aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>

                {/* Instruction */}
                <p className="lsa-pd-modal__tip">
                    Position your face in the camera, ensure good lighting, then capture and measure.
                </p>

                {/* Camera / preview */}
                <div className="lsa-pd-modal__preview">
                    {!capturedImage ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="lsa-pd-modal__video" />
                            {!camReady && (
                                <div className="lsa-pd-modal__cam-loading">
                                    <div className="lsa-pd-modal__spinner" />
                                    <span>Starting camera…</span>
                                </div>
                            )}
                            {/* face guide oval */}
                            <div className="lsa-pd-modal__oval" />
                        </>
                    ) : (
                        <img src={capturedImage} alt="Captured" className="lsa-pd-modal__video" />
                    )}
                    {measuring && (
                        <div className="lsa-pd-modal__cam-loading">
                            <div className="lsa-pd-modal__spinner" />
                            <span>Measuring PD…</span>
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {/* Result card */}
                {result && (
                    <div className="lsa-pd-modal__result" style={{ borderColor: confidenceColor[conf] }}>
                        <div className="lsa-pd-modal__result-pd" style={{ color: confidenceColor[conf] }}>
                            {result.pd_mm} <span>mm</span>
                        </div>
                        <div className="lsa-pd-modal__result-meta">
                            <span>Confidence: <strong style={{ color: confidenceColor[conf] }}>{conf}</strong></span>
                            <span>Range: {result.range?.min}–{result.range?.max} mm</span>
                        </div>
                        {conf === 'low' && (
                            <p className="lsa-pd-modal__result-warn">
                                Low confidence — try retaking with better lighting.
                            </p>
                        )}
                    </div>
                )}

                {error && <p className="lsa-pd-modal__error">{error}</p>}

                {/* Actions */}
                <div className="lsa-pd-modal__actions">
                    {!capturedImage ? (
                        <button
                            className="lsa-pd-modal__btn lsa-pd-modal__btn--primary"
                            onClick={capturePhoto}
                            disabled={!camReady || !!error}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="3" stroke="#FEFCFF" strokeWidth="1.4"/>
                                <path d="M1 5V3C1 2 2 1 3 1H5" stroke="#FEFCFF" strokeWidth="1.3" strokeLinecap="round"/>
                                <path d="M9 1H11C12 1 13 2 13 3V5" stroke="#FEFCFF" strokeWidth="1.3" strokeLinecap="round"/>
                                <path d="M1 9V11C1 12 2 13 3 13H5" stroke="#FEFCFF" strokeWidth="1.3" strokeLinecap="round"/>
                                <path d="M9 13H11C12 13 13 12 13 11V9" stroke="#FEFCFF" strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                            Capture Photo
                        </button>
                    ) : result ? (
                        <>
                            <button className="lsa-pd-modal__btn lsa-pd-modal__btn--ghost" onClick={retake}>
                                Retake
                            </button>
                            <button className="lsa-pd-modal__btn lsa-pd-modal__btn--primary" onClick={usePD}>
                                Use {result.pd_mm} mm
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="lsa-pd-modal__btn lsa-pd-modal__btn--ghost" onClick={retake}>
                                Retake
                            </button>
                            <button
                                className="lsa-pd-modal__btn lsa-pd-modal__btn--primary"
                                onClick={measurePD}
                                disabled={measuring}
                            >
                                {measuring ? 'Measuring…' : 'Measure with AI'}
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   MANUAL POWER FORM — Figma 401:16362
   ════════════════════════════════════════════════════════ */
const ManualPowerForm = ({ rx, onRxChange, rxMeta, onMetaChange, powerType }) => {
    const { samePower, hasCyl, name, phone, pd } = rxMeta;
    const [showPdModal, setShowPdModal] = useState(false);

    const handlePowerChange = (eye, field, value) => {
        onRxChange(eye, field, value);
        if (samePower) {
            const otherEye = eye === 'od' ? 'os' : 'od';
            onRxChange(otherEye, field, value);
        }
    };

    const rows = samePower
        ? [{ key: 'od', label: 'BOTH', sub: null }]
        : [
            { key: 'os', label: 'LEFT', sub: '(OS)' },
            { key: 'od', label: 'RIGHT', sub: '(OD)' },
        ];

    return (
        <div className="lsa-manual-form">
            {/* Sub-heading */}
            <div className="lsa-manual-header">
                <h3 className="lsa-manual-title">Enter Power Manually</h3>
                <p className="lsa-manual-sub">Please provide your latest prescription details accurately.</p>
            </div>

            {/* Checkboxes */}
            <div className="lsa-manual-toggles">
                <label className="lsa-manual-checkbox">
                    <input
                        type="checkbox"
                        className="lsa-manual-checkbox__native"
                        checked={samePower}
                        onChange={e => onMetaChange('samePower', e.target.checked)}
                    />
                    <span className={`lsa-manual-checkbox__box${samePower ? ' lsa-manual-checkbox__box--checked' : ''}`}>
                        {samePower && (
                            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                                <path d="M1 4L4 7L10 1" stroke="#FEFCFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </span>
                    <span className="lsa-manual-checkbox__label">I have same power for both eyes</span>
                </label>
                <label className="lsa-manual-checkbox">
                    <input
                        type="checkbox"
                        className="lsa-manual-checkbox__native"
                        checked={hasCyl}
                        onChange={e => onMetaChange('hasCyl', e.target.checked)}
                    />
                    <span className={`lsa-manual-checkbox__box${hasCyl ? ' lsa-manual-checkbox__box--checked' : ''}`}>
                        {hasCyl && (
                            <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                                <path d="M1 4L4 7L10 1" stroke="#FEFCFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </span>
                    <span className="lsa-manual-checkbox__label">I have cylindrical power</span>
                </label>
            </div>

            {/* Power Grid */}
            <div className="lsa-power-grid">
                {/* Header row */}
                <div className="lsa-power-grid__header">
                    <div className="lsa-power-grid__hcell lsa-power-grid__hcell--eye">EYE</div>
                    <div className="lsa-power-grid__hcell">SPH</div>
                    {hasCyl && <div className="lsa-power-grid__hcell">CYL</div>}
                    <div className="lsa-power-grid__hcell lsa-power-grid__hcell--axis">AXIS</div>
                </div>

                {/* Data rows */}
                {rows.map((row, idx) => (
                    <div key={row.key} className={`lsa-power-grid__row${idx > 0 ? ' lsa-power-grid__row--border' : ''}`}>
                        <div className="lsa-power-grid__eye">
                            <span className="lsa-power-grid__eye-main">{row.label}</span>
                            {row.sub && <span className="lsa-power-grid__eye-sub">{row.sub}</span>}
                        </div>
                        <div className="lsa-power-grid__cell">
                            <select
                                className="lsa-power-grid__select"
                                value={rx[row.key]?.sph || ''}
                                onChange={e => handlePowerChange(row.key, 'sph', e.target.value)}
                            >
                                <option value="">—</option>
                                {SPH_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {hasCyl && (
                            <div className="lsa-power-grid__cell">
                                <select
                                    className="lsa-power-grid__select"
                                    value={rx[row.key]?.cyl || ''}
                                    onChange={e => handlePowerChange(row.key, 'cyl', e.target.value)}
                                >
                                    <option value="">—</option>
                                    {CYL_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="lsa-power-grid__cell lsa-power-grid__cell--axis">
                            <input
                                type="number"
                                min="0"
                                max="180"
                                step="1"
                                placeholder="0"
                                className="lsa-power-grid__axis-input"
                                value={rx[row.key]?.axis || ''}
                                onChange={e => handlePowerChange(row.key, 'axis', e.target.value)}
                            />
                        </div>
                    </div>
                ))}

                {/* PD (Pupillary Distance) row */}
                <div className="lsa-power-grid__pd-row">
                    <div className="lsa-power-grid__pd-left">
                        <span className="lsa-power-grid__pd-label">PD</span>
                        <span className="lsa-power-grid__pd-hint">Pupillary Distance</span>
                    </div>
                    <div className="lsa-power-grid__pd-input-wrap">
                        <input
                            type="number"
                            min="50"
                            max="80"
                            step="0.5"
                            placeholder="e.g. 63"
                            className="lsa-power-grid__axis-input lsa-power-grid__pd-input"
                            value={pd}
                            onChange={e => onMetaChange('pd', e.target.value)}
                        />
                        <span className="lsa-power-grid__pd-unit">mm</span>
                    </div>
                    <button
                        type="button"
                        className="lsa-power-grid__pd-measure-btn"
                        onClick={() => setShowPdModal(true)}
                        title="Measure PD with AI camera"
                    >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <circle cx="6.5" cy="6.5" r="5.5" stroke="#68408D" strokeWidth="1.2"/>
                            <circle cx="3.5" cy="6.5" r="0.9" fill="#68408D"/>
                            <circle cx="9.5" cy="6.5" r="0.9" fill="#68408D"/>
                            <line x1="0.5" y1="6.5" x2="2.5" y2="6.5" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                            <line x1="10.5" y1="6.5" x2="12.5" y2="6.5" stroke="#68408D" strokeWidth="1.2" strokeLinecap="round"/>
                            <line x1="3.5" y1="6.5" x2="9.5" y2="6.5" stroke="#68408D" strokeWidth="0.9" strokeDasharray="1.2 1.2"/>
                        </svg>
                        {pd ? 'Re-measure' : 'Measure PD'}
                    </button>
                </div>

                {/* PD Measure Modal */}
                {showPdModal && (
                    <PDMeasureModal
                        onClose={() => setShowPdModal(false)}
                        onPdMeasured={val => { onMetaChange('pd', val); setShowPdModal(false); }}
                    />
                )}

            {/* Progressive ADD power row */}
                {powerType === 'progressive' && (
                    <div className="lsa-power-grid__add-row">
                        <span className="lsa-power-grid__add-label">ADD Power</span>
                        <input
                            type="number"
                            step="0.25"
                            min="0.75"
                            max="3.50"
                            placeholder="+0.00"
                            className="lsa-power-grid__axis-input"
                            style={{ width: '80px' }}
                            value={rx.add || ''}
                            onChange={e => onRxChange('add', 'value', e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Identity info */}
            <div className="lsa-manual-identity">
                <div className="lsa-manual-field">
                    <label className="lsa-manual-field__label">WHOSE PRESCRIPTION IS THIS? NAME*</label>
                    <input
                        type="text"
                        placeholder="e.g. John Doe"
                        className="lsa-manual-field__input"
                        value={name}
                        onChange={e => onMetaChange('name', e.target.value)}
                    />
                </div>
                <div className="lsa-manual-field">
                    <label className="lsa-manual-field__label">PHONE NUMBER*</label>
                    <input
                        type="tel"
                        placeholder="+91 00000 00000"
                        className="lsa-manual-field__input"
                        value={phone}
                        onChange={e => onMetaChange('phone', e.target.value)}
                    />
                </div>
            </div>

            {/* Help / call link */}
            <div className="lsa-manual-help">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" stroke="#71717A" strokeWidth="1.2"/>
                    <path d="M9 13V9" stroke="#71717A" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="9" cy="6.5" r="0.75" fill="#71717A"/>
                </svg>
                <span className="lsa-manual-help__text">Can't find your power?</span>
                <a href="tel:+9100000000" className="lsa-manual-help__call">Call +91 00000000</a>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   STEP 3 — Prescription (Rx)
   ════════════════════════════════════════════════════════ */
const RX_OPTIONS = [
    {
        id: 'manual',
        icon: <IconPrescriptionDoc />,
        title: 'Enter Power Manually',
        subtitle: 'Type in your SPH, CYL & AXIS values',
    },
    {
        id: 'upload',
        icon: <IconUploadPdf />,
        title: 'Upload Prescription PDF',
        subtitle: 'Upload your prescription file from doctor',
    },
    {
        id: 'later',
        icon: <IconClock />,
        title: 'Submit Power Later in 15 days',
        subtitle: 'Add now and submit prescription within 15 days',
    },
];

const StepRx = ({ powerType, rx, onRxChange, rxMode, setRxMode, onUpload, uploadedFile, rxMeta, onMetaChange }) => {
    if (powerType === 'zero_power' || powerType === 'frame_only') {
        return (
            <div className="lsa-body">
                <h2 className="lsa-heading">No Prescription Needed</h2>
                <p className="lsa-subheading">
                    {powerType === 'zero_power'
                        ? 'Zero power lenses have no refractive correction.'
                        : 'Frame only — no lenses will be fitted.'}
                </p>
                <div className="lsa-rx-skip-card">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="19" stroke="#EBE3F2" strokeWidth="1.5"/>
                        <path d="M13 20L18 25L27 15" stroke="#68408D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p>You're all set — proceed to add to bag.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lsa-body">
            <h2 className="lsa-heading">Eye Power</h2>

            {/* Help banner */}
            <div className="lsa-rx-help-banner">
                <div className="lsa-rx-help-banner__icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="#22c55e" strokeWidth="1.5"/>
                        <path d="M6 10L9 13L14 7" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <div className="lsa-rx-help-banner__text">
                    <span>Need help with power option?</span>
                    <a href="#" className="lsa-rx-help-banner__link" onClick={e => e.preventDefault()}>Learn more</a>
                </div>
            </div>

            {/* Option cards — shown when no mode selected */}
            {!rxMode && (
                <div className="lsa-rx-options">
                    {RX_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            className="lsa-rx-option-card"
                            onClick={() => setRxMode(opt.id)}
                        >
                            <div className="lsa-rx-option-card__icon">{opt.icon}</div>
                            <div className="lsa-rx-option-card__text">
                                <span className="lsa-rx-option-card__title">{opt.title}</span>
                                <span className="lsa-rx-option-card__subtitle">{opt.subtitle}</span>
                            </div>
                            <ChevronRight />
                        </button>
                    ))}
                </div>
            )}

            {/* Manual entry sub-view */}
            {rxMode === 'manual' && (
                <ManualPowerForm
                    rx={rx}
                    onRxChange={onRxChange}
                    rxMeta={rxMeta}
                    onMetaChange={onMetaChange}
                    powerType={powerType}
                />
            )}

            {/* Upload PDF sub-view */}
            {rxMode === 'upload' && (
                <div className="lsa-rx-upload">
                    <label className={`lsa-rx-upload-area${uploadedFile ? ' lsa-rx-upload-area--done' : ''}`}>
                        <IconUploadPdf />
                        {uploadedFile ? (
                            <>
                                <span className="lsa-rx-upload-area__title lsa-rx-upload-area__title--done">
                                    {uploadedFile.name}
                                </span>
                                <span className="lsa-rx-upload-area__sub">Tap to replace file</span>
                            </>
                        ) : (
                            <>
                                <span className="lsa-rx-upload-area__title">Tap to upload prescription</span>
                                <span className="lsa-rx-upload-area__sub">PDF, JPG or PNG · up to 5 MB</span>
                            </>
                        )}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onUpload} style={{ display: 'none' }} />
                    </label>
                    <div className="lsa-manual-field" style={{ marginTop: 12 }}>
                        <label className="lsa-manual-field__label">WHOSE PRESCRIPTION IS THIS? NAME*</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            className="lsa-manual-field__input"
                            value={rxMeta.name}
                            onChange={e => onMetaChange('name', e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Submit later sub-view */}
            {rxMode === 'later' && (
                <div className="lsa-rx-skip-card" style={{ marginTop: 8 }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="19" stroke="#EBE3F2" strokeWidth="1.5"/>
                        <circle cx="20" cy="20" r="9" stroke="#68408D" strokeWidth="1.4"/>
                        <path d="M20 15V20L23 22" stroke="#68408D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p>We'll remind you to submit your prescription within 15 days of delivery.</p>
                    <button className="lsa-rx-back-link" style={{ marginTop: 4 }} onClick={() => setRxMode(null)}>← Change option</button>
                    <div className="lsa-manual-field" style={{ marginTop: 12 }}>
                        <label className="lsa-manual-field__label">WHOSE PRESCRIPTION IS THIS? NAME*</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            className="lsa-manual-field__input"
                            value={rxMeta.name}
                            onChange={e => onMetaChange('name', e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
const LensSelectionAside = ({ isOpen, onClose, product, onAddToCart }) => {
    const [step, setStep] = useState(0);
    const [powerType, setPowerType] = useState(null);
    const [selectedLensId, setSelectedLensId] = useState(null);
    const [rxMode, setRxMode] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [rxMeta, setRxMeta] = useState({ samePower: false, hasCyl: true, name: '', phone: '', pd: '' });
    const [rx, setRx] = useState({
        od: { sph: '', cyl: '', axis: '' },
        os: { sph: '', cyl: '', axis: '' },
        add: '',
    });

    // Live lens data from API
    const [allLenses, setAllLenses] = useState([]);
    const [lensesLoading, setLensesLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || allLenses.length > 0) return;
        setLensesLoading(true);
        apiClient.get('/catalog/lenses/', { params: { is_active: true } })
            .then(res => {
                const lenses = res.data.results || res.data;
                setAllLenses(Array.isArray(lenses) ? lenses : []);
            })
            .catch(() => setAllLenses([]))
            .finally(() => setLensesLoading(false));
    }, [isOpen]);

    const lensGroups = groupLensesByPackage(allLenses.filter(l => l.is_active !== false));

    const basePrice = parseFloat(product?.base_price ?? 0);

    const handleRxChange = (eye, field, value) => {
        if (eye === 'add') {
            setRx(prev => ({ ...prev, add: value }));
        } else {
            setRx(prev => ({ ...prev, [eye]: { ...prev[eye], [field]: value } }));
        }
    };

    const handleMetaChange = (field, value) => {
        setRxMeta(prev => ({ ...prev, [field]: value }));
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setStep(0); setPowerType(null); setSelectedLensId(null);
            setRxMode(null); setUploadedFile(null);
            setRxMeta({ samePower: false, hasCyl: true, name: '', phone: '', pd: '' });
            setRx({ od: { sph: '', cyl: '', axis: '' }, os: { sph: '', cyl: '', axis: '' }, add: '' });
        }, 300);
    };

    const handleBack = () => {
        if (step === 2 && rxMode !== null) { setRxMode(null); return; }
        if (step === 0) { handleClose(); return; }
        if (step === 2 && powerType === 'frame_only') { setStep(0); return; }
        setStep(s => s - 1);
    };

    const handlePowerSelect = (id) => {
        setPowerType(id);
        if (id === 'frame_only') { setStep(2); return; }
        setStep(1);
    };

    const handleLensSelect = (id) => {
        setSelectedLensId(id);
    };

    const handleAddToCart = () => {
        const lensObj = allLenses.find(l => l.id === selectedLensId) || null;
        const needsRx = powerType === 'with_power' || powerType === 'progressive';
        const prescriptionObj = needsRx && rxMode === 'manual'
            ? { ...rx, pd: rxMeta.pd, name: rxMeta.name, phone: rxMeta.phone }
            : needsRx && (rxMode === 'upload' || rxMode === 'later') && rxMeta.name
            ? { name: rxMeta.name }
            : null;
        const pdfUrl = rxMode === 'upload' && uploadedFile
            ? URL.createObjectURL(uploadedFile)
            : null;
        onAddToCart(product, lensObj, prescriptionObj, pdfUrl, rxMode, uploadedFile);
        handleClose();
    };

    /* CTA config per step */
    const rxReady = powerType === 'zero_power' || powerType === 'frame_only' ||
        (rxMode === 'manual' || rxMode === 'later') ||
        (rxMode === 'upload' && !!uploadedFile);
    const cta = [
        {
            label: 'Continue to Lenses',
            sub: 'NEXT: LENS TYPE SELECTION',
            disabled: !powerType || powerType === 'frame_only',
            action: () => setStep(1),
            style: {},
        },
        {
            label: 'Continue to Prescription',
            sub: 'NEXT: ENTER YOUR POWER',
            disabled: !selectedLensId,
            action: () => setStep(2),
            style: {},
        },
        {
            label: rxMode === 'manual' ? 'SAVE & PROCEED' : 'ADD TO BAG',
            sub: null,
            disabled: !rxReady,
            action: handleAddToCart,
            style: { letterSpacing: '1.4px', fontSize: '11px', borderRadius: '6px', padding: '18px 16px' },
        },
    ][step];

    if (!isOpen) return null;

    return (
        <>
            <div className="lsa-backdrop" onClick={handleClose} />
            <aside className={`lsa-panel${isOpen ? ' lsa-panel--open' : ''}`}>

                {/* Header */}
                <div className="lsa-header">
                    <button className="lsa-header__back" onClick={handleBack}>
                        <ChevronLeft /><span>Back</span>
                    </button>
                    <button className="lsa-header__close" onClick={handleClose} aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>

                {/* Stepper */}
                <div className="lsa-stepper-wrap">
                    <Stepper current={step} />
                </div>

                {/* Scrollable content */}
                <div className="lsa-content">
                    {step === 0 && <StepPower selected={powerType} onSelect={handlePowerSelect} />}
                    {step === 1 && (
                        <StepLenses
                            selectedLens={selectedLensId}
                            onSelectLens={handleLensSelect}
                            productBasePrice={basePrice}
                            lensGroups={lensGroups}
                            lensesLoading={lensesLoading}
                        />
                    )}
                    {step === 2 && (
                        <StepRx
                            powerType={powerType}
                            rx={rx}
                            onRxChange={handleRxChange}
                            rxMode={rxMode}
                            setRxMode={setRxMode}
                            onUpload={e => setUploadedFile(e.target.files[0])}
                            uploadedFile={uploadedFile}
                            rxMeta={rxMeta}
                            onMetaChange={handleMetaChange}
                        />
                    )}
                </div>

                {/* Sticky footer CTA */}
                <div className="lsa-footer">
                    <button
                        className="lsa-footer__cta"
                        style={cta.style}
                        disabled={cta.disabled}
                        onClick={cta.action}
                    >
                        {cta.label}
                    </button>
                    {step === 2 && rxMode === 'manual' ? (
                        <div className="lsa-footer__secondary-actions">
                            <button className="lsa-footer__sec-btn">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="6" stroke="#71717A" strokeWidth="1.2"/>
                                    <path d="M7 10V7" stroke="#71717A" strokeWidth="1.3" strokeLinecap="round"/>
                                    <circle cx="7" cy="5" r="0.65" fill="#71717A"/>
                                </svg>
                                Help
                            </button>
                            <button className="lsa-footer__sec-btn">
                                <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
                                    <path d="M1 1.5H9V11.5L5 9.5L1 11.5V1.5Z" stroke="#71717A" strokeWidth="1.2" strokeLinejoin="round"/>
                                </svg>
                                Save Draft
                            </button>
                        </div>
                    ) : (
                        cta.sub && <p className="lsa-footer__sub">{cta.sub}</p>
                    )}
                </div>
            </aside>
        </>
    );
};

export default LensSelectionAside;
