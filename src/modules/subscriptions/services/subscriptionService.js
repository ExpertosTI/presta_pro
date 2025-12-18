/**
 * Subscription Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get current subscription status
 */
export const getMySubscription = async () => {
    const response = await axiosInstance.get('/subscriptions/my-subscription');
    return response;
};

/**
 * Get available plans
 */
export const getPlans = async () => {
    const response = await axiosInstance.get('/subscriptions/plans');
    return response;
};

/**
 * Create upgrade/payment intent (placeholder for actual payment gateway)
 */
export const createPaymentIntent = async (planId, interval) => {
    const response = await axiosInstance.post('/subscriptions/create-intent', { planId, interval });
    return response;
};

/**
 * Upload manual payment proof
 */
export const uploadPaymentProof = async (formData) => {
    const response = await axiosInstance.post('/subscriptions/upload-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
};

/**
 * Cancel subscription (downgrade to free at end of period)
 */
export const cancelSubscription = async () => {
    const response = await axiosInstance.post('/subscriptions/cancel');
    return response;
};

/**
 * Create PayPal order for subscription payment
 */
export const createPayPalOrder = async (planId, interval = 'monthly') => {
    const response = await axiosInstance.post('/subscriptions/paypal/create-order', { planId, interval });
    return response;
};

/**
 * Capture PayPal payment after user approval
 */
export const capturePayPalOrder = async (orderId) => {
    const response = await axiosInstance.post('/subscriptions/paypal/capture-order', { orderId });
    return response;
};

/**
 * Get PayPal order status
 */
export const getPayPalOrderStatus = async (orderId) => {
    const response = await axiosInstance.get(`/subscriptions/paypal/order/${orderId}`);
    return response;
};

export default {
    getMySubscription,
    getPlans,
    createPaymentIntent,
    uploadPaymentProof,
    cancelSubscription,
    createPayPalOrder,
    capturePayPalOrder,
    getPayPalOrderStatus
};
