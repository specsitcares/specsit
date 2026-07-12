/**
 * Virtual Try-On (VTO) Service
 * 
 * Handles communication with the client's 3rd-party VTO API.
 */

const VTRYON_API_KEY = import.meta.env.VITE_VTRYON_API_KEY || 'placeholder_key';

/* ──────────────────────────────────────────────────────────────────────────
 * KiksAR RTE (Real-Time Experience / Virtual Try-On) integration.
 *
 * Per the KiksAR integration doc, the flow is:
 *   1. Load kixr_integration.js once on the page.
 *   2. Call window.invokeKiksarRTE('<product_skuid>') to launch the experience.
 *
 * The script path is client-specific (the `xxx` segment in the doc's URL must
 * be replaced with your KiksAR client id). Set it via VITE_KIKSAR_SCRIPT_URL.
 * ────────────────────────────────────────────────────────────────────────── */
const KIKSAR_SCRIPT_URL =
    import.meta.env.VITE_KIKSAR_SCRIPT_URL ||
    'https://web-rte-static-files.s3.ap-south-1.amazonaws.com/xxx/kixr_integration.js';

let kiksarScriptPromise = null;

function loadKiksarScript() {
    if (typeof window.invokeKiksarRTE === 'function') return Promise.resolve();
    if (kiksarScriptPromise) return kiksarScriptPromise;

    kiksarScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-kiksar-rte]');
        if (existing) {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }
        const s = document.createElement('script');
        s.src = KIKSAR_SCRIPT_URL;
        s.async = true;
        s.dataset.kiksarRte = 'true';
        s.onload = () => resolve();
        s.onerror = () => { kiksarScriptPromise = null; reject(new Error('Failed to load KiksAR RTE script')); };
        document.body.appendChild(s);
    });
    return kiksarScriptPromise;
}

/**
 * Launch the KiksAR virtual try-on for a given product SKU. Loads the
 * integration script on first use, then invokes the RTE.
 * @param {string} sku - Product/variant SKU (must be registered with KiksAR).
 * @returns {Promise<boolean>} true if the experience launched, false otherwise.
 */
export async function invokeKiksarVTO(sku) {
    if (!sku) {
        console.warn('KiksAR VTO: no SKU provided.');
        return false;
    }
    try {
        await loadKiksarScript();
        if (typeof window.invokeKiksarRTE === 'function') {
            window.invokeKiksarRTE(String(sku));
            return true;
        }
        console.error('KiksAR VTO: invokeKiksarRTE was not defined after the script loaded.');
        return false;
    } catch (err) {
        console.error('KiksAR VTO: failed to launch —', err);
        return false;
    }
}

const vtoService = {
    /**
     * Applies the virtual try-on effect to a face image.
     * @param {string} faceBase64 - The captured face image in Base64 format.
     * @param {string} productSku - The SKU of the glasses to try on.
     * @returns {Promise<string>} - The processed image with the frames overlaid.
     */
    applyTryOn: async (faceBase64, productSku) => {
        console.log(`Applying VTO for SKU: ${productSku} using API Key: ${VTRYON_API_KEY.substring(0, 5)}...`);
        
        // Mocking the API call until real SDK/Endpoint is provided
        return new Promise((resolve) => {
            setTimeout(() => {
                // In a real implementation, this would be an axios/fetch call to the 3rd party API
                // For now, we return the original face as a placeholder
                resolve(faceBase64);
            }, 800);
        });
    },

    saveFaceToLocal: (faceBase64) => {
        localStorage.setItem('vto_face_capture', faceBase64);
    },

    getFaceFromLocal: () => {
        return localStorage.getItem('vto_face_capture');
    }
};

export default vtoService;
