import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// Auth
export const auth = {
  signup: async (email: string, password: string) => {
    const res = await api.post('/auth/signup', { email, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore server errors - still clear local auth
      console.log('Logout API call failed, but clearing local auth anyway');
    }
    // Always clear local storage and headers
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// Companies
export const companies = {
  list: async () => {
    const res = await api.get('/companies');
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/companies/${id}`);
    return res.data;
  },
  create: async (data: { domain: string; displayName: string; categories: string[] }) => {
    const res = await api.post('/companies', data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/companies/${id}`);
    return res.data;
  },
};

// Crawl
export const crawl = {
  run: async (companyId?: string) => {
    const res = await api.post('/crawl/run', { companyId });
    return res.data;
  },
  status: async (companyId?: string) => {
    const res = await api.get('/crawl/status', { params: { companyId } });
    return res.data;
  },
};

// Claims
export const claims = {
  list: async (companyId?: string) => {
    const res = await api.get('/claims', { params: { companyId } });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/claims/${id}`);
    return res.data;
  },
  versions: async (id: string) => {
    const res = await api.get(`/claims/${id}/versions`);
    return res.data;
  },
};

// Events
export const events = {
  list: async (params?: { companyId?: string; severity?: string }) => {
    const res = await api.get('/events', { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/events/${id}`);
    return res.data;
  },
  acknowledge: async (id: string) => {
    const res = await api.post(`/events/${id}/ack`);
    return res.data;
  },
};

// Evidence
export const evidence = {
  list: async (companyId?: string) => {
    const res = await api.get('/evidence', { params: { companyId } });
    return res.data;
  },
};

// Demo
export const demo = {
  seed: async () => {
    const res = await api.post('/demo/seed');
    return res.data;
  },
  run: async () => {
    const res = await api.post('/demo/run');
    return res.data;
  },
};
