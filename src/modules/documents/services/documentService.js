/**
 * Document Service - Frontend API
 * PrestaPro by Renace.tech
 */

import api from '../../../services/api';

/**
 * Get all documents for a client
 */
export const getClientDocuments = async (clientId) => {
    const response = await api.get(`/clients/${clientId}/documents`);
    return response;
};

/**
 * Add document to a client
 */
export const addDocument = async (clientId, documentData) => {
    const response = await api.post(`/clients/${clientId}/documents`, documentData);
    return response;
};

/**
 * Delete a document
 */
export const deleteDocument = async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response;
};

export default {
    getClientDocuments,
    addDocument,
    deleteDocument
};
