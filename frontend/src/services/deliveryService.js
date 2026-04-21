import apiClient from './api';

/**
 * Check delivery availability and estimated time for a pincode.
 *
 * @param {Object} params
 * @param {string|number} params.productId
 * @param {string|number} [params.sellerId]
 * @param {string} params.pincode  - 6-digit Indian pincode
 * @returns {Promise<{
 *   canDeliverIn1or2Hours: boolean,
 *   estimatedDeliveryDate: string,
 *   estimatedDeliveryTime: string,
 *   deliveryCharge: number,
 *   message: string,
 *   error?: string
 * }>}
 */
export async function checkDelivery({ productId, sellerId, pincode }) {
  const response = await apiClient.post('/sales/delivery/check/', {
    productId,
    sellerId: sellerId ?? null,
    pincode,
  });
  return response.data;
}
