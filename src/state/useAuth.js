import { useState, useEffect } from 'react';
import { validateLogin, registerUser, ROLES } from '../logic/authLogic';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV
        ? 'http://localhost:4000'
        : (typeof window !== 'undefined' ? window.location.origin : ''));
const SESSION_KEY = 'presta_pro_auth_v2';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

export function useAuth(collectors, systemSettings, addCollector) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                const age = Date.now() - (saved.ts || 0);
                if (saved.user && age < SESSION_MAX_AGE_MS) {
                    setUser(saved.user);
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem(SESSION_KEY);
                }
            }
        } catch (e) {
            console.error("Auth restore error", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        let usersToCheck = collectors || [];
        let remoteError = null;

        // DEMO ONLY: If no collectors have credentials, add a mock one for testing if requested
        if (username === 'collector' && password === '1234') {
            const mockCollector = collectors[0] || { id: 'mock-col-1', name: 'Cobrador Demo' };
            const result = {
                success: true,
                user: {
                    id: mockCollector.id,
                    username: 'collector',
                    role: ROLES.COLLECTOR,
                    name: mockCollector.name,
                    collectorId: mockCollector.id
                }
            };
            saveSession(result.user);
            return { success: true, user: result.user };
        }

        // Intentar autenticación contra backend SaaS (email + password) solo si parece email
        if (username.includes('@')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: username,
                        password,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const backendRole = data.user?.role;
                    let mappedRole = backendRole;
                    if (backendRole === 'OWNER') {
                        mappedRole = ROLES.ADMIN;
                    } else if (backendRole === 'COLLECTOR') {
                        mappedRole = ROLES.COLLECTOR;
                    }

                    const remoteUser = {
                        id: data.user?.id,
                        username: data.user?.email,
                        role: mappedRole,
                        name: data.user?.name,
                        tenantId: data.tenant?.id,
                        tenantSlug: data.tenant?.slug,
                        token: data.token,
                    };

                    saveSession(remoteUser);
                    return { success: true, user: remoteUser };
                }

                if (response.status >= 400 && response.status < 500) {
                    const data = await response.json().catch(() => ({}));
                    remoteError = data.error || 'Credenciales inválidas';
                    console.warn('Login failed (4xx):', remoteError);
                } else {
                    console.error('Remote login server error', response.status, response.statusText);
                    remoteError = `Error del servidor: ${response.status}`;
                }
            } catch (err) {
                console.error('Remote login error, falling back to local auth', err);
                remoteError = `Error de conexión: ${err.message}`;
            }
        }

        const result = await validateLogin(usersToCheck, username, password, systemSettings);

        if (result.success) {
            saveSession(result.user);

            // Lazy Migration: If validateLogin returned a newHash, update the collector's password
            if (result.newHash && result.user.role === ROLES.COLLECTOR && addCollector) {
                // We need to update the collector. Since we only have addCollector in props,
                // we might need a way to update. 
                // Ideally, useAuth should receive 'updateCollector' or we just accept that 
                // the state won't persist the hash until we have an update method.
                // For now, we'll log it. In a real app, we'd call updateCollector({ ...user, password: result.newHash }).
                // Hash migration handled in authLogic.js
            }

            return { success: true, user: result.user };
        }
        return { success: false, error: remoteError || result.error };
    };


    const loginWithGoogle = async (googleToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: googleToken,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const backendRole = data.user?.role;
                let mappedRole = backendRole;
                if (backendRole === 'OWNER') {
                    mappedRole = ROLES.ADMIN;
                } else if (backendRole === 'COLLECTOR') {
                    mappedRole = ROLES.COLLECTOR;
                }

                const remoteUser = {
                    id: data.user?.id,
                    username: data.user?.email,
                    role: mappedRole,
                    name: data.user?.name,
                    tenantId: data.tenant?.id,
                    tenantSlug: data.tenant?.slug,
                    token: data.token,
                };

                saveSession(remoteUser);
                return { success: true, user: remoteUser };
            }

            const data = await response.json().catch(() => ({}));
            return { success: false, error: data.error || 'Autenticación con Google fallida' };
        } catch (err) {
            console.error('Remote google login error', err);
            return { success: false, error: 'No se pudo conectar al servidor' };
        }
    };

    const registerTenant = async (tenantName, tenantSlug, adminEmail, adminPassword) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tenants/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tenantName,
                    tenantSlug,
                    adminEmail,
                    adminPassword,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.success === false) {
                return { success: false, error: data.error || 'No se pudo crear la cuenta' };
            }

            const backendRole = data.user?.role;
            let mappedRole = backendRole;
            if (backendRole === 'OWNER') {
                mappedRole = ROLES.ADMIN;
            } else if (backendRole === 'COLLECTOR') {
                mappedRole = ROLES.COLLECTOR;
            }

            const remoteUser = {
                id: data.user?.id,
                username: data.user?.email,
                role: mappedRole,
                name: data.user?.name,
                tenantId: data.tenant?.id,
                tenantSlug: data.tenant?.slug,
                token: data.token,
            };

            saveSession(remoteUser);
            return { success: true, user: remoteUser };
        } catch (err) {
            console.error('Remote tenant register error', err);
            return { success: false, error: 'No se pudo conectar al servidor' };
        }
    };

    const register = async (username, password, name) => {
        const usersToCheck = collectors || [];

        // Validate registration
        const validation = await registerUser(usersToCheck, username, password, name);

        if (!validation.success) {
            return { success: false, error: validation.error };
        }

        // Create new collector with credentials
        const newCollector = {
            id: `col-${Date.now()}`,
            username: validation.userData.username,
            password: validation.userData.password,
            name: validation.userData.name,
            createdAt: new Date().toISOString()
        };

        // Add to collectors list
        if (addCollector) {
            addCollector(newCollector);
        }

        // Auto-login the new user
        const newUser = {
            id: newCollector.id,
            username: newCollector.username,
            role: ROLES.COLLECTOR,
            name: newCollector.name,
            collectorId: newCollector.id
        };

        saveSession(newUser);
        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        setIsAuthenticated(false);
    };

    const saveSession = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            user: userData,
            ts: Date.now()
        }));
    };

    return {
        user,
        isAuthenticated,
        loading,
        login,
        loginWithGoogle,
        register,
        registerTenant,
        logout
    };
}
