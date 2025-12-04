
export const ROLES = {
    ADMIN: 'ADMIN',
    COLLECTOR: 'COLLECTOR',
};

export const PERMISSIONS = {
    [ROLES.ADMIN]: ['dashboard', 'clients', 'loans', 'expenses', 'requests', 'routes', 'documents', 'notes', 'reports', 'hr', 'accounting', 'ai', 'calculator', 'settings'],
    [ROLES.COLLECTOR]: ['dashboard', 'clients', 'loans', 'routes', 'documents', 'notes'], // Restricted access
};

export const validateLogin = (users, username, password, systemSettings) => {
    // Check for Admin (Master User)
    const masterUser = systemSettings?.securityUser || 'admin';
    const masterPass = systemSettings?.securityPassword || '1234';

    if (username === masterUser && password === masterPass) {
        return {
            success: true,
            user: {
                username: masterUser,
                role: ROLES.ADMIN,
                name: 'Administrador',
            }
        };
    }

    // Check for Collectors/Employees
    const collector = users.find(u => u.username === username && u.password === password);
    if (collector) {
        return {
            success: true,
            user: {
                id: collector.id,
                username: collector.username,
                role: ROLES.COLLECTOR,
                name: collector.name,
                collectorId: collector.id // Link to collector entity
            }
        };
    }

    return { success: false, error: 'Credenciales incorrectas' };
};

export const registerUser = (users, username, password, name) => {
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

    // Return success with new user data
    return {
        success: true,
        userData: {
            username: username.trim(),
            password: password,
            name: name.trim(),
            role: ROLES.COLLECTOR
        }
    };
};

export const hasPermission = (role, view) => {
    const allowed = PERMISSIONS[role] || [];
    return allowed.includes(view);
};
