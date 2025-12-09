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
        <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans p-4">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-black opacity-80" />
                <div className="absolute -top-20 -left-20 w-64 md:w-96 h-64 md:h-96 bg-blue-600 rounded-full blur-[100px] opacity-20 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-72 md:w-[500px] h-72 md:h-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="relative z-10 w-full max-w-sm md:max-w-md flex flex-col justify-center">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 md:p-8 transform transition-all duration-500 hover:shadow-indigo-500/20">
                    <div className="flex flex-col items-center mb-0 md:mb-6 text-center">
                        {/* Logo: Responsive sizes - Much Larger and stuck to title */}
                        <img src={logo} alt="Presta Pro" className="w-32 h-32 md:w-52 md:h-52 object-contain drop-shadow-2xl mb-0 hover:scale-105 transition-transform" />
                        <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-none -mt-4 relative z-10">Presta Pro</h1>
                        <p className="text-blue-200 text-[10px] md:text-base mt-1 md:mt-1 font-light leading-tight">Gestión Inteligente de Préstamos</p>
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
                                        className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                        className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                        className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                        className="w-full pl-10 pr-4 py-2 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
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
                        <div className="space-y-4 animate-fade-in">
                            <form onSubmit={handleCredentialLogin} className="space-y-4">
                                <div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Usuario o Email"
                                            className="w-full pl-10 pr-4 py-2 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                            className="w-full pl-10 pr-4 py-2 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                                    className="w-full py-2.5 md:py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
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

                    <div className="mt-4 md:mt-8 text-center space-y-2 md:space-y-3">
                        {/* Support Section */}
                        <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-700">
                            <p className="text-xs text-slate-400 mb-2">¿Problemas para acceder?</p>
                            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                                <a
                                    href="mailto:info@renace.tech"
                                    className="flex items-center gap-1.5 text-xs md:text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <Mail size={14} />
                                    <span className="hidden sm:inline">info@renace.tech</span>
                                    <span className="sm:hidden">Email</span>
                                </a>
                                <a
                                    href="https://wa.me/84994577463"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs md:text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span>WhatsApp</span>
                                </a>
                            </div>
                        </div>

                        <p className="text-[10px] md:text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} Renace Tech
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
