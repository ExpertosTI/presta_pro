import api from '../../../services/axiosInstance';

export const loanApi = {
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
    delete: (id) => api.delete(`/loans/${id}`),
};
