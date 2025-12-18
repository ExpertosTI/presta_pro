import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Building2, User, Lock, AlertCircle } from 'lucide-react';

/**
 * CollectorLoginView - Login page for collectors
 * Separate from main user login
 */
export default function CollectorLoginView({ onLogin, onSwitchToUserLogin }) {
    const [form, setForm] = useState({
        tenantSlug: '',
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.tenantSlug || !form.username || !form.password) {
            setError('Todos los campos son requeridos');
            return;
        }

        try {
            setLoading(true);

            const res = await fetch('/api/collectors/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantSlug: form.tenantSlug.toLowerCase().trim(),
                    username: form.username.toLowerCase().trim(),
                    password: form.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error en login');
                return;
            }

            // Store collector token separately
            localStorage.setItem('collectorToken', data.token);
            localStorage.setItem('collectorData', JSON.stringify(data.collector));
            localStorage.setItem('collectorTenant', JSON.stringify(data.tenant));
            localStorage.setItem('mustChangePassword', data.mustChangePassword);

            onLogin(data);
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <User className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Portal Cobrador</h1>
                    <p className="text-indigo-300 text-sm">RENKREDIT by RENACE.TECH</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-200 text-sm">{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Tenant/Company */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-1">
                                Empresa
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.tenantSlug}
                                    onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="codigo-empresa"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-1">
                                Usuario
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="tu.usuario"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn size={20} />
                                Ingresar
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onSwitchToUserLogin}
                        className="w-full mt-3 py-2 text-indigo-300 hover:text-white text-sm transition-colors"
                    >
                        ¿Eres administrador? Inicia sesión aquí
                    </button>
                </form>

                {/* Privacy notice */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    Al iniciar sesión aceptas nuestra{' '}
                    <a href="/privacy" className="text-indigo-400 hover:underline">
                        Política de Privacidad
                    </a>
                </p>
            </div>
        </div>
    );
}
