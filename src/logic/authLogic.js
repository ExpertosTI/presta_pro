
import bcrypt from 'bcryptjs';

// Helper to hash passwords using bcrypt
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

export const ROLES = {
    ADMIN: 'ADMIN',
    COLLECTOR: 'COLLECTOR',
};

export const PERMISSIONS = {
    [ROLES.ADMIN]: ['dashboard', 'clients', 'loans', 'expenses', 'requests', 'routes', 'documents', 'notes', 'reports', 'hr', 'accounting', 'ai', 'calculator', 'settings'],
    [ROLES.COLLECTOR]: ['dashboard', 'clients', 'loans', 'routes', 'documents', 'notes'], // Restricted access
};

export const validateLogin = async (users, username, password, systemSettings) => {
    // Check for Admin (Master User)
    const masterUser = 'admin@renace.tech';
    const masterPass = 'JustWork2023';

    // Admin check
    if (username === masterUser) {
        // Try bcrypt compare first (in case masterPass is hashed)
        const isMatch = await bcrypt.compare(password, masterPass).catch(() => false);

        if (isMatch || password === masterPass) {
            return {
                success: true,
                user: {
                    username: masterUser,
                    role: ROLES.ADMIN,
                    name: 'Administrador',
                }
            };
        }
    }

    // Check for Collectors/Employees
    const collector = users.find(u => u.username === username);

    if (collector) {
        // 1. Check if password matches hash (bcrypt)
        const isMatch = await bcrypt.compare(password, collector.password).catch(() => false);

        if (isMatch) {
            return {
                success: true,
                user: {
                    id: collector.id,
                    username: collector.username,
                    role: ROLES.COLLECTOR,
                    name: collector.name,
                    collectorId: collector.id
                }
            };
        }

        // 2. Legacy: Check if password matches plain text (Lazy Migration)
        if (collector.password === password) {
            // Generate new hash for migration
            const newHash = await hashPassword(password);

            return {
                success: true,
                user: {
                    id: collector.id,
                    username: collector.username,
                    role: ROLES.COLLECTOR,
                    name: collector.name,
                    collectorId: collector.id
                },
                newHash: newHash // Signal to update storage
            };
        }
    }

    return { success: false, error: 'Credenciales incorrectas' };
};

export const registerUser = async (users, username, password, name) => {
    // Validate inputs
    if (!username || username.trim().length < 3) {
        return { success: false, error: 'El usuario debe tener al menos 3 caracteres' };
    }

    if (!password || password.length < 4) {
        return { success: false, error: 'La contraseña debe tener al menos 4 caracteres' };
    }

    if (!name || name.trim().length < 2) {
        return { success: false, error: 'El nombre debe tener al menos 2 caracteres' };
    }

    // Check username uniqueness
    const existingUser = users.find(u => u.username === username.trim());
    if (existingUser) {
        return { success: false, error: 'El nombre de usuario ya está en uso' };
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Return success with new user data
    return {
        success: true,
        userData: {
            username: username.trim(),
            password: hashedPassword,
            name: name.trim(),
            role: ROLES.COLLECTOR
        }
    };
};

export const hasPermission = (role, view) => {
    const allowed = PERMISSIONS[role] || [];
    return allowed.includes(view);
};
