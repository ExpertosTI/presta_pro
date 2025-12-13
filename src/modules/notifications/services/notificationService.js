/**
 * Notifications Service - Frontend API
 * PrestaPro by Renace.tech
 */

import axiosInstance from '../../../services/api';

/**
 * Get all notifications
 */
export const getNotifications = async () => {
    const response = await axiosInstance.get('/notifications');
    return response; // axiosInstance already unwraps .data
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
    const response = await axiosInstance.post(`/notifications/${notificationId}/read`);
    return response;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
    const response = await axiosInstance.post('/notifications/read-all');
    return response;
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
    const response = await axiosInstance.delete(`/notifications/${notificationId}`);
    return response;
};

/**
 * Get email preferences
 */
export const getEmailPreferences = async () => {
    const response = await axiosInstance.get('/notifications/preferences');
    return response;
};

/**
 * Update email preferences
 */
export const updateEmailPreferences = async (preferences) => {
    const response = await axiosInstance.put('/notifications/preferences', preferences);
    return response;
};

/**
 * Send test email
 */
export const sendTestEmail = async (email) => {
    const response = await axiosInstance.post('/notifications/test-email', { email });
    return response;
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
