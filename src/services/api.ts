import type {
  TenantCreateRequest,
  TenantUpdateRequest,
  PlayerCreateRequest,
  PlayerUpdateRequest,
  MatchCreateRequest,
  MatchUpdateRequest,
  TrainingSessionCreateRequest,
  TrainingSessionUpdateRequest,
  AchievementProgressUpdateRequest,
  SettingsUpdateRequest,
  SettingUpdateRequest,
  BugReportCreateRequest,
} from '../types/api';

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
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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
    // Include status code in error message for proper error handling
    const statusText = response.status === 429 ? 'Too Many Requests' : 
                       response.status === 401 ? 'Unauthorized' :
                       response.status === 403 ? 'Forbidden' : '';
    throw new Error(error.error || `HTTP ${response.status}${statusText ? ` ${statusText}` : ''}`);
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

    updateProfile: (name: string, avatar: string) =>
      apiClient('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, avatar }),
      }),

    updateEmail: (newEmail: string, password: string) =>
      apiClient('/api/auth/email', {
        method: 'PATCH',
        body: JSON.stringify({ newEmail, password }),
      }),

    deleteAccount: (password: string) =>
      apiClient('/api/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      }),

    getMainPlayer: () => apiClient('/api/auth/main-player'),

    setMainPlayer: (playerId: string) =>
      apiClient('/api/auth/main-player', {
        method: 'PUT',
        body: JSON.stringify({ playerId }),
      }),
  },

  // Tenants
  tenants: {
    getAll: () => apiClient('/api/tenants'),
    
    create: (tenant: TenantCreateRequest) =>
      apiClient('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(tenant),
      }),

    update: (id: string, tenant: TenantUpdateRequest) =>
      apiClient(`/api/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tenant),
      }),
    
    delete: (id: string) =>
      apiClient(`/api/tenants/${id}`, {
        method: 'DELETE',
      }),
  },

  // Players
  players: {
    getAll: () => apiClient('/api/players'),
    
    getById: (id: string) => apiClient(`/api/players/${id}`),
    
    create: (player: PlayerCreateRequest) =>
      apiClient('/api/players', {
        method: 'POST',
        body: JSON.stringify(player),
      }),

    update: (id: string, player: PlayerUpdateRequest) =>
      apiClient(`/api/players/${id}`, {
        method: 'PUT',
        body: JSON.stringify(player),
      }),
    
    delete: (id: string) =>
      apiClient(`/api/players/${id}`, {
        method: 'DELETE',
      }),
    
    // Heatmap
    getHeatmap: (id: string) => apiClient(`/api/players/${id}/heatmap`),
    
    getHeatmapsBatch: () => apiClient('/api/players/heatmaps/batch'),
    
    updateHeatmap: (id: string, heatmapData: unknown) =>
      apiClient(`/api/players/${id}/heatmap`, {
        method: 'POST',
        body: JSON.stringify(heatmapData),
      }),

    resetStats: (id: string) =>
      apiClient(`/api/players/${id}/reset-stats`, {
        method: 'POST',
      }),
  },

  // Matches
  matches: {
    getAll: (params?: { limit?: string; offset?: string; status?: string }, options?: RequestInit) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit);
      if (params?.offset) queryParams.append('offset', params.offset);
      if (params?.status) queryParams.append('status', params.status);
      const queryString = queryParams.toString();
      return apiClient(`/api/matches${queryString ? `?${queryString}` : ''}`, options);
    },

    getById: (id: string, options?: RequestInit) => apiClient(`/api/matches/${id}`, options),

    create: (match: MatchCreateRequest, options?: RequestInit) =>
      apiClient('/api/matches', {
        method: 'POST',
        body: JSON.stringify(match),
        ...options,
      }),

    update: (id: string, match: MatchUpdateRequest, options?: RequestInit) =>
      apiClient(`/api/matches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(match),
        ...options,
      }),

    getResumable: (options?: RequestInit) =>
      apiClient('/api/matches?status=paused,in-progress&limit=20', options),

    delete: (id: string, options?: RequestInit) =>
      apiClient(`/api/matches/${id}`, {
        method: 'DELETE',
        ...options,
      }),
  },

  // Training
  training: {
    getAll: () => apiClient('/api/training'),
    
    getById: (id: string) => apiClient(`/api/training/${id}`),
    
    create: (session: TrainingSessionCreateRequest) =>
      apiClient('/api/training', {
        method: 'POST',
        body: JSON.stringify(session),
      }),

    update: (id: string, session: TrainingSessionUpdateRequest) =>
      apiClient(`/api/training/${id}`, {
        method: 'PUT',
        body: JSON.stringify(session),
      }),
    
    delete: (id: string) =>
      apiClient(`/api/training/${id}`, {
        method: 'DELETE',
      }),
  },

  // Achievements
  achievements: {
    getAll: () => apiClient('/api/achievements'),
    
    getByPlayer: (playerId: string) => apiClient(`/api/achievements/player/${playerId}`),
    
    unlock: (playerId: string, achievementId: string) =>
      apiClient(`/api/achievements/player/${playerId}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ achievementId }),
      }),
    
    updateProgress: (playerId: string, achievements: AchievementProgressUpdateRequest['achievements']) =>
      apiClient(`/api/achievements/player/${playerId}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ achievements }),
      }),
  },

  // Settings
  settings: {
    get: () => apiClient('/api/settings'),
    
    update: (settings: any) =>
      apiClient('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    
    updateSetting: (key: string, value: any) =>
      apiClient(`/api/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      }),
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

  // Admin
  admin: {
    getUsers: () => apiClient('/api/admin/users'),

    getStats: () => apiClient('/api/admin/stats'),

    updateSubscription: (userId: string, data: { subscriptionStatus: string; subscriptionPlan?: string; subscriptionEndsAt?: number }) =>
      apiClient(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    grantLifetime: (userId: string) =>
      apiClient(`/api/admin/users/${userId}/grant-lifetime`, {
        method: 'POST',
      }),

    revokeAccess: (userId: string) =>
      apiClient(`/api/admin/users/${userId}/revoke`, {
        method: 'POST',
      }),

    deleteUser: (userId: string) =>
      apiClient(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      }),

    makeAdmin: (userId: string) =>
      apiClient(`/api/admin/users/${userId}/make-admin`, {
        method: 'POST',
      }),

    removeAdmin: (userId: string) =>
      apiClient(`/api/admin/users/${userId}/admin`, {
        method: 'DELETE',
      }),
  },

  // Bug Reports
  bugReports: {
    getAll: (filters?: { status?: string; severity?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      const queryString = params.toString();
      return apiClient(`/api/bug-reports${queryString ? `?${queryString}` : ''}`);
    },

    getMyReports: () => apiClient('/api/bug-reports'),

    create: (data: {
      title: string;
      description: string;
      severity: string;
      category: string;
      screenshotUrl?: string;
      browserInfo?: any;
      route?: string;
    }) => apiClient('/api/bug-reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getById: (id: string) => apiClient(`/api/bug-reports/${id}`),

    updateStatus: (id: string, status: string) =>
      apiClient(`/api/bug-reports/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    updateNotes: (id: string, notes: string) =>
      apiClient(`/api/bug-reports/${id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      }),

    delete: (id: string) =>
      apiClient(`/api/bug-reports/${id}`, {
        method: 'DELETE',
      }),
  },
};

export default api;
