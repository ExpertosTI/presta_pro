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
        // In production, don't log errors here - let calling code handle them
        return Promise.reject(error);
    }
);

export default api;
