/**
 * Collectors Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

const throwCollectorError = (error, fallbackMessage) => {
    const message = error?.response?.data?.error || error?.userMessage || fallbackMessage;
    const wrapped = new Error(message);
    wrapped.response = error?.response;
    wrapped.cause = error;
    throw wrapped;
};

/**
 * Get all collectors
 */
export const getCollectors = async () => {
    try {
        const response = await axiosInstance.get('/collectors');
        return Array.isArray(response) ? response : [];
    } catch (error) {
        throwCollectorError(error, 'No se pudieron cargar los cobradores');
    }
};

/**
 * Create new collector
 */
export const createCollector = async (data) => {
    try {
        return await axiosInstance.post('/collectors', data);
    } catch (error) {
        throwCollectorError(error, 'No se pudo crear el cobrador');
    }
};

/**
 * Update collector
 */
export const updateCollector = async (id, data) => {
    try {
        return await axiosInstance.put(`/collectors/${id}`, data);
    } catch (error) {
        throwCollectorError(error, 'No se pudo actualizar el cobrador');
    }
};

/**
 * Update collector permissions
 */
export const updatePermissions = async (id, permissions) => {
    try {
        return await axiosInstance.put(`/collectors/${id}/permissions`, { permissions });
    } catch (error) {
        throwCollectorError(error, 'No se pudieron actualizar los permisos');
    }
};

/**
 * Reset collector password
 */
export const resetPassword = async (id) => {
    try {
        return await axiosInstance.post(`/collectors/${id}/reset-password`);
    } catch (error) {
        throwCollectorError(error, 'No se pudo resetear la contraseña');
    }
};

/**
 * Delete collector
 */
export const deleteCollector = async (id) => {
    try {
        return await axiosInstance.delete(`/collectors/${id}`);
    } catch (error) {
        throwCollectorError(error, 'No se pudo eliminar el cobrador');
    }
};

/**
 * Get collector activity
 */
export const getActivity = async (id, page = 1, limit = 50) => {
    try {
        return await axiosInstance.get(`/collectors/${id}/activity`, { params: { page, limit } });
    } catch (error) {
        throwCollectorError(error, 'No se pudo cargar la actividad del cobrador');
    }
};

/**
 * Bulk assign clients to collector
 */
export const assignClients = async (collectorId, clientIds) => {
    try {
        return await axiosInstance.post(`/collectors/${collectorId}/assign-clients`, { clientIds });
    } catch (error) {
        throwCollectorError(error, 'No se pudieron asignar los clientes');
    }
};

/**
 * Bulk unassign clients from collector
 */
export const unassignClients = async (collectorId, clientIds = []) => {
    try {
        return await axiosInstance.post(`/collectors/${collectorId}/unassign-clients`, { clientIds });
    } catch (error) {
        throwCollectorError(error, 'No se pudieron desasignar los clientes');
    }
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
