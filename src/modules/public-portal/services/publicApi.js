import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Service for public loan application API calls
 * No authentication required
 */
export const publicApi = {
    /**
     * Get tenant public info by slug
     * @param {string} slug - Tenant slug
     * @returns {Promise<{name: string, slug: string, isActive: boolean}>}
     */
    getTenantInfo: async (slug) => {
        const response = await axios.get(`${API_BASE}/api/public/tenant/${slug}`);
        return response.data;
    },

    /**
     * Submit a public loan application
     * @param {Object} data - Application data
     * @param {string} data.tenantSlug - Tenant slug
     * @param {string} data.applicantName - Full name
     * @param {string} data.applicantPhone - Phone number
     * @param {string} [data.applicantEmail] - Email (optional)
     * @param {string} [data.applicantIdNumber] - ID number / Cédula (optional)
     * @param {string} [data.applicantAddress] - Address (optional)
     * @param {number} data.amountRequested - Loan amount requested
     * @param {string} [data.purpose] - Purpose of the loan (optional)
     * @param {string} [data.notes] - Additional notes (optional)
     * @returns {Promise<{success: boolean, message: string, applicationId: string}>}
     */
    submitLoanApplication: async (data) => {
        const response = await axios.post(`${API_BASE}/api/public/loan-application`, data);
        return response.data;
    }
};
