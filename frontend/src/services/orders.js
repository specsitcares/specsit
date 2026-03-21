/**
 * Orders service for order-related API calls.
 */

import apiClient from './api';

const ENDPOINTS = {
  orders: '/orders/orders',
};

export const ordersService = {
  async getOrders(params = {}) {
    const response = await apiClient.get(ENDPOINTS.orders, { params });
    return response.data;
  },

  async getOrder(id) {
    const response = await apiClient.get(`${ENDPOINTS.orders}/${id}`);
    return response.data;
  },

  async createOrder(data) {
    const response = await apiClient.post(ENDPOINTS.orders, data);
    return response.data;
  },

  async updateOrder(id, data) {
    const response = await apiClient.patch(`${ENDPOINTS.orders}/${id}`, data);
    return response.data;
  },

  async cancelOrder(id) {
    const response = await apiClient.post(`${ENDPOINTS.orders}/${id}/cancel/`);
    return response.data;
  },
};

export default ordersService;
