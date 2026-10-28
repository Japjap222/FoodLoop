import axios from 'axios';

// ==============================
// API CONFIGURATION
// ==============================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://foodloop-cbo9.onrender.com/api');

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach the login token to requests.
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================
// AUTHENTICATION
// ==============================

export const loginUser = (credentials) =>
  API.post('/auth/login', credentials);

export const registerUser = (userData) =>
  API.post('/auth/register', userData);

export const verifyEmailOtp = (data) =>
  API.post('/auth/verify-email', data);

export const resendEmailOtp = (data) =>
  API.post('/auth/resend-verification', data);

export const changePassword = (data) =>
  API.patch('/auth/change-password', data);

export const deleteMyAccount = (data) =>
  API.delete('/auth/me', { data });

// ==============================
// PROVIDERS AND ADMIN ACCOUNTS
// ==============================

export const fetchAllAccounts = () =>
  API.get('/auth/accounts');

export const fetchProviders = () =>
  API.get('/auth/providers');

export const fetchAccounts = () =>
  API.get('/auth/accounts');

export const deactivateProvider = (id) =>
  API.patch(`/auth/providers/${id}/deactivate`);

export const reactivateProvider = (id) =>
  API.patch(`/auth/providers/${id}/reactivate`);

export const archiveProvider = (id) =>
  API.patch(`/auth/providers/${id}/archive`);

export const restoreProvider = (id) =>
  API.patch(`/auth/providers/${id}/restore`);

// ==============================
// FOOD LISTINGS
// ==============================

export const fetchListings = () =>
  API.get('/listings');

export const createListing = (listingData) =>
  API.post('/listings', listingData);

export const updateListing = (id, listingData) =>
  API.put(`/listings/${id}`, listingData);

export const deleteListing = (id) =>
  API.delete(`/listings/${id}`);

// ==============================
// RESERVATIONS
// ==============================

export const fetchReservations = () =>
  API.get('/reservations');

// Reservations specifically for donors.
export const fetchDonorReservations = () =>
  API.get('/reservations/donor');

// Reservations belonging to the currently logged-in user.
export const fetchMyReservations = () =>
  API.get('/reservations/my');

export const createReservation = (reservationData) =>
  API.post('/reservations', reservationData);

export const updateReservationStatus = (id, status) =>
  API.patch(`/reservations/${id}/status`, { status });

// ==============================
// STATISTICS AND REPORTS
// ==============================

export const fetchStats = () =>
  API.get('/reports');

export const fetchReportStats = () =>
  API.get('/reports');

// ==============================
// APPEALS
// ==============================

export const fetchAppeals = () =>
  API.get('/appeals');

export const fetchAllAppeals = () =>
  API.get('/appeals');

export const fetchMyAppeals = () =>
  API.get('/appeals/my');

// Normalizes input so strings or varied object keys cleanly map to { reason: "..." }
export const submitAppeal = (appealData) => {
  let reasonText = '';

  if (typeof appealData === 'string') {
    reasonText = appealData;
  } else if (typeof appealData === 'object' && appealData !== null) {
    reasonText =
      appealData.reason ||
      appealData.appealReason ||
      appealData.message ||
      '';
  }

  return API.post('/appeals', { reason: String(reasonText).trim() });
};

export const createAppeal = (appealData) => submitAppeal(appealData);

export const reviewAppeal = (id, reviewData) =>
  API.patch(`/appeals/${id}/review`, reviewData);

export const updateAppeal = (id, appealData) =>
  API.patch(`/appeals/${id}/review`, appealData);

export const deleteAppeal = (id) =>
  API.delete(`/appeals/${id}`);

// ==============================
// REVIEWS
// ==============================

export const fetchReviews = () =>
  API.get('/reviews');

export const fetchMyReviews = () =>
  API.get('/reviews/my');

export const createReview = (reviewData) =>
  API.post('/reviews', reviewData);

export const updateReview = (id, reviewData) =>
  API.put(`/reviews/${id}`, reviewData);

export const deleteReview = (id) =>
  API.delete(`/reviews/${id}`);

export const fetchDonorReviews = (donorId) => {
  if (!donorId || donorId === 'all') {
    return fetchReviews();
  }
  return API.get(`/reviews/donor/${donorId}`);
};

// ==============================
// DEFAULT EXPORT
// ==============================

export default API;
