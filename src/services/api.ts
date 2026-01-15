const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Remove auth token
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

// API client with auth header
const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Auth
  auth: {
    register: (email: string, password: string, name: string) =>
      apiClient('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    logout: () => {
      removeAuthToken();
    },

    verifyEmail: (token: string) =>
      apiClient(`/api/auth/verify-email/${token}`),

    forgotPassword: (email: string) =>
      apiClient('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      apiClient('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),

    resendVerification: (email: string) =>
      apiClient('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    getMe: () => apiClient('/api/auth/me'),

    googleAuth: () => {
      window.location.href = `${API_URL}/api/auth/google`;
    },
  },

  // Payment
  payment: {
    createCheckout: (plan: 'monthly' | 'lifetime') =>
      apiClient('/api/payment/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),

    createPortal: () =>
      apiClient('/api/payment/create-portal', {
        method: 'POST',
      }),

    getStatus: () => apiClient('/api/payment/status'),
  },
};

export default api;
