/**
 * Logger Service
 * RenKredit by Renace.tech
 * 
 * Logger estructurado usando Winston para reemplazar console.log
 */

const winston = require('winston');
const path = require('path');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Formato personalizado para desarrollo
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

// Formato JSON para producción
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Crear transports
const transports = [
    // Siempre escribir a consola
    new winston.transports.Console({
        format: IS_PRODUCTION ? prodFormat : devFormat,
        level: IS_PRODUCTION ? 'info' : 'debug'
    })
];

// En producción, también escribir a archivos
if (IS_PRODUCTION) {
    const logsDir = path.join(__dirname, '..', 'logs');

    transports.push(
        // Archivo de errores
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Archivo combinado
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Crear logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
    transports,
    // No salir en errores no manejados
    exitOnError: false,
});

// Métodos de conveniencia con contexto
const createContextLogger = (context) => ({
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { context, ...meta }),
});

// Logger de auditoría específico
const auditLogger = createContextLogger('AUDIT');

// Función para registrar auditoría
const logAudit = (action, userId, tenantId, details = {}) => {
    auditLogger.info(action, {
        userId,
        tenantId,
        ...details,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    logger,
    createContextLogger,
    logAudit,
    // Exportar métodos directamente para uso simple
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
};
