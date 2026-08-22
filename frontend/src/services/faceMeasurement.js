// ── Card-reference PD measurement ───────────────────────────────────────────
// The scale of the photo comes from a real object in it: an ISO/IEC 7810 ID-1
// card (every credit/debit card, and in India also Aadhaar, PAN and the driving
// licence) is 85.60 × 53.98 mm to within ±0.12 mm.
//
// This replaces the previous approach, which multiplied the pupil/cheek pixel
// ratio by an assumed 140 mm average face width. That assumption made the error
// track how far the user's face was from average — a systematic, per-person bias
// of several millimetres that no amount of better lighting could fix.
//
// Division of labour:
//   • here (MediaPipe WASM, in the browser) — pupils, head pose, live gating
//   • POST /api/detect-pd-card/ (OpenCV, server) — the card's four corners
//   • here again — combine the two into millimetres
//
// Landmark detection runs in VIDEO mode so the same loop drives the live overlay
// and the captured frames; nothing is re-detected after the shutter.

const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';

const MEDIAPIPE_MODEL_PRIMARY =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MEDIAPIPE_MODEL_FALLBACK =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm/face_landmarker.task';

// ── Physical + optical constants ────────────────────────────────────────────

/** ISO/IEC 7810 ID-1 long edge. The whole measurement hangs off this number. */
export const CARD_LONG_EDGE_MM = 85.6;
export const CARD_SHORT_EDGE_MM = 53.98;
export const CARD_ASPECT = CARD_LONG_EDGE_MM / CARD_SHORT_EDGE_MM;

// Front-facing cameras cluster around a 65° horizontal field of view, which puts
// the focal length at (W/2)/tan(32.5°) ≈ 0.785·W pixels. It is only used to
// estimate how far away the face is, which in turn only scales the small
// forehead-depth correction below — a 60°/75° spread moves the final PD by about
// half a millimetre, whereas skipping the correction entirely costs ~2.5 mm.
const ASSUMED_FOCAL_LENGTH_FACTOR = 0.785;

// Correction is clamped to this band. A card sits 10-20 mm in front of the pupil
// plane at 280-450 mm from the camera, i.e. 3-5%; anything outside means a bad
// landmark or a bad card quad, and a clamp is safer than a wild answer.
const MIN_DEPTH_CORRECTION = 1.0;
const MAX_DEPTH_CORRECTION = 1.1;
const FALLBACK_DEPTH_CORRECTION = 1.035;   // 14 mm at 400 mm

// MediaPipe FaceLandmarker indices.
const IRIS_A = 468;          // one iris centre; anatomical side resolved by x below
const IRIS_B = 473;
const GLABELLA = 151;        // lower forehead — the point a rigid card rests on
const NASION = 168;          // bridge of the nose, between the eyes
const CHEEK_A = 234;
const CHEEK_B = 454;
const FOREHEAD_TOP = 10;
const CHIN = 152;

// ── Pose gates ──────────────────────────────────────────────────────────────
// Yaw is the one that really matters: pupil separation projects as cos(yaw), so
// 10° of turn already costs ~1 mm. Roll needs no correction at all (in-plane
// rotation shortens nothing) and is gated only so the card looks level to the
// user. Pitch leaves both horizontal measurements alone but changes how far the
// forehead sits in front of the eyes, which is why it is gated too.
export const POSE_LIMITS = {
  yawDeg: 5,
  pitchDeg: 10,
  rollDeg: 10,
};

// The card must be a decent fraction of the frame or the mm-per-pixel is coarse.
export const MIN_CARD_LONG_PX = 90;

let faceLandmarkerPromise = null;
let videoTimestamp = 0;

async function createLandmarker(vision, wasmFileset, modelUrl) {
  return vision.FaceLandmarker.createFromOptions(wasmFileset, {
    baseOptions: { modelAssetPath: modelUrl },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

export async function loadFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      let vision;
      try {
        vision = await import('@mediapipe/tasks-vision');
      } catch (err) {
        throw new Error(
          'Failed to load the face detection module. '
          + `Check your internet connection and try again. (detail: ${err.message})`
        );
      }

      let wasmFileset;
      try {
        wasmFileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      } catch (err) {
        throw new Error(
          'Failed to load the MediaPipe WASM runtime from CDN. '
          + `Check your internet connection and try again. (detail: ${err.message})`
        );
      }

      try {
        return await createLandmarker(vision, wasmFileset, MEDIAPIPE_MODEL_PRIMARY);
      } catch (primaryErr) {
        try {
          return await createLandmarker(vision, wasmFileset, MEDIAPIPE_MODEL_FALLBACK);
        } catch (fallbackErr) {
          throw new Error(
            'Could not load the face landmark model from any CDN. '
            + 'Please check your internet connection and try again. '
            + `(primary: ${primaryErr.message} | fallback: ${fallbackErr.message})`
          );
        }
      }
    })().catch((err) => {
      faceLandmarkerPromise = null;      // let the next call retry from scratch
      throw err;
    });
  }
  return faceLandmarkerPromise;
}

// ── Small geometry helpers ──────────────────────────────────────────────────

const degrees = (radians) => (radians * 180) / Math.PI;

function pixel(landmark, width, height) {
  return { x: landmark.x * width, y: landmark.y * height };
}

function separation(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Mean length of a quad's long and short edges, corners ordered TL/TR/BR/BL.
 *
 * Averaging opposite edges estimates the card's width at its mid depth, which is
 * the correct ruler under perspective — a card tilted on the forehead has one
 * edge nearer the camera and therefore longer.
 */
export function quadEdgeLengths(quad) {
  const [tl, tr, br, bl] = quad.map(([x, y]) => ({ x, y }));
  const horizontal = (separation(tl, tr) + separation(bl, br)) / 2;
  const vertical = (separation(tl, bl) + separation(tr, br)) / 2;
  return {
    longPx: Math.max(horizontal, vertical),
    shortPx: Math.min(horizontal, vertical),
  };
}

/** Order four unsorted points as top-left, top-right, bottom-right, bottom-left. */
export function orderQuad(points) {
  const byY = [...points].sort((a, b) => a[1] - b[1]);
  const [topLeft, topRight] = byY.slice(0, 2).sort((a, b) => a[0] - b[0]);
  const [bottomLeft, bottomRight] = byY.slice(2).sort((a, b) => a[0] - b[0]);
  return [topLeft, topRight, bottomRight, bottomLeft];
}

// ── Frame analysis ──────────────────────────────────────────────────────────

/**
 * Read pupils and head pose out of one frame.
 *
 * `source` is anything MediaPipe accepts — a <video>, <canvas> or <img>. Returns
 * null when no face is present, so the live loop can just skip the frame.
 *
 * Yaw and pitch come from the landmarks' relative depth rather than from the
 * transformation matrix: MediaPipe reports z on roughly the same scale as x, so
 * comparing the two cheeks (or forehead and chin) is unambiguous and needs no
 * assumption about how the matrix is laid out.
 */
export function analyseFrame(faceLandmarker, source, width, height, timestampMs) {
  videoTimestamp = Math.max(videoTimestamp + 1, timestampMs ?? performance.now());
  const detection = faceLandmarker.detectForVideo(source, videoTimestamp);
  const landmarks = detection?.faceLandmarks?.[0];
  if (!landmarks || landmarks.length <= IRIS_B) return null;

  const irisA = landmarks[IRIS_A];
  const irisB = landmarks[IRIS_B];
  const glabella = landmarks[GLABELLA];
  const nasion = landmarks[NASION];
  if (!irisA || !irisB || !glabella || !nasion) return null;

  // A front camera is not mirrored in the captured canvas, so the pupil with the
  // smaller x is the subject's right eye (OD) — same as in a photograph. Deciding
  // it from geometry avoids depending on MediaPipe's left/right index convention.
  const [right, left] = irisA.x <= irisB.x ? [irisA, irisB] : [irisB, irisA];

  const rightPupil = pixel(right, width, height);
  const leftPupil = pixel(left, width, height);

  const cheekA = landmarks[CHEEK_A];
  const cheekB = landmarks[CHEEK_B];
  const foreheadTop = landmarks[FOREHEAD_TOP];
  const chin = landmarks[CHIN];

  // z shares x's normalisation, so scale both by the frame width to compare.
  const yawDeg = cheekA && cheekB
    ? degrees(Math.atan2((cheekB.z - cheekA.z), Math.abs(cheekB.x - cheekA.x)))
    : 0;
  const pitchDeg = foreheadTop && chin
    ? degrees(Math.atan2((foreheadTop.z - chin.z), Math.abs(foreheadTop.y - chin.y)))
    : 0;
  const rollDeg = degrees(
    Math.atan2(leftPupil.y - rightPupil.y, leftPupil.x - rightPupil.x)
  );

  return {
    rightPupil,
    leftPupil,
    pupilSeparationPx: separation(rightPupil, leftPupil),
    // Relative depth, in normalised units — turned into millimetres later, once
    // the card has supplied a scale.
    glabellaZ: glabella.z,
    pupilZ: (right.z + left.z) / 2,
    nasion: pixel(nasion, width, height),
    pose: {
      yawDeg,
      pitchDeg,
      rollDeg,
    },
    width,
    height,
  };
}

/** Which pose gates a frame fails, as human-readable hints. */
export function poseProblems(pose) {
  const problems = [];
  if (Math.abs(pose.yawDeg) > POSE_LIMITS.yawDeg) {
    problems.push(pose.yawDeg > 0 ? 'Turn slightly left' : 'Turn slightly right');
  }
  if (Math.abs(pose.pitchDeg) > POSE_LIMITS.pitchDeg) {
    problems.push(pose.pitchDeg > 0 ? 'Lower your chin' : 'Raise your chin');
  }
  if (Math.abs(pose.rollDeg) > POSE_LIMITS.rollDeg) {
    problems.push('Keep your head level');
  }
  return problems;
}

// ── Millimetres ─────────────────────────────────────────────────────────────

/**
 * Combine one analysed frame with its card quad to get PD in millimetres.
 *
 * The card gives millimetres-per-pixel *at the card's plane*. The pupils sit
 * behind that plane, so they image slightly smaller and a raw reading
 * under-estimates PD by 3-5%. Correcting needs the ratio of the forehead-to-pupil
 * offset to the camera distance, both of which are recoverable here: the offset
 * from the landmarks' relative depth, the distance from the card's known size.
 */
export function pdFromFrame(frame, quad) {
  const { longPx } = quadEdgeLengths(quad);
  if (!(longPx > 0)) {
    throw new Error('The card outline is invalid — please place the corners again.');
  }

  const mmPerPxCardPlane = CARD_LONG_EDGE_MM / longPx;

  // Camera distance implied by the card's apparent size.
  const focalPx = ASSUMED_FOCAL_LENGTH_FACTOR * frame.width;
  const cameraDistanceMm = (focalPx * CARD_LONG_EDGE_MM) / longPx;

  // How far the pupils sit behind the card, in millimetres.
  const depthOffsetMm = (frame.pupilZ - frame.glabellaZ) * frame.width * mmPerPxCardPlane;

  let depthCorrection = FALLBACK_DEPTH_CORRECTION;
  let depthCorrectionSource = 'assumed';
  if (
    Number.isFinite(depthOffsetMm) && depthOffsetMm > 0
    && Number.isFinite(cameraDistanceMm) && cameraDistanceMm > 120
  ) {
    depthCorrection = (cameraDistanceMm + depthOffsetMm) / cameraDistanceMm;
    depthCorrectionSource = 'measured';
  }
  depthCorrection = Math.min(MAX_DEPTH_CORRECTION,
    Math.max(MIN_DEPTH_CORRECTION, depthCorrection));

  const mmPerPxPupilPlane = mmPerPxCardPlane * depthCorrection;

  // Undo the cos(yaw) foreshortening of a horizontal distance. Small by design —
  // frames beyond POSE_LIMITS.yawDeg never reach this point.
  const yawRadians = (Math.min(Math.abs(frame.pose.yawDeg), 12) * Math.PI) / 180;
  const yawCorrection = 1 / Math.max(0.95, Math.cos(yawRadians));

  const pdMm = frame.pupilSeparationPx * mmPerPxPupilPlane * yawCorrection;

  // Monocular halves: each pupil's distance from the facial midline, measured
  // along the interpupillary axis so head roll cannot skew the split. Progressive
  // lenses are glazed from these rather than from the binocular total.
  const axisX = (frame.leftPupil.x - frame.rightPupil.x) / frame.pupilSeparationPx;
  const axisY = (frame.leftPupil.y - frame.rightPupil.y) / frame.pupilSeparationPx;
  const projected = (point) => (
    (point.x - frame.nasion.x) * axisX + (point.y - frame.nasion.y) * axisY
  );
  const scale = mmPerPxPupilPlane * yawCorrection;
  const pdRightMm = Math.abs(projected(frame.rightPupil)) * scale;
  const pdLeftMm = Math.abs(projected(frame.leftPupil)) * scale;

  return {
    pdMm,
    pdRightMm,
    pdLeftMm,
    cardLongPx: longPx,
    mmPerPx: mmPerPxPupilPlane,
    cameraDistanceMm,
    depthOffsetMm,
    depthCorrection,
    depthCorrectionSource,
  };
}

// ── Confidence ──────────────────────────────────────────────────────────────

/**
 * Grade a set of per-frame results.
 *
 * Agreement between frames is the honest signal here, and it is free: three
 * captures that land within half a millimetre of each other were measuring the
 * same thing, while a wide spread means a corner or a pupil moved. The previous
 * implementation graded confidence by checking whether the answer fell in the
 * plausible 58-72 mm band, which reported "high" for a number it had no way of
 * verifying.
 */
export function gradeMeasurements(measurements, { detectionScore, manual }) {
  const values = measurements.map((m) => m.pdMm).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const spread = values.length > 1 ? values[values.length - 1] - values[0] : null;

  const cardPx = Math.min(...measurements.map((m) => m.cardLongPx));
  const assumedDepth = measurements.some((m) => m.depthCorrectionSource === 'assumed');
  const distance = measurements[0].cameraDistanceMm;

  const reasons = [];
  let confidence = 'high';

  const demote = (level, reason) => {
    reasons.push(reason);
    if (level === 'low' || confidence === 'low') confidence = 'low';
    else confidence = 'medium';
  };

  if (spread !== null && spread > 1.5) demote('low', `Captures disagreed by ${spread.toFixed(1)} mm`);
  else if (spread !== null && spread > 0.6) demote('medium', 'Captures varied slightly');

  if (cardPx < MIN_CARD_LONG_PX) demote('low', 'Card too small in frame — hold it closer');
  else if (cardPx < 120) demote('medium', 'Card a little small in frame');

  if (!manual && detectionScore != null && detectionScore < 0.7) {
    demote('medium', 'Card edges were not crisp');
  }
  if (manual) reasons.push('Card corners placed by hand');
  if (assumedDepth) demote('medium', 'Face depth estimated rather than measured');
  if (!(distance > 150 && distance < 900)) {
    demote('low', 'Unusual camera distance — hold the phone at arm’s length');
  }

  // Half the spread plus the residual scale uncertainty, floored at the ±0.3 mm
  // the card's own tolerance and corner placement cannot beat.
  const margin = Math.max(
    0.3,
    (spread ?? 0) / 2 + (confidence === 'high' ? 0.3 : confidence === 'medium' ? 0.8 : 1.8)
  );

  return {
    pd_mm: Number(median.toFixed(1)),
    pd_right_mm: Number(
      (measurements.reduce((sum, m) => sum + m.pdRightMm, 0) / measurements.length).toFixed(1)
    ),
    pd_left_mm: Number(
      (measurements.reduce((sum, m) => sum + m.pdLeftMm, 0) / measurements.length).toFixed(1)
    ),
    confidence,
    // Both paths measure against the card; only how the corners were found differs,
    // and that is recorded in diagnostics.manual_corners.
    method: 'card',
    range: {
      min: Number((median - margin).toFixed(1)),
      max: Number((median + margin).toFixed(1)),
    },
    diagnostics: {
      frames: measurements.length,
      spread_mm: spread === null ? null : Number(spread.toFixed(2)),
      card_long_px: Number(cardPx.toFixed(1)),
      camera_distance_mm: Number(distance.toFixed(0)),
      depth_correction: Number(measurements[0].depthCorrection.toFixed(4)),
      manual_corners: !!manual,
      reasons,
    },
  };
}

// ── Card detection (server) ─────────────────────────────────────────────────

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Ask the server to locate the card in one captured frame.
 *
 * A frame with no card found comes back as `{found: false}` rather than an error —
 * that is a normal outcome which sends the user to the manual corner step.
 */
export async function detectCardQuad(dataUrl) {
  const body = new FormData();
  body.append('image', dataUrlToBlob(dataUrl), 'pd_frame.jpg');

  const token = localStorage.getItem('token');
  const response = await fetch('/api/detect-pd-card/', {
    method: 'POST',
    headers: { ...(token && { Authorization: `Token ${token}` }) },
    body,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      detail.details || detail.error
      || `Card detection failed (HTTP ${response.status}). Place the corners manually.`
    );
  }
  return response.json();
}

/**
 * Full measurement for a set of captured frames.
 *
 * Each frame carries the landmarks read from the live loop at the moment of
 * capture, so nothing is detected twice. Card detection runs on all frames in
 * parallel; frames whose card was not found are dropped, and if none survive the
 * caller falls back to manual corner placement.
 */
export async function measurePdFromCaptures(captures) {
  const detections = await Promise.all(
    captures.map((capture) => detectCardQuad(capture.dataUrl).catch(() => null))
  );

  const usable = [];
  let detectionScore = 1;
  detections.forEach((detection, index) => {
    if (!detection?.found) return;
    usable.push(pdFromFrame(captures[index].frame, detection.quad));
    detectionScore = Math.min(detectionScore, detection.detection_score ?? 1);
  });

  if (!usable.length) {
    const reason = detections.find((d) => d && !d.found)?.reason
      || 'The card could not be found in the photo.';
    const error = new Error(reason);
    error.needsManualCorners = true;
    error.detections = detections;
    throw error;
  }

  return gradeMeasurements(usable, { detectionScore, manual: false });
}

/** Measurement from a single frame whose corners the user placed by hand. */
export function measurePdFromManualQuad(frame, quad) {
  return gradeMeasurements([pdFromFrame(frame, orderQuad(quad))], {
    detectionScore: null,
    manual: true,
  });
}
