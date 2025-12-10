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

// Expense Service
export const expenseService = {
    getAll: async () => {
        try {
            return await api.get('/expenses');
        } catch (e) {
            console.error('expenseService.getAll error:', e);
            return [];
        }
    },
    create: (data) => api.post('/expenses', data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

// Collector Service (RRHH)
export const collectorService = {
    getAll: async () => {
        try {
            return await api.get('/collectors');
        } catch (e) {
            console.error('collectorService.getAll error:', e);
            return [];
        }
    },
    create: (data) => api.post('/collectors', data),
    update: (id, data) => api.put(`/collectors/${id}`, data),
    delete: (id) => api.delete(`/collectors/${id}`),
};

export default api;

