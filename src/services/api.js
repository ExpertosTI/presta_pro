import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Interceptor para errores (401 -> Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token inválido o expirado
            console.error('Sesión expirada o token inválido (401). Cerrando sesión...');

            // Only redirect if NOT already on login page to avoid loops
            if (!window.location.pathname.includes('/login') && !window.location.search.includes('error=session_expired')) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('rt_session');
                window.location.href = '/?error=session_expired';
            }
        }
        return Promise.reject(error);
    }
);

// Interceptor para errores (401 -> Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token inválido o expirado
            localStorage.removeItem('authToken');
            localStorage.removeItem('rt_session');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/?error=session_expired';
            }
        }
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

// Data Services
export const clientService = {
    getAll: () => api.get('/clients'),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`),
};

export const loanService = {
    getAll: () => api.get('/loans'),
    create: (data) => api.post('/loans', data),
    update: (id, data) => api.put(`/loans/${id}`, data),
};

export const paymentService = {
    getAll: () => api.get('/payments'),
    create: (data) => api.post('/payments', data),
};

// Sync Service
export const syncService = {
    syncData: (data) => api.post('/sync', data),
};

export default api;
