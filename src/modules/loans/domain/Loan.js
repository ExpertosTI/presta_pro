/**
 * Loan Domain Entity
 * Defines the loan structure and validation rules
 */

/**
 * @typedef {'Diario'|'Semanal'|'Quincenal'|'Mensual'} Frequency
 */

/**
 * @typedef {'ACTIVE'|'PAID'|'DEFAULTED'|'CANCELLED'} LoanStatus
 */

/**
 * @typedef {Object} Installment
 * @property {string} id - Unique identifier
 * @property {number} number - Installment number (1-indexed)
 * @property {string} date - Due date (ISO string)
 * @property {number} payment - Total payment amount
 * @property {number} principal - Principal portion
 * @property {number} interest - Interest portion
 * @property {number} balance - Remaining balance after payment
 * @property {'PENDING'|'PAID'|'PARTIAL'} status
 */

/**
 * @typedef {Object} Loan
 * @property {string} id - Unique identifier
 * @property {string} tenantId - Tenant ownership
 * @property {string} clientId - Associated client
 * @property {number} amount - Principal amount
 * @property {number} rate - Interest rate (percentage)
 * @property {number} term - Number of installments
 * @property {Frequency} frequency - Payment frequency
 * @property {string} startDate - Loan start date (ISO string)
 * @property {LoanStatus} status - Current loan status
 * @property {number} totalPaid - Amount paid so far
 * @property {number} totalInterest - Calculated total interest
 * @property {Installment[]} schedule - Amortization schedule
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * Validates loan data for creation
 * @param {Partial<Loan>} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLoan(data) {
    const errors = [];

    // Required fields
    if (!data.clientId) {
        errors.push('Debe seleccionar un cliente');
    }

    if (!data.amount || parseFloat(data.amount) <= 0) {
        errors.push('El monto debe ser mayor a 0');
    }

    if (data.rate === undefined || parseFloat(data.rate) < 0) {
        errors.push('La tasa de interés no puede ser negativa');
    }

    if (!data.term || parseInt(data.term) < 1) {
        errors.push('El plazo debe ser al menos 1 cuota');
    }

    const validFrequencies = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];
    if (data.frequency && !validFrequencies.includes(data.frequency)) {
        errors.push('Frecuencia de pago no válida');
    }

    if (!data.startDate) {
        errors.push('La fecha de inicio es requerida');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Creates a new loan object with defaults
 * @param {Partial<Loan>} data
 * @returns {Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'schedule'>}
 */
export function createLoan(data) {
    const amount = parseFloat(data.amount) || 0;
    const rate = parseFloat(data.rate) || 0;
    const term = parseInt(data.term) || 1;

    return {
        clientId: data.clientId,
        amount,
        rate,
        term,
        frequency: data.frequency || 'Mensual',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        totalPaid: 0,
        totalInterest: amount * (rate / 100)
    };
}

/**
 * Calculates loan progress percentage
 * @param {Loan} loan
 * @returns {number} 0-100
 */
export function getLoanProgress(loan) {
    if (!loan.schedule || loan.schedule.length === 0) return 0;
    const paidCount = loan.schedule.filter(s => s.status === 'PAID').length;
    return Math.round((paidCount / loan.schedule.length) * 100);
}

/**
 * Gets next pending installment
 * @param {Loan} loan
 * @returns {Installment | null}
 */
export function getNextInstallment(loan) {
    if (!loan.schedule) return null;
    return loan.schedule.find(s => s.status !== 'PAID') || null;
}

/**
 * Gets overdue installments count
 * @param {Loan} loan
 * @returns {number}
 */
export function getOverdueCount(loan) {
    if (!loan.schedule) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return loan.schedule.filter(s => {
        const dueDate = new Date(s.date);
        return s.status !== 'PAID' && dueDate < today;
    }).length;
}

export default {
    validateLoan,
    createLoan,
    getLoanProgress,
    getNextInstallment,
    getOverdueCount
};
