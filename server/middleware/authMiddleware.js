const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'prestapro_dev_jwt_secret_change_me';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Formato de token inválido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, tenantId, role, ... }
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = authMiddleware;
