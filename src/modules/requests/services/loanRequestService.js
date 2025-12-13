/**
 * Loan Request Service - Frontend API
 * PrestaPro by Renace.tech
 */

import api from '../../../services/api';

/**
 * Get all loan requests
 */
export const getLoanRequests = async () => {
    const response = await api.get('/loan-requests');
    return response;
};

/**
 * Get single loan request
 */
export const getLoanRequest = async (id) => {
    const response = await api.get(`/loan-requests/${id}`);
    return response;
};

/**
 * Create new loan request
 */
export const createLoanRequest = async (data) => {
    const response = await api.post('/loan-requests', data);
    return response;
};

/**
 * Approve loan request
 */
export const approveLoanRequest = async (id) => {
    const response = await api.put(`/loan-requests/${id}/approve`);
    return response;
};

/**
 * Reject loan request
 */
export const rejectLoanRequest = async (id) => {
    const response = await api.put(`/loan-requests/${id}/reject`);
    return response;
};

/**
 * Delete loan request
 */
export const deleteLoanRequest = async (id) => {
    const response = await api.delete(`/loan-requests/${id}`);
    return response;
};

export default {
    getLoanRequests,
    getLoanRequest,
    createLoanRequest,
    approveLoanRequest,
    rejectLoanRequest,
    deleteLoanRequest
};
