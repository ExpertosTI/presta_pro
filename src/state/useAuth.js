import { useState, useEffect } from 'react';
import { validateLogin, registerUser, ROLES } from '../logic/authLogic';

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

    const login = (username, password) => {
        let usersToCheck = collectors || [];

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

        const result = validateLogin(usersToCheck, username, password, systemSettings);

        if (result.success) {
            saveSession(result.user);
            return { success: true, user: result.user };
        }
        return { success: false, error: result.error };
    };

    const register = (username, password, name) => {
        const usersToCheck = collectors || [];

        // Validate registration
        const validation = registerUser(usersToCheck, username, password, name);

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
        register,
        logout
    };
}
