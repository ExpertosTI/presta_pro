/**
 * Collectors Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get all collectors
 */
export const getCollectors = async () => {
    const response = await axiosInstance.get('/api/collectors');
    return response.data;
};

/**
 * Create new collector
 */
export const createCollector = async (data) => {
    const response = await axiosInstance.post('/api/collectors', data);
    return response.data;
};

/**
 * Update collector
 */
export const updateCollector = async (id, data) => {
    const response = await axiosInstance.put(`/api/collectors/${id}`, data);
    return response.data;
};

/**
 * Update collector permissions
 */
export const updatePermissions = async (id, permissions) => {
    const response = await axiosInstance.put(`/api/collectors/${id}/permissions`, { permissions });
    return response.data;
};

/**
 * Reset collector password
 */
export const resetPassword = async (id) => {
    const response = await axiosInstance.post(`/api/collectors/${id}/reset-password`);
    return response.data;
};

/**
 * Delete collector
 */
export const deleteCollector = async (id) => {
    const response = await axiosInstance.delete(`/api/collectors/${id}`);
    return response.data;
};

/**
 * Get collector activity
 */
export const getActivity = async (id, page = 1, limit = 50) => {
    const response = await axiosInstance.get(`/api/collectors/${id}/activity`, { params: { page, limit } });
    return response.data;
};

/**
 * Bulk assign clients to collector
 */
export const assignClients = async (collectorId, clientIds) => {
    const response = await axiosInstance.post(`/api/collectors/${collectorId}/assign-clients`, { clientIds });
    return response.data;
};

/**
 * Bulk unassign clients from collector
 */
export const unassignClients = async (collectorId, clientIds = []) => {
    const response = await axiosInstance.post(`/api/collectors/${collectorId}/unassign-clients`, { clientIds });
    return response.data;
};

export default {
    getCollectors,
    createCollector,
    updateCollector,
    updatePermissions,
    resetPassword,
    deleteCollector,
    getActivity,
    assignClients,
    unassignClients
};
