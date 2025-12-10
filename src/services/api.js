import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Response interceptor to unwrap data
api.interceptors.response.use(
    (response) => response.data, // Unwrap response to return only data
    (error) => {
        console.error('API Error:', error?.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Auth Services
export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    googleLogin: (token) => api.post('/auth/google', { token }),
    verifyToken: () => api.get('/auth/verify'),
};

// Data Services - now return data directly
export const clientService = {
    getAll: async () => {
        try {
            return await api.get('/clients');
        } catch (e) {
            console.error('clientService.getAll error:', e);
            return [];
        }
    },
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`),
};

export const loanService = {
    getAll: async () => {
        try {
            return await api.get('/loans');
        } catch (e) {
            console.error('loanService.getAll error:', e);
            return [];
        }
    },
    create: (data) => api.post('/loans', data),
    update: (id, data) => api.put(`/loans/${id}`, data),
};

export const paymentService = {
    getAll: async () => {
        try {
            return await api.get('/payments');
        } catch (e) {
            console.error('paymentService.getAll error:', e);
            return [];
        }
    },
    create: (data) => api.post('/payments', data),
};

// Sync Service
export const syncService = {
    syncData: (data) => api.post('/sync', data),
    pull: async (type) => {
        // Placeholder - returns empty array until backend implements this
        console.warn(`syncService.pull('${type}') not implemented, returning empty array`);
        return [];
    }
};

export default api;

