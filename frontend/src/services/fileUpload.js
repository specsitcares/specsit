/**
 * File Upload Service
 * Uses native Fetch API for multipart/form-data uploads
 * Avoids axios issues with Content-Type headers
 */

import { getAuthToken } from '../utils/auth';

const API_BASE_URL = '/api';

/**
 * Upload face capture with image and optional PD distance
 * Uses native Fetch API which handles FormData correctly
 * @param {Blob} imageBlob - The face image blob
 * @param {number|string} pdDistance - Optional pupillary distance value
 * @returns {Promise} - Response from server
 */
export const uploadFaceCapture = async (imageBlob, pdDistance = null) => {
    try {
        // Build FormData
        const formData = new FormData();
        formData.append('image', imageBlob, 'face_capture.jpg');
        
        if (pdDistance) {
            formData.append('pd_distance', String(pdDistance));
            console.log('📸 Upload: Image + PD Distance:', pdDistance);
        } else {
            console.log('📸 Upload: Image only (no PD distance)');
        }

        console.log('📤 Uploading to /api/catalog/user-face/');

        // Get auth token
        const token = getAuthToken();

        // Use native Fetch API - it handles FormData correctly automatically
        const response = await fetch(`${API_BASE_URL}/catalog/user-face/`, {
            method: 'POST',
            headers: {
                // ONLY add Authorization - do NOT set Content-Type
                // Fetch will automatically set multipart/form-data with boundary
                ...(token && { 'Authorization': `Token ${token}` }),
            },
            body: formData,
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('❌ Upload failed. Status:', response.status);
            console.error('Server error:', errData);
            throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(errData)}`);
        }

        const data = await response.json();
        console.log('✅ Upload successful. Response:', data);
        return { status: response.status, data };

    } catch (error) {
        console.error('❌ Upload error:', error);
        throw error;
    }
};

export default {
    uploadFaceCapture,
};
