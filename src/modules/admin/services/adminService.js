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

/**
 * Send broadcast notification to all tenants
 */
export const sendBroadcast = async (title, message, sendEmail = false) => {
    const response = await axiosInstance.post('/admin/broadcast', {
        title,
        message,
        sendEmail
    });
    return response;
};

/**
 * Change tenant's subscription plan
 * @param {string} tenantId - Tenant ID
 * @param {string} plan - Plan: FREE, PRO, ENTERPRISE
 * @param {number} months - Duration in months
 * @param {string} reason - Reason for change
 */
export const changePlan = async (tenantId, plan, months, reason) => {
    const response = await axiosInstance.put(`/admin/tenants/${tenantId}/plan`, {
        plan,
        months,
        reason
    });
    return response;
};

/**
 * Extend tenant's subscription
 * @param {string} tenantId - Tenant ID
 * @param {number} days - Days to add
 * @param {string} reason - Reason for extension
 */
export const extendSubscription = async (tenantId, days, reason) => {
    const response = await axiosInstance.post(`/admin/tenants/${tenantId}/extend`, {
        days,
        reason
    });
    return response;
};

/**
 * Reset password for a tenant's user
 * @param {string} tenantId - Tenant ID
 * @param {string} userId - Optional specific user ID
 */
export const resetPassword = async (tenantId, userId = null) => {
    const response = await axiosInstance.post(`/admin/tenants/${tenantId}/reset-password`, {
        userId
    });
    return response;
};

/**
 * Send direct email to tenant
 * @param {string} tenantId - Tenant ID
 * @param {string} subject - Email subject
 * @param {string} message - Email body
 */
export const sendDirectEmail = async (tenantId, subject, message) => {
    const response = await axiosInstance.post(`/admin/tenants/${tenantId}/send-email`, {
        subject,
        message
    });
    return response;
};

/**
 * Get admin action history for a tenant
 * @param {string} tenantId - Tenant ID
 */
export const getTenantHistory = async (tenantId) => {
    const response = await axiosInstance.get(`/admin/tenants/${tenantId}/history`);
    return response;
};

/**
 * Downgrade tenant to FREE plan
 * @param {string} tenantId - Tenant ID
 * @param {string} reason - Reason for downgrade
 */
export const downgradePlan = async (tenantId, reason) => {
    const response = await axiosInstance.post(`/admin/tenants/${tenantId}/downgrade`, {
        reason
    });
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
    getLogs,
    sendBroadcast,
    changePlan,
    extendSubscription,
    resetPassword,
    sendDirectEmail,
    getTenantHistory,
    downgradePlan
};
