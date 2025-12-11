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
    create: async (data) => {
        try {
            return await api.post('/loans', data);
        } catch (e) {
            console.error('loanService.create error:', e?.response?.data || e.message);
            throw new Error(e?.response?.data?.details || e?.response?.data?.error || 'Error al crear préstamo');
        }
    },
    update: (id, data) => api.put(`/loans/${id}`, data),
    delete: (id) => api.delete(`/loans/${id}`),
};
