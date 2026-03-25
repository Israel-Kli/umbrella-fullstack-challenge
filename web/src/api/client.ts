import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Injects auth token and customer org header from localStorage on every request.
 *
 * Set these values when the user logs in / switches org:
 *   localStorage.setItem('token', '<jwt>');
 *   localStorage.setItem('customerOrgId', 'cust_northwind_health');
 */
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const customerOrgId = localStorage.getItem('customerOrgId');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (customerOrgId) {
    config.headers['X-Customer-Organization-Id'] = customerOrgId;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('customerOrgId');
    }
    return Promise.reject(error);
  }
);

export default client;
