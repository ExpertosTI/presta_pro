/**
 * Admin Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get admin dashboard stats
 */
export const getDashboard = async () => {
    const response = await axiosInstance.get('/admin/dashboard');
    return response;
};

/**
 * Get all tenants
 */
export const getTenants = async (params = {}) => {
    const response = await axiosInstance.get('/admin/tenants', { params });
    return response;
};

/**
 * Get tenant details
 */
export const getTenantDetails = async (id) => {
    const response = await axiosInstance.get(`/admin/tenants/${id}`);
    return response;
};

/**
 * Suspend tenant
 */
export const suspendTenant = async (id, reason) => {
    const response = await axiosInstance.post(`/admin/tenants/${id}/suspend`, { reason });
    return response;
};

/**
 * Activate tenant
 */
export const activateTenant = async (id) => {
    const response = await axiosInstance.post(`/admin/tenants/${id}/activate`);
    return response;
};

/**
 * Update tenant notes
 */
export const updateTenantNotes = async (id, notes, tags) => {
    const response = await axiosInstance.put(`/admin/tenants/${id}/notes`, { notes, tags });
    return response;
};

/**
 * Get pending payments
 */
export const getPendingPayments = async () => {
    const response = await axiosInstance.get('/subscriptions/pending-payments');
    return response;
};

/**
 * Verify payment (approve and activate subscription)
 */
export const verifyPayment = async (id, notes) => {
    const response = await axiosInstance.post(`/subscriptions/approve-payment/${id}`, { notes });
    return response;
};

/**
 * Reject payment
 */
export const rejectPayment = async (id, reason) => {
    const response = await axiosInstance.post(`/subscriptions/reject-payment/${id}`, { reason });
    return response;
};

/**
 * Get audit logs
 */
export const getLogs = async (params = {}) => {
    const response = await axiosInstance.get('/admin/logs', { params });
    return response;
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
