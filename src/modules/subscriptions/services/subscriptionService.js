/**
 * Subscription Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get current subscription status
 */
export const getMySubscription = async () => {
    const response = await axiosInstance.get('/api/subscriptions/my-subscription');
    return response.data;
};

/**
 * Get available plans
 */
export const getPlans = async () => {
    const response = await axiosInstance.get('/api/subscriptions/plans');
    return response.data;
};

/**
 * Create upgrade/payment intent (placeholder for actual payment gateway)
 */
export const createPaymentIntent = async (planId, interval) => {
    const response = await axiosInstance.post('/api/subscriptions/create-intent', { planId, interval });
    return response.data;
};

/**
 * Upload manual payment proof
 */
export const uploadPaymentProof = async (formData) => {
    const response = await axiosInstance.post('/api/subscriptions/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

/**
 * Cancel subscription (downgrade to free at end of period)
 */
export const cancelSubscription = async () => {
    const response = await axiosInstance.post('/api/subscriptions/cancel');
    return response.data;
};

export default {
    getMySubscription,
    getPlans,
    createPaymentIntent,
    uploadPaymentProof,
    cancelSubscription
};
