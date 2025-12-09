import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Shield, Lock, User, CheckCircle, Mail, Briefcase } from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import logo from '../../logo-small.svg';

export function LoginView({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);

    // Login State
    const [credentials, setCredentials] = useState({ username: '', password: '' });

    // Register State
    const [registerForm, setRegisterForm] = useState({
        companyName: '',
        name: '',
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: credentials.username, // usando username como email
                    password: credentials.password
                })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                // Login exitoso
                onLogin({
                    name: data.user.name,
                    email: data.user.email,
                    token: data.token,
                    role: data.user.role,
                    tenantId: data.tenant.id
                });
            } else {
                setError(data.error || 'Credenciales inválidas');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión con el servidor. Verifica que esté executando.');
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            // Generate slug from company name (lowercase, replace spaces with hyphens)
            const tenantSlug = registerForm.companyName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            // Map frontend fields to backend expected fields
            const registrationData = {
                tenantName: registerForm.companyName,
                tenantSlug: tenantSlug,
                adminEmail: registerForm.email,
                adminPassword: registerForm.password
            };

            // Use relative URL so nginx can proxy to backend
            const response = await fetch('/api/tenants/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMsg('¡Cuenta creada con éxito! Revisa tu correo para verificar la cuenta.');
                setTimeout(() => {
                    setIsRegistering(false);
                    setCredentials({ username: registerForm.email, password: registerForm.password });
                    setSuccessMsg(''); // Clear msg after switch
                }, 3000);
            } else {
                setError(data.error || 'Error al crear la cuenta. Intente nuevamente.');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            if (isRegistering) {
                // For registration, decode to pre-fill form
                const decoded = jwtDecode(credentialResponse.credential);
                setRegisterForm(prev => ({
                    ...prev,
                    name: decoded.name,
                    email: decoded.email,
                    companyName: prev.companyName || `${decoded.given_name || 'My'} Company`
                }));
                setSuccessMsg('Datos de Google cargados. Por favor ingresa el nombre de tu empresa y una contraseña.');
            } else {
                // For login, send token to backend
                setLoading(true);
                setError('');

                const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: credentialResponse.credential })
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    // Login exitoso
                    onLogin({
                        name: data.user.name,
                        email: data.user.email,
                        token: data.token,
                        role: data.user.role,
                        tenantId: data.tenant.id,
                        photoUrl: data.user.photoUrl
                    });
                } else {
                    setError(data.error || 'Error al autenticar con Google');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error("Google Auth Error", err);
            setError('Error al procesar autenticación de Google');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-black opacity-80" />
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600 rounded-full blur-[100px] opacity-20 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="relative z-10 w-full max-w-md p-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:shadow-indigo-500/20">
                    <div className="flex flex-col items-center mb-8">
                        {/* Logo: Extra large for better visibility */}
                        <img src={logo} alt="Presta Pro" className="w-64 h-64 object-contain drop-shadow-2xl mb-4 hover:scale-105 transition-transform" />
                        <h1 className="text-4xl font-bold text-white tracking-tight">Presta Pro</h1>
                        <p className="text-blue-200 text-lg mt-1 font-light">Gestión Inteligente de Préstamos</p>
                    </div>

                    {successMsg && (
                        <div className="p-3 mb-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm text-center flex items-center justify-center gap-2 animate-pulse">
                            <CheckCircle size={16} /> {successMsg}
                        </div>
                    )}

                    {isRegistering ? (
                        <div className="space-y-4 animate-fade-in">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <h3 className="text-white text-lg font-semibold text-center mb-2">Crear Nueva Cuenta</h3>

                                {/* Google Sign Up Button */}
                                <div className="flex justify-center mb-4">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setError('Error al conectar con Google')}
                                        theme="filled_black"
                                        shape="pill"
                                        size="large"
                                        text="signup_with"
                                        width="300"
                                    />
                                </div>
                                <div className="relative flex justify-center text-sm mb-4">
                                    <span className="px-2 bg-transparent text-slate-400 bg-slate-900/0 backdrop-blur-sm">O ingresa tus datos manual</span>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Briefcase size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nombre de la Empresa"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={registerForm.companyName}
                                        onChange={e => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Tu Nombre Completo"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={registerForm.name}
                                        onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Correo Electrónico"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={registerForm.email}
                                        onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={registerForm.password}
                                        onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70"
                                >
                                    {loading ? 'Registrando...' : 'Terminar Registro'}
                                </button>
                            </form>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRegistering(false)}
                                    className="text-slate-400 hover:text-white text-sm transition-colors border-b border-transparent hover:border-slate-400 pb-0.5"
                                >
                                    ¿Ya tienes cuenta? Inicia Sesión
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fade-in">
                            <form onSubmit={handleCredentialLogin} className="space-y-5">
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Usuario o Email"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            value={credentials.username}
                                            onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="Contraseña"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            value={credentials.password}
                                            onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Conectando...
                                        </span>
                                    ) : (
                                        'Iniciar Sesión'
                                    )}
                                </button>
                            </form>

                            <div className="mt-8">
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-transparent text-slate-400 bg-slate-900/0 backdrop-blur-sm">O continúa con</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setError('Error al conectar con Google')}
                                        theme="filled_black"
                                        shape="pill"
                                        size="large"
                                        text="continue_with"
                                        width="300"
                                    />
                                </div>
                            </div>

                            <div className="text-center pt-4 border-t border-slate-800 mt-4">
                                <p className="text-slate-400 text-sm mb-2">¿Nuevo en Presta Pro?</p>
                                <button
                                    type="button"
                                    onClick={() => setIsRegistering(true)}
                                    className="w-full py-2.5 text-white font-medium bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
                                >
                                    Crear Cuenta Gratis
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} Renace Tech. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
