import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });

// ── JWT interceptor ───────────────────────────────────────────────────────────
// Reads the token from localStorage (stored by AuthContext after login) and
// attaches it as a Bearer header on every outgoing request automatically.
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('surplusUser');
  if (raw) {
    try {
      const { access_token } = JSON.parse(raw);
      if (access_token) {
        config.headers['Authorization'] = `Bearer ${access_token}`;
      }
    } catch (_) { /* corrupted storage — ignore */ }
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  login: (data) => api.post('/auth/login', data),
};

// ── Registration ──────────────────────────────────────────────────────────────
export const hotelService = {
  register: (data)  => api.post('/hotels/register', data),
  getHotel: (id)    => api.get(`/hotels/${id}`),
};

export const ngoService = {
  register: (data) => api.post('/ngos/register', data),
};

export const volunteerService = {
  register: (data) => api.post('/volunteers/register', data),
};

// ── Food ──────────────────────────────────────────────────────────────────────
export const foodService = {
  // expiry_hours is now part of the data object (0.5–6, validated on backend)
  add:            (data)             => api.post('/foods/add', data),
  getAvailable:   ()                 => api.get('/foods'),
  getByHotel:     (hotelId)         => api.get(`/foods/hotel/${hotelId}`),
  getByRegion:    (region)          => api.get(`/foods/by-region/${encodeURIComponent(region)}`),
  getByVolunteer: (volunteerId)     => api.get(`/foods/volunteer/${volunteerId}`),
  lock:           (foodId, ngoId)   => api.post(`/foods/${foodId}/lock`,       { ngo_id: ngoId }),
  claim:          (foodId, volId)   => api.post(`/foods/${foodId}/claim`,      { volunteer_id: volId }),
  verifyOtp:      (foodId, otpCode) => api.post(`/foods/${foodId}/verify-otp`, { otp_code: otpCode }),
};

export default api;
