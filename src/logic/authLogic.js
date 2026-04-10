import bcrypt from 'bcryptjs';

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

export const ROLES = {
    ADMIN: 'ADMIN',
    COLLECTOR: 'COLLECTOR',
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
