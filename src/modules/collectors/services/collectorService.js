/**
 * Collectors Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get all collectors
 */
export const getCollectors = async () => {
    const response = await axiosInstance.get('/collectors');
    return response;
};

/**
 * Create new collector
 */
export const createCollector = async (data) => {
    const response = await axiosInstance.post('/collectors', data);
    return response;
};

/**
 * Update collector
 */
export const updateCollector = async (id, data) => {
    const response = await axiosInstance.put(`/collectors/${id}`, data);
    return response;
};

/**
 * Update collector permissions
 */
export const updatePermissions = async (id, permissions) => {
    const response = await axiosInstance.put(`/collectors/${id}/permissions`, { permissions });
    return response;
};

/**
 * Reset collector password
 */
export const resetPassword = async (id) => {
    const response = await axiosInstance.post(`/collectors/${id}/reset-password`);
    return response;
};

/**
 * Delete collector
 */
export const deleteCollector = async (id) => {
    const response = await axiosInstance.delete(`/collectors/${id}`);
    return response;
};

/**
 * Get collector activity
 */
export const getActivity = async (id, page = 1, limit = 50) => {
    const response = await axiosInstance.get(`/collectors/${id}/activity`, { params: { page, limit } });
    return response;
};

/**
 * Bulk assign clients to collector
 */
export const assignClients = async (collectorId, clientIds) => {
    const response = await axiosInstance.post(`/collectors/${collectorId}/assign-clients`, { clientIds });
    return response;
};

/**
 * Bulk unassign clients from collector
 */
export const unassignClients = async (collectorId, clientIds = []) => {
    const response = await axiosInstance.post(`/collectors/${collectorId}/unassign-clients`, { clientIds });
    return response;
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
