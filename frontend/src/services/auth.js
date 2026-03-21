/**
 * Auth service for authentication-related API calls.
 */

import apiClient from './api';

const ENDPOINTS = {
  login: '/auth/login/',
  logout: '/auth/logout/',
  register: '/auth/register/',
  profile: '/auth/profile/',
  refresh: '/auth/refresh/',
};

export const authService = {
  async login(credentials) {
    const response = await apiClient.post(ENDPOINTS.login, credentials);
    return response.data;
  },

  async logout() {
    await apiClient.post(ENDPOINTS.logout);
  },

  async register(userData) {
    const response = await apiClient.post(ENDPOINTS.register, userData);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get(ENDPOINTS.profile);
    return response.data;
  },

  async updateProfile(data) {
    const response = await apiClient.patch(ENDPOINTS.profile, data);
    return response.data;
  },

  async refreshToken() {
    const response = await apiClient.post(ENDPOINTS.refresh);
    return response.data;
  },
};

export default authService;
