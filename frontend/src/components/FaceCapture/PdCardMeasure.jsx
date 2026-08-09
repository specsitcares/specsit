import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadFaceLandmarker,
  analyseFrame,
  poseProblems,
  measurePdFromCaptures,
  measurePdFromManualQuad,
  quadEdgeLengths,
  CARD_ASPECT,
  MIN_CARD_LONG_PX,
} from '../../services/faceMeasurement';
import './PdCardMeasure.css';

/*
  Card-reference PD measurement, shared by the lens-selection aside and the
  standalone /capture-face page.

  Three steps:
    guide   — the placement animation; nothing is running yet
    capture — live camera, pose gating, then a 3-frame burst
    review  — the result, with draggable card corners as the fallback

  Accuracy depends on the user holding still with the card flat, so the capture
  step gates on head pose and fires the shutter itself once the gates hold. A
  manual shutter press moves the head at exactly the wrong moment.
*/

const CAPTURE_COUNT = 3;
const CAPTURE_INTERVAL_MS = 130;
// Gates must hold for this many consecutive frames before the countdown starts,
// so a momentary flicker of good pose is not enough.
const STABLE_FRAMES_REQUIRED = 8;
const COUNTDOWN_FROM = 3;
// Frames spent on each countdown digit — about half a second at 60fps, so the
// whole 3-2-1 gives the user time to settle without feeling slow.
const FRAMES_PER_COUNT = 30;

/* ── Placement animation ──────────────────────────────────────────────────
   Inline SVG driven by CSS keyframes: no runtime dependency, follows the theme,
   and honours prefers-reduced-motion (see the stylesheet, which freezes it in
   the final placed position rather than hiding it).                          */
const CardPlacementAnimation = () => (
  <div className="pdc-anim" role="img"
       aria-label="Animation: hold a card flat against your forehead, long edge level, centred above your eyebrows">
    <svg viewBox="0 0 240 190" className="pdc-anim__svg" aria-hidden="true">
      {/* head */}
      <ellipse cx="120" cy="100" rx="52" ry="66" className="pdc-anim__head" />
      {/* ears */}
      <ellipse cx="67" cy="102" rx="7" ry="12" className="pdc-anim__head" />
      <ellipse cx="173" cy="102" rx="7" ry="12" className="pdc-anim__head" />
      {/* brows */}
      <path d="M96 92 q11 -6 22 0" className="pdc-anim__line" />
      <path d="M122 92 q11 -6 22 0" className="pdc-anim__line" />
      {/* eyes — the pupils being measured */}
      <circle cx="107" cy="104" r="5.5" className="pdc-anim__eye" />
      <circle cx="133" cy="104" r="5.5" className="pdc-anim__eye" />
      {/* nose + mouth */}
      <path d="M120 110 v14 q-4 3 -7 3" className="pdc-anim__line" />
      <path d="M110 141 q10 6 20 0" className="pdc-anim__line" />

      {/* target outline on the forehead — where the card is going */}
      <rect x="82" y="56" width="76" height="48" rx="4" className="pdc-anim__target" />

      {/* the card itself */}
      <g className="pdc-anim__card">
        <rect x="82" y="56" width="76" height="48" rx="4" className="pdc-anim__card-body" />
        <rect x="88" y="64" width="22" height="15" rx="2" className="pdc-anim__card-chip" />
        <rect x="88" y="88" width="46" height="4" rx="2" className="pdc-anim__card-stripe" />
        <rect x="138" y="86" width="14" height="8" rx="1.5" className="pdc-anim__card-stripe" />
      </g>

      {/* the 85.6mm ruler, drawn once the card has landed */}
      <g className="pdc-anim__ruler">
        <line x1="82" y1="49" x2="158" y2="49" className="pdc-anim__ruler-line" />
        <line x1="82" y1="45" x2="82" y2="53" className="pdc-anim__ruler-line" />
        <line x1="158" y1="45" x2="158" y2="53" className="pdc-anim__ruler-line" />
        <text x="120" y="40" className="pdc-anim__ruler-text">85.6 mm</text>
      </g>

      {/* pupil-to-pupil measurement, drawn last */}
      <g className="pdc-anim__pd">
        <line x1="107" y1="104" x2="133" y2="104" className="pdc-anim__pd-line" />
        <text x="120" y="168" className="pdc-anim__pd-text">your PD</text>
      </g>
    </svg>
  </div>
);

const STEP_HINTS = [
  'Any bank card, Aadhaar, PAN or driving licence — they are all exactly the same size.',
  'Press it flat on your forehead, just above your eyebrows.',
  'Keep the long edge level and do not cover your eyebrows.',
  'Hold the phone at arm’s length and look straight at the lens.',
];

const PdCardMeasure = ({ onMeasured, onClose, compact = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  // Live values the render loop writes to without forcing a re-render each frame.
  const latestFrameRef = useRef(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false);
  const reviewRef = useRef(null);
  const dragRef = useRef(null);

  const [step, setStep] = useState('guide');
  const [camReady, setCamReady] = useState(false);
  const [hints, setHints] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [review, setReview] = useState(null);      // { dataUrl, frame, quad } for manual corners
  const [manualMode, setManualMode] = useState(false);

  /* ── Camera lifecycle ── */
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCamReady(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  /* ── One captured frame: pixels plus the landmarks from this same tick ── */
  const grabFrame = useCallback((frame) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), frame };
  }, []);

  const runMeasurement = useCallback(async (captures) => {
    setBusy(true);
    setError(null);
    try {
      const measured = await measurePdFromCaptures(captures);
      setResult(measured);
      setReview({ ...captures[0], quad: null });
      setStep('review');
    } catch (err) {
      // Card not found is the expected path into manual corner placement, not a
      // failure the user should have to interpret.
      const first = captures[0];
      setReview({ ...first, quad: defaultQuad(first.frame) });
      setManualMode(true);
      setStep('review');
      setError(
        err.needsManualCorners
          ? 'Could not find the card automatically — drag the four corners onto it.'
          : err.message
      );
    } finally {
      setBusy(false);
      capturingRef.current = false;
      setCountdown(null);
    }
  }, []);

  /* ── Burst capture, fired by the gate loop ── */
  const captureBurst = useCallback(async () => {
    const captures = [];
    for (let i = 0; i < CAPTURE_COUNT; i += 1) {
      const frame = latestFrameRef.current;
      if (frame) {
        const capture = grabFrame(frame);
        if (capture) captures.push(capture);
      }
      if (i < CAPTURE_COUNT - 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, CAPTURE_INTERVAL_MS));
      }
    }
    stopCamera();
    if (!captures.length) {
      setError('Could not read the camera frame. Please try again.');
      capturingRef.current = false;
      setCountdown(null);
      return;
    }
    await runMeasurement(captures);
  }, [grabFrame, runMeasurement, stopCamera]);

  /* ── The live loop: analyse, gate, guide, then auto-fire ── */
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2 || capturingRef.current) return;

    let frame = null;
    try {
      frame = analyseFrame(landmarker, video, video.videoWidth, video.videoHeight);
    } catch {
      return;                                  // transient WASM hiccup; next frame
    }

    if (!frame) {
      latestFrameRef.current = null;
      stableCountRef.current = 0;
      setHints(['Position your face in the frame']);
      setCountdown(null);
      return;
    }

    latestFrameRef.current = frame;
    const problems = poseProblems(frame.pose);
    setHints(problems);

    if (problems.length) {
      stableCountRef.current = 0;
      setCountdown(null);
      return;
    }

    stableCountRef.current += 1;
    if (stableCountRef.current < STABLE_FRAMES_REQUIRED) return;

    // Gates have held — count down, then fire once.
    const held = stableCountRef.current - STABLE_FRAMES_REQUIRED;
    const remaining = COUNTDOWN_FROM - Math.floor(held / FRAMES_PER_COUNT);
    if (remaining > 0) {
      setCountdown(remaining);
      return;
    }
    capturingRef.current = true;
    setCountdown(0);
    captureBurst();
  }, [captureBurst]);

  const startCapture = useCallback(async () => {
    setError(null);
    setStep('capture');
    setBusy(true);
    try {
      landmarkerRef.current = await loadFaceLandmarker();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setStep('guide');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          setCamReady(true);
          stableCountRef.current = 0;
          capturingRef.current = false;
          rafRef.current = requestAnimationFrame(tick);
        };
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.');
      setStep('guide');
    } finally {
      setBusy(false);
    }
  }, [tick]);

  const retake = useCallback(() => {
    setResult(null);
    setReview(null);
    setManualMode(false);
    setError(null);
    startCapture();
  }, [startCapture]);

  /* ── Manual corner dragging ──
     Handles are positioned as a percentage of the stage rather than in pixels
     measured from the DOM: the stage already carries the frame's aspect ratio, so
     percentages are exact, and nothing has to read layout during render (which
     would come up empty on the first render after the ref is attached). */
  const onCornerPointerDown = (index) => (event) => {
    event.preventDefault();
    dragRef.current = index;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onCornerPointerMove = (event) => {
    if (dragRef.current == null || !review) return;
    const box = reviewRef.current?.getBoundingClientRect();
    if (!box) return;
    const scaleX = review.frame.width / box.width;
    const scaleY = review.frame.height / box.height;
    const x = (event.clientX - box.left) * scaleX;
    const y = (event.clientY - box.top) * scaleY;
    setReview((current) => {
      const quad = current.quad.map((point, i) => (
        i === dragRef.current
          ? [
            Math.max(0, Math.min(current.frame.width, x)),
            Math.max(0, Math.min(current.frame.height, y)),
          ]
          : point
      ));
      return { ...current, quad };
    });
  };

  const onCornerPointerUp = () => { dragRef.current = null; };

  const applyManualQuad = () => {
    if (!review?.quad) return;
    setError(null);
    try {
      setResult(measurePdFromManualQuad(review.frame, review.quad));
      setManualMode(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const accept = () => {
    if (!result) return;
    onMeasured(result, review?.dataUrl ?? null);
  };

  const manualCardPx = review?.quad ? quadEdgeLengths(review.quad).longPx : 0;
  const manualTooSmall = manualMode && manualCardPx > 0 && manualCardPx < MIN_CARD_LONG_PX;

  return (
    <div className={`pdc${compact ? ' pdc--compact' : ''}`}>

      {/* ── Step 1: how to hold the card ── */}
      {step === 'guide' && (
        <div className="pdc__guide">
          <CardPlacementAnimation />
          <ol className="pdc__steps">
            {STEP_HINTS.map((hint) => <li key={hint}>{hint}</li>)}
          </ol>
          <p className="pdc__why">
            The card is a ruler of a known size, so your PD is measured against a
            real object rather than estimated from an average face.
          </p>
          {error && <p className="pdc__error">{error}</p>}
          <div className="pdc__actions">
            {onClose && (
              <button type="button" className="pdc__btn pdc__btn--ghost" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="button" className="pdc__btn pdc__btn--primary"
                    onClick={startCapture} disabled={busy}>
              {busy ? 'Preparing…' : 'I have my card — start'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: live capture ── */}
      {step === 'capture' && (
        <div className="pdc__capture">
          <div className="pdc__stage">
            <video ref={videoRef} autoPlay playsInline muted className="pdc__video" />

            {/* Ghost card outline: where the card should sit. Turns positive once
                every pose gate passes, which is also when the shutter arms. */}
            <div className={`pdc__ghost${hints.length === 0 && camReady ? ' pdc__ghost--ok' : ''}`}
                 style={{ aspectRatio: CARD_ASPECT }}>
              <span className="pdc__ghost-label">card here</span>
            </div>

            {!camReady && (
              <div className="pdc__overlay">
                <div className="pdc__spinner" />
                <span>Starting camera…</span>
              </div>
            )}

            {camReady && countdown > 0 && (
              <div className="pdc__countdown" key={countdown}>{countdown}</div>
            )}
            {camReady && countdown === 0 && (
              <div className="pdc__overlay">
                <div className="pdc__spinner" />
                <span>Hold still…</span>
              </div>
            )}
          </div>

          <div className={`pdc__hints${hints.length ? '' : ' pdc__hints--ok'}`}>
            {hints.length
              ? hints.map((hint) => <span key={hint}>{hint}</span>)
              : <span>{camReady ? 'Hold steady — capturing automatically' : 'Getting ready…'}</span>}
          </div>

          {error && <p className="pdc__error">{error}</p>}
          <div className="pdc__actions">
            <button type="button" className="pdc__btn pdc__btn--ghost"
                    onClick={() => { stopCamera(); setStep('guide'); }}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: review ── */}
      {step === 'review' && review && (
        <div className="pdc__review">
          {/* The review stage takes the captured frame's own aspect ratio so the
              image is shown un-cropped. That makes the box-to-pixel mapping used
              by the corner handles and the quad overlay exact — with the live
              view's cover-crop they would sit off the card. */}
          <div
            className="pdc__stage pdc__stage--review"
            style={{ aspectRatio: `${review.frame.width} / ${review.frame.height}` }}
            ref={reviewRef}
            onPointerMove={onCornerPointerMove}
            onPointerUp={onCornerPointerUp}
            onPointerLeave={onCornerPointerUp}
          >
            <img src={review.dataUrl} alt="Captured frame" className="pdc__video" />

            {review.quad && (
              <svg className="pdc__quad" viewBox={`0 0 ${review.frame.width} ${review.frame.height}`}
                   preserveAspectRatio="none">
                <polygon
                  points={review.quad.map(([x, y]) => `${x},${y}`).join(' ')}
                  className="pdc__quad-shape"
                />
              </svg>
            )}

            {manualMode && review.quad && review.quad.map(([x, y], index) => (
              <button
                key={index}
                type="button"
                className="pdc__handle"
                style={{
                  left: `${(x / review.frame.width) * 100}%`,
                  top: `${(y / review.frame.height) * 100}%`,
                }}
                onPointerDown={onCornerPointerDown(index)}
                aria-label={`Card corner ${index + 1}`}
              />
            ))}

            {busy && (
              <div className="pdc__overlay">
                <div className="pdc__spinner" />
                <span>Measuring…</span>
              </div>
            )}
          </div>

          {manualMode && (
            <p className="pdc__manual-tip">
              Drag each handle onto a corner of the card.
              {manualTooSmall && ' The card looks very small — move closer and retake for a better result.'}
            </p>
          )}

          {result && (
            <div className={`pdc__result pdc__result--${result.confidence}`}>
              <div className="pdc__result-pd">
                {result.pd_mm}<span>mm</span>
              </div>
              <div className="pdc__result-meta">
                <span>Confidence <strong>{result.confidence}</strong></span>
                <span>Likely {result.range.min}–{result.range.max} mm</span>
                <span>Right {result.pd_right_mm} · Left {result.pd_left_mm} mm</span>
              </div>
              {result.diagnostics.reasons.length > 0 && (
                <ul className="pdc__result-reasons">
                  {result.diagnostics.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
            </div>
          )}

          {error && <p className="pdc__error">{error}</p>}

          <div className="pdc__actions">
            <button type="button" className="pdc__btn pdc__btn--ghost" onClick={retake}>
              Retake
            </button>
            {manualMode ? (
              <button type="button" className="pdc__btn pdc__btn--primary" onClick={applyManualQuad}>
                Measure from these corners
              </button>
            ) : (
              <>
                <button type="button" className="pdc__btn pdc__btn--ghost"
                        onClick={() => {
                          setManualMode(true);
                          setReview((current) => ({
                            ...current,
                            quad: current.quad ?? defaultQuad(current.frame),
                          }));
                          setResult(null);
                        }}>
                  Adjust corners
                </button>
                <button type="button" className="pdc__btn pdc__btn--primary"
                        onClick={accept} disabled={!result}>
                  Use {result?.pd_mm} mm
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="pdc__canvas" />
    </div>
  );
};

/** A starting rectangle for manual placement, roughly where a card on a forehead
    lands: centred horizontally, in the upper third, at ID-1 proportions. */
function defaultQuad(frame) {
  const width = frame.width * 0.3;
  const height = width / CARD_ASPECT;
  const x = (frame.width - width) / 2;
  const y = frame.height * 0.14;
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}

export default PdCardMeasure;
