import api from '../../../services/axiosInstance';

export const clientApi = {
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
