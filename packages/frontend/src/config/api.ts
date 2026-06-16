import axios from 'axios';
import { useAuthStore } from '../features/auth/hooks/useAuthStore.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Inject the active access token into header
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Catch 401s and trigger token refreshment automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and we haven't retried this specific request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark to prevent infinite loops
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // Call public refresh endpoint
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;

          // Update store with new access token
          useAuthStore.setState({ accessToken });

          // Retry the original failed request with the new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh token is also dead, force logout
          useAuthStore.getState().clearAuth();
        }
      }
    }
    return Promise.reject(error);
  }
);