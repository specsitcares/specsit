// ── MediaPipe client-side PD measurement ────────────────────────────────────
// All face landmark detection runs in the browser using MediaPipe WASM.
// No server-side OpenGL / libGLESv2 dependency is needed.

// Primary CDN for the MediaPipe WASM runtime
const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm';

// Primary model CDN (Google Storage) + fallback (jsDelivr mirror)
const MEDIAPIPE_MODEL_PRIMARY =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MEDIAPIPE_MODEL_FALLBACK =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm/face_landmarker.task';

// Singleton so the WASM module + model are loaded only once per page session.
let faceLandmarkerPromise = null;

async function createLandmarker(vision, wasmFileset, modelUrl) {
  return vision.FaceLandmarker.createFromOptions(wasmFileset, {
    baseOptions: { modelAssetPath: modelUrl },
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
  });
}

async function loadFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      let vision;
      try {
        vision = await import('@mediapipe/tasks-vision');
      } catch (err) {
        throw new Error(
          'Failed to load the MediaPipe vision module. ' +
          'Check your internet connection and try again. ' +
          `(detail: ${err.message})`
        );
      }

      let wasmFileset;
      try {
        wasmFileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      } catch (err) {
        throw new Error(
          'Failed to load MediaPipe WASM runtime from CDN. ' +
          'Check your internet connection and try again. ' +
          `(detail: ${err.message})`
        );
      }

      // Try primary model URL first, then fallback
      try {
        return await createLandmarker(vision, wasmFileset, MEDIAPIPE_MODEL_PRIMARY);
      } catch (primaryErr) {
        console.warn(
          '⚠️ Primary model CDN failed, trying fallback…',
          primaryErr.message
        );
        try {
          return await createLandmarker(vision, wasmFileset, MEDIAPIPE_MODEL_FALLBACK);
        } catch (fallbackErr) {
          throw new Error(
            'Could not load the face landmark model from any CDN. ' +
            'Please check your internet connection and try again. ' +
            `(primary: ${primaryErr.message} | fallback: ${fallbackErr.message})`
          );
        }
      }
    })().catch((err) => {
      // Reset so the next call retries from scratch
      faceLandmarkerPromise = null;
      throw err;
    });
  }

  return faceLandmarkerPromise;
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Unable to load the captured image for measurement.'));
    img.src = dataUrl;
  });
}

function getPoint(landmark, width, height) {
  return [landmark.x * width, landmark.y * height];
}

function distance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function calculatePdFromLandmarks(landmarks, width, height) {
  // Iris-centre landmarks (added in MediaPipe FaceLandmarker)
  const lPupil = landmarks[468];
  const rPupil = landmarks[473];
  // Zygomatic / cheekbone width anchors for real-world scale calibration
  const lFace = landmarks[234];
  const rFace = landmarks[454];

  if (!lPupil || !rPupil || !lFace || !rFace) {
    throw new Error(
      'Face landmarks are incomplete. ' +
      'Try again with a better frontal face photo.'
    );
  }

  const pdPx = distance(
    getPoint(rPupil, width, height),
    getPoint(lPupil, width, height)
  );
  const facePx = distance(
    getPoint(rFace, width, height),
    getPoint(lFace, width, height)
  );

  // Ratio-based calibration: average adult face width ≈ 140 mm
  const pdMm = facePx > 0 ? (pdPx / facePx) * 140.0 : 63.0;

  let confidence = 'low';
  let margin = 3.5;
  if (58 <= pdMm && pdMm <= 72) {
    confidence = 'high';
    margin = 1.0;
  } else if (54 <= pdMm && pdMm <= 80) {
    confidence = 'medium';
    margin = 2.0;
  }

  return {
    pd_mm: Number(pdMm.toFixed(1)),
    confidence,
    range: {
      min: Number((pdMm - margin).toFixed(1)),
      max: Number((pdMm + margin).toFixed(1)),
    },
  };
}

/**
 * Measure pupillary distance entirely in the browser.
 * No server round-trip or OpenGL dependency required.
 *
 * @param {string} dataUrl - JPEG/PNG data URL from canvas.toDataURL()
 * @returns {Promise<{pd_mm: number, confidence: string, range: {min:number, max:number}}>}
 */
export async function measurePdFromDataUrl(dataUrl) {
  if (!dataUrl) {
    throw new Error('No captured image was provided for PD measurement.');
  }

  const image = await loadImageFromDataUrl(dataUrl);
  const faceLandmarker = await loadFaceLandmarker();
  const result = faceLandmarker.detect(image);
  const landmarks = result?.faceLandmarks?.[0];

  if (!landmarks || landmarks.length === 0) {
    throw new Error(
      'No face detected. ' +
      'Please retake the photo in good lighting with a direct frontal view.'
    );
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  return calculatePdFromLandmarks(landmarks, width, height);
}

