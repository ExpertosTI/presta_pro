/**
 * Client Domain Entity
 * Defines the client structure and validation rules
 */

/**
 * @typedef {Object} Client
 * @property {string} id - Unique identifier
 * @property {string} tenantId - Tenant ownership
 * @property {string} name - Full name (required)
 * @property {string} [phone] - Contact phone
 * @property {string} [email] - Email address
 * @property {string} [address] - Physical address
 * @property {string} [idNumber] - Government ID (cédula)
 * @property {string} [photoUrl] - Profile photo URL
 * @property {string} [collectorId] - Assigned collector
 * @property {'ACTIVE'|'INACTIVE'} status - Client status
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Validates client data for creation/update
 * @param {Partial<Client>} data - Client data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateClient(data) {
    const errors = [];

    // Required fields
    if (!data.name || data.name.trim().length < 2) {
        errors.push('El nombre es requerido (mínimo 2 caracteres)');
    }

    // Optional validations
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('El correo electrónico no es válido');
    }

    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
        errors.push('El teléfono contiene caracteres inválidos');
    }

    if (data.idNumber && data.idNumber.length < 5) {
        errors.push('El número de identificación debe tener al menos 5 caracteres');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Creates a new client object with defaults
 * @param {Partial<Client>} data - Partial client data
 * @returns {Omit<Client, 'id' | 'createdAt' | 'updatedAt'>}
 */
export function createClient(data) {
    return {
        name: data.name?.trim() || '',
        phone: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
        address: data.address?.trim() || null,
        idNumber: data.idNumber?.trim() || null,
        photoUrl: data.photoUrl || null,
        collectorId: data.collectorId || null,
        status: data.status || 'ACTIVE'
    };
}

/**
 * Formats client for display
 * @param {Client} client
 * @returns {string}
 */
export function formatClientName(client) {
    return client?.name || 'Cliente sin nombre';
}

export default {
    validateClient,
    createClient,
    formatClientName
};
