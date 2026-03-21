/**
 * Catalog service for product-related API calls.
 */

import apiClient from './api';

const ENDPOINTS = {
  products: '/catalog/products',
  categories: '/catalog/categories',
  brands: '/catalog/brands',
};

export const catalogService = {
  // Products
  async getProducts(params = {}) {
    const response = await apiClient.get(ENDPOINTS.products, { params });
    return response.data;
  },

  async getProduct(id) {
    const response = await apiClient.get(`${ENDPOINTS.products}/${id}`);
    return response.data;
  },

  async createProduct(data) {
    const response = await apiClient.post(ENDPOINTS.products, data);
    return response.data;
  },

  async updateProduct(id, data) {
    const response = await apiClient.patch(`${ENDPOINTS.products}/${id}`, data);
    return response.data;
  },

  async deleteProduct(id) {
    await apiClient.delete(`${ENDPOINTS.products}/${id}`);
  },

  // Categories
  async getCategories() {
    const response = await apiClient.get(ENDPOINTS.categories);
    return response.data;
  },

  async getCategory(id) {
    const response = await apiClient.get(`${ENDPOINTS.categories}/${id}`);
    return response.data;
  },

  // Brands
  async getBrands() {
    const response = await apiClient.get(ENDPOINTS.brands);
    return response.data;
  },
};

export default catalogService;
