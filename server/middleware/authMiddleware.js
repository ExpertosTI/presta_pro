const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';

// Track failed auth attempts (simple in-memory, use Redis in production for multi-instance)
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 100; // Increased for shared proxy IPs
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes (reduced)

const cleanupFailedAttempts = () => {
    const now = Date.now();
    for (const [key, data] of failedAttempts.entries()) {
        if (now - data.firstAttempt > LOCKOUT_DURATION_MS) {
            failedAttempts.delete(key);
        }
    }
};

// Cleanup every 5 minutes
setInterval(cleanupFailedAttempts, 5 * 60 * 1000);

const authMiddleware = async (req, res, next) => {
    // Get real client IP (check X-Forwarded-For for proxied requests)
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    const authHeader = req.headers.authorization;

    // Check if IP is locked out
    const lockoutData = failedAttempts.get(clientIP);
    if (lockoutData && lockoutData.count >= MAX_FAILED_ATTEMPTS) {
        const remainingLockout = LOCKOUT_DURATION_MS - (Date.now() - lockoutData.firstAttempt);
        if (remainingLockout > 0) {
            console.warn(`🔒 AUTH_LOCKOUT: IP ${clientIP} is locked out for ${Math.ceil(remainingLockout / 1000)}s`);
            return res.status(429).json({
                error: 'Demasiados intentos fallidos. Intenta más tarde.',
                retryAfter: Math.ceil(remainingLockout / 1000)
            });
        }
        // Lockout expired, reset
        failedAttempts.delete(clientIP);
    }

    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Formato de token inválido. Use: Bearer <token>' });
    }

    const token = parts[1];

    // Basic token structure validation (JWT has 3 parts separated by dots)
    if (!token || token.split('.').length !== 3) {
        console.warn(`🚨 AUTH_INVALID_TOKEN_STRUCTURE: IP ${clientIP}, Path: ${req.path}`);
        return res.status(401).json({ error: 'Estructura de token inválida' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Validate required fields in token - allow userId OR collectorId
        if (!decoded.tenantId) {
            console.error(`🚨 AUTH_MISSING_CLAIMS: Token missing tenantId. IP: ${clientIP}`);
            return res.status(403).json({ error: 'Token con datos incompletos. Por favor inicie sesión nuevamente.' });
        }

        // Check if this is a collector token or user token
        if (decoded.collectorId) {
            // Collector token
            req.user = decoded;
            req.tenantId = decoded.tenantId;
            req.collectorId = decoded.collectorId;
            req.isCollector = true;
            console.log(`✅ AUTH_COLLECTOR: Collector ${decoded.collectorId} authenticated`);
        } else if (decoded.userId) {
            // Regular user token
            req.user = decoded;
            req.tenantId = decoded.tenantId;
            req.isCollector = false;
        } else {
            console.error(`🚨 AUTH_MISSING_CLAIMS: Token missing userId and collectorId. IP: ${clientIP}`);
            return res.status(403).json({ error: 'Token con datos incompletos. Por favor inicie sesión nuevamente.' });
        }

        // Check if tenant is suspended (skip for super admins and collectors)
        if (decoded.tenantId && decoded.role?.toUpperCase() !== 'SUPER_ADMIN' && !decoded.collectorId) {
            const prisma = require('../lib/prisma');
            const tenant = await prisma.tenant.findUnique({
                where: { id: decoded.tenantId },
                select: { suspendedAt: true }
            });
            if (tenant?.suspendedAt) {
                console.warn(`⛔ SUSPENDED_TENANT: Tenant ${decoded.tenantId} attempted access`);
                return res.status(403).json({
                    error: 'Tu cuenta ha sido suspendida. Contacta soporte.',
                    suspended: true
                });
            }
        }

        // Reset failed attempts on successful auth
        failedAttempts.delete(clientIP);

        next();
    } catch (error) {
        // Track failed attempt
        const current = failedAttempts.get(clientIP) || { count: 0, firstAttempt: Date.now() };
        current.count++;
        failedAttempts.set(clientIP, current);

        const errorType = error.name === 'TokenExpiredError' ? 'EXPIRED' : 'INVALID';
        console.warn(`🔐 AUTH_FAILED (${errorType}): IP ${clientIP}, Path: ${req.path}, Attempts: ${current.count}`);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada. Por favor inicie sesión nuevamente.' });
        }

        return res.status(403).json({ error: 'Token inválido' });
    }
};

const requireAdmin = (req, res, next) => {
    const role = req.user?.role?.toUpperCase();
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!req.user || !allowedRoles.includes(role)) {
        console.warn(`⛔ ACCESS_DENIED: Admin required. User: ${req.user?.userId || 'unknown'}, Role: ${req.user?.role || 'none'}, Tenant: ${req.tenantId || 'unknown'}`);
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
};

module.exports = { authMiddleware, requireAdmin };

