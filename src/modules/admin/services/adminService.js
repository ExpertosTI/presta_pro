/**
 * Admin Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get admin dashboard stats
 */
export const getDashboard = async () => {
    const response = await axiosInstance.get('/api/admin/dashboard');
    return response.data;
};

/**
 * Get all tenants
 */
export const getTenants = async (params = {}) => {
    const response = await axiosInstance.get('/api/admin/tenants', { params });
    return response.data;
};

/**
 * Get tenant details
 */
export const getTenantDetails = async (id) => {
    const response = await axiosInstance.get(`/api/admin/tenants/${id}`);
    return response.data;
};

/**
 * Suspend tenant
 */
export const suspendTenant = async (id, reason) => {
    const response = await axiosInstance.post(`/api/admin/tenants/${id}/suspend`, { reason });
    return response.data;
};

/**
 * Activate tenant
 */
export const activateTenant = async (id) => {
    const response = await axiosInstance.post(`/api/admin/tenants/${id}/activate`);
    return response.data;
};

/**
 * Update tenant notes
 */
export const updateTenantNotes = async (id, notes, tags) => {
    const response = await axiosInstance.put(`/api/admin/tenants/${id}/notes`, { notes, tags });
    return response.data;
};

/**
 * Get pending payments
 */
export const getPendingPayments = async () => {
    const response = await axiosInstance.get('/api/admin/payments/pending');
    return response.data;
};

/**
 * Verify payment
 */
export const verifyPayment = async (id, notes) => {
    const response = await axiosInstance.post(`/api/admin/payments/${id}/verify`, { notes });
    return response.data;
};

/**
 * Reject payment
 */
export const rejectPayment = async (id, reason) => {
    const response = await axiosInstance.post(`/api/admin/payments/${id}/reject`, { reason });
    return response.data;
};

/**
 * Get audit logs
 */
export const getLogs = async (params = {}) => {
    const response = await axiosInstance.get('/api/admin/logs', { params });
    return response.data;
};

export default {
    getDashboard,
    getTenants,
    getTenantDetails,
    suspendTenant,
    activateTenant,
    updateTenantNotes,
    getPendingPayments,
    verifyPayment,
    rejectPayment,
    getLogs
};
