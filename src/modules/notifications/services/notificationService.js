/**
 * Notifications Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get all notifications
 */
export const getNotifications = async () => {
    const response = await axiosInstance.get('/api/notifications');
    return response.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
    const response = await axiosInstance.post(`/api/notifications/${notificationId}/read`);
    return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
    const response = await axiosInstance.post('/api/notifications/read-all');
    return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
    const response = await axiosInstance.delete(`/api/notifications/${notificationId}`);
    return response.data;
};

/**
 * Get email preferences
 */
export const getEmailPreferences = async () => {
    const response = await axiosInstance.get('/api/notifications/preferences');
    return response.data;
};

/**
 * Update email preferences
 */
export const updateEmailPreferences = async (preferences) => {
    const response = await axiosInstance.put('/api/notifications/preferences', preferences);
    return response.data;
};

/**
 * Send test email
 */
export const sendTestEmail = async (email) => {
    const response = await axiosInstance.post('/api/notifications/test-email', { email });
    return response.data;
};

export default {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getEmailPreferences,
    updateEmailPreferences,
    sendTestEmail
};
