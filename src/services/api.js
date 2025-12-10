import api from './axiosInstance';
import { clientApi } from '../modules/clients/infrastructure/clientApi';
import { loanApi } from '../modules/loans/infrastructure/loanApi';

// Auth Services
export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    googleLogin: (token) => api.post('/auth/google', { token }),
    verifyToken: () => api.get('/auth/verify'),
};

// Data Services - now return data directly
export const clientService = clientApi;
export const loanService = loanApi;

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

// Settings Service
export const settingsService = {
    get: async () => {
        try {
            return await api.get('/settings');
        } catch (e) {
            console.error('settingsService.get error:', e);
            return null;
        }
    },
    update: (data) => api.put('/settings', data),
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

