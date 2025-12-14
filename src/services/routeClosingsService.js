/**
 * Route Closings Service
 * PrestaPro by Renace.tech
 * 
 * Frontend service for collector route closings API
 */

import axiosInstance from './axiosInstance';

/**
 * Get all route closings for the current tenant
 */
export const getRouteClosings = async () => {
    const response = await axiosInstance.get('/route-closings');
    return response.data;
};

/**
 * Get route closings for a specific collector
 */
export const getClosingsByCollector = async (collectorId) => {
    const response = await axiosInstance.get(`/route-closings/collector/${collectorId}`);
    return response.data;
};

/**
 * Create a new route closing
 */
export const createRouteClosing = async (closingData) => {
    const response = await axiosInstance.post('/route-closings', closingData);
    return response.data;
};

/**
 * Delete a route closing
 */
export const deleteRouteClosing = async (id) => {
    const response = await axiosInstance.delete(`/route-closings/${id}`);
    return response.data;
};

export default {
    getRouteClosings,
    getClosingsByCollector,
    createRouteClosing,
    deleteRouteClosing
};
