// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach JWT token to requests if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auth & User Endpoints
export const loginUser = (credentials) => API.post('/auth/login', credentials);
export const registerUser = (userData) => API.post('/auth/register', userData);
export const fetchProviders = () => API.get('/auth/providers');

// Food Listing Endpoints
export const fetchListings = () => API.get('/listings');
export const createListing = (data) => API.post('/listings', data);
export const deleteListing = (id) => API.delete(`/listings/${id}`);

// Reservation Endpoints
export const fetchReservations = () => API.get('/reservations');
export const createReservation = (data) => API.post('/reservations', data);
export const updateReservationStatus = (id, status) => API.patch(`/reservations/${id}/status`, { status });

// Analytics & Reports Endpoints
export const fetchStats = () => API.get('/stats');
export const fetchReportStats = () => API.get('/reports');

export default API;