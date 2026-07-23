import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Shield, Lock, User, CheckCircle, Mail, Briefcase, RefreshCw, MessageCircle, Copy, X } from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import logo from '../../../../logo-small.svg';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://prestanace.renace.tech/api').replace(/\/$/, '');
const PLATFORM_WA = (import.meta.env.VITE_PLATFORM_WHATSAPP || '184994577463').replace(/\D/g, '');
const WA_MSG = 'REGISTRO';

function formatWaDisplay(digits) {
    const d = String(digits || '');
    if (d.length === 11 && d.startsWith('1')) return `+${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7)}`;
    if (d.length >= 10) return `+${d}`;
    return d;
}

export function LoginView({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showWaGuide, setShowWaGuide] = useState(false);
    const [copyHint, setCopyHint] = useState('');

    // Login State
    const [credentials, setCredentials] = useState({ username: '', password: '' });

    // Register State
    const [registerForm, setRegisterForm] = useState({
        companyName: '',
        name: '',
        email: '',
        password: '',
        slug: '',
    });
    const [waSignupToken, setWaSignupToken] = useState(null);

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Account expired state (for resend verification)
    const [accountExpired, setAccountExpired] = useState(false);
    const [expiredEmail, setExpiredEmail] = useState('');
    const [expiredTenantName, setExpiredTenantName] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const copyText = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyHint(label);
            setTimeout(() => setCopyHint(''), 2000);
        } catch {
            setCopyHint('No se pudo copiar');
            setTimeout(() => setCopyHint(''), 2000);
        }
    };

    /** En app nativa abre WhatsApp directo; en web solo muestra la guía (sin wa.me). */
    const openWhatsAppRegister = () => {
        if (Capacitor.isNativePlatform() && PLATFORM_WA) {
            window.location.href = `whatsapp://send?phone=${PLATFORM_WA}&text=${encodeURIComponent(WA_MSG)}`;
            return;
        }
        setShowWaGuide(true);
    };

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            GoogleAuth.initialize();
        }
    }, []);

    // Prefill from WhatsApp signup link ?waSignup=TOKEN
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('waSignup');
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/whatsapp/signup-lead/${encodeURIComponent(token)}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Enlace inválido');
                if (cancelled) return;
                setWaSignupToken(token);
                setIsRegistering(true);
                setRegisterForm((prev) => ({
                    ...prev,
                    companyName: data.companyName || '',
                    email: data.adminEmail || '',
                    name: data.contactName || '',
                    slug: data.suggestedSlug || '',
                }));
                setSuccessMsg('Completa slug y contraseña para activar tu cuenta (datos desde WhatsApp).');
            } catch (err) {
                if (!cancelled) setError(err.message || 'Enlace de WhatsApp inválido o expirado');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleGoogleNativeLogin = async () => {
        try {
            setLoading(true);
            setError('');
            const user = await GoogleAuth.signIn();

            if (user && user.authentication.idToken) {
                await processGoogleLogin(user.authentication.idToken);
            }
        } catch (err) {
            console.error("Native Google Auth Error", err);
            // Don't show error if user just cancelled
            if (err.message !== 'user cancelled') {
                setError('Error al iniciar sesión con Google nativo');
            }
            setLoading(false);
        }
    };

    const processGoogleLogin = async (idToken) => {
        try {
            const response = await fetch('https://prestanace.renace.tech/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                onLogin({
                    name: data.user.name,
                    email: data.user.email,
                    token: data.token,
                    role: data.user.role,
                    tenantId: data.tenant.id,
                    tenantSlug: data.tenant.slug,
                    photoUrl: data.user.photoUrl
                });
            } else if (data.accountExpired) {
                setAccountExpired(true);
                setExpiredEmail(data.email);
                setExpiredTenantName(data.tenantName || 'tu empresa');
            } else {
                setError(data.error || 'Error al autenticar con Google');
            }
        } catch (err) {
            console.error("Login processing error", err);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleCredentialLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Use relative URL - nginx proxies /api to backend in production
            const response = await fetch('https://prestanace.renace.tech/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: credentials.username,
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
                    tenantId: data.tenant.id,
                    tenantSlug: data.tenant.slug
                });
            } else if (data.accountExpired) {
                // Account expired - offer resend option
                setAccountExpired(true);
                setExpiredEmail(data.email);
                setExpiredTenantName(data.tenantName || 'tu empresa');
                setError('');
                setLoading(false);
            } else {
                setError(data.error || 'Credenciales inválidas');
                setLoading(false);
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión con el servidor. Verifica que esté ejecutando.');
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        setError('');
        setResendSuccess(false);

        try {
            const response = await fetch('https://prestanace.renace.tech/api/tenants/resend-verification-public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: expiredEmail })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResendSuccess(true);
                setSuccessMsg('¡Correo enviado! Revisa tu bandeja de entrada para activar tu cuenta.');
            } else {
                setError(data.error || 'Error al enviar el correo de verificación');
            }
        } catch (err) {
            console.error('Resend verification error:', err);
            setError('Error de conexión con el servidor.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setAccountExpired(false);
        setExpiredEmail('');
        setExpiredTenantName('');
        setResendSuccess(false);
        setError('');
        setSuccessMsg('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            if (waSignupToken) {
                const slug = (registerForm.slug || registerForm.companyName)
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                const response = await fetch(`${API_BASE}/tenants/register-from-whatsapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: waSignupToken,
                        tenantSlug: slug,
                        adminPassword: registerForm.password,
                        contactName: registerForm.name,
                    }),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    setSuccessMsg('¡Cuenta creada! Revisa tu correo para verificar la cuenta.');
                    window.history.replaceState({}, '', window.location.pathname);
                    setTimeout(() => {
                        setIsRegistering(false);
                        setWaSignupToken(null);
                        setCredentials({ username: registerForm.email, password: registerForm.password });
                        setSuccessMsg('');
                    }, 2500);
                } else {
                    setError(data.error || 'Error al completar el registro.');
                }
                return;
            }

            const tenantSlug = registerForm.companyName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

            const registrationData = {
                tenantName: registerForm.companyName,
                tenantSlug,
                adminEmail: registerForm.email,
                adminPassword: registerForm.password,
            };

            const response = await fetch(`${API_BASE}/tenants/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccessMsg('¡Cuenta creada con éxito! Revisa tu correo para verificar la cuenta.');
                setTimeout(() => {
                    setIsRegistering(false);
                    setCredentials({ username: registerForm.email, password: registerForm.password });
                    setSuccessMsg('');
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

                const response = await fetch('https://prestanace.renace.tech/api/auth/google', {
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
                    tenantSlug: data.tenant.slug,
                        photoUrl: data.user.photoUrl
                    });
                } else if (data.accountExpired) {
                    // Account expired - offer resend option
                    setAccountExpired(true);
                    setExpiredEmail(data.email);
                    setExpiredTenantName(data.tenantName || 'tu empresa');
                    setError('');
                    setLoading(false);
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
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans p-4">
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

                    {accountExpired ? (
                        /* Expired Account - Simple Resend UI */
                        <div className="space-y-4 animate-fade-in">
                            <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-center">
                                <p className="text-slate-200 text-sm">
                                    Cuenta expirada. {' '}
                                    {!resendSuccess ? (
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendLoading}
                                            className="text-amber-400 hover:text-amber-300 underline font-medium transition-colors"
                                        >
                                            {resendLoading ? 'Enviando...' : 'Reenviar verificación'}
                                        </button>
                                    ) : (
                                        <span className="text-emerald-400 font-medium">✓ Correo enviado a {expiredEmail}</span>
                                    )}
                                </p>
                                {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
                            </div>
                        </div>
                    ) : isRegistering ? (
                        <div className="space-y-4 animate-fade-in">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <h3 className="text-white text-lg font-semibold text-center mb-2">
                                    {waSignupToken ? 'Completar registro WhatsApp' : 'Crear Nueva Cuenta'}
                                </h3>

                                {!waSignupToken && (
                                    <button
                                        type="button"
                                        onClick={openWhatsAppRegister}
                                        className="flex items-center justify-center gap-2 w-full py-3 mb-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-sm min-h-[48px] touch-manipulation"
                                    >
                                        <MessageCircle size={18} />
                                        Registrarme por WhatsApp
                                    </button>
                                )}

                                {/* Google Sign Up Button */}
                                {!waSignupToken && (
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
                                )}
                                {!waSignupToken && (
                                <div className="relative flex justify-center text-sm mb-4">
                                    <span className="px-2 text-slate-400 bg-slate-900/0 backdrop-blur-sm">O ingresa tus datos manual</span>
                                </div>
                                )}

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Briefcase size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nombre de la Empresa"
                                        required
                                        readOnly={Boolean(waSignupToken)}
                                        className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-70"
                                        value={registerForm.companyName}
                                        onChange={e => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                                    />
                                </div>

                                {waSignupToken && (
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Shield size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Slug (ej. mi-financiera)"
                                        required
                                        minLength={3}
                                        className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={registerForm.slug}
                                        onChange={e => setRegisterForm({ ...registerForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    />
                                </div>
                                )}

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
                                        readOnly={Boolean(waSignupToken)}
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
                                        <span className="px-2 text-slate-400 bg-slate-900/0 backdrop-blur-sm">O continúa con</span>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-center">
                                    {Capacitor.isNativePlatform() ? (
                                        <button
                                            type="button"
                                            onClick={handleGoogleNativeLogin}
                                            className="flex items-center justify-center gap-3 w-full max-w-[300px] py-2.5 bg-white text-slate-900 font-medium rounded-full hover:bg-slate-100 transition-colors shadow-md"
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                            Continuar con Google
                                        </button>
                                    ) : (
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setError('Error al conectar con Google')}
                                            theme="filled_black"
                                            shape="pill"
                                            size="large"
                                            text="continue_with"
                                            width="300"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="text-center pt-4 border-t border-slate-800 mt-4 space-y-2">
                                <p className="text-slate-400 text-sm mb-2">¿Nuevo en Presta Pro?</p>
                                <button
                                    type="button"
                                    onClick={openWhatsAppRegister}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 mb-1 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-sm min-h-[44px] touch-manipulation"
                                >
                                    <MessageCircle size={16} />
                                    Registrarme por WhatsApp
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsRegistering(true)}
                                    className="w-full py-2.5 text-white font-medium bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 min-h-[44px]"
                                >
                                    Crear Cuenta Gratis
                                </button>
                            </div>
                        </div>
                    )}

                    {showWaGuide && (
                        <div
                            data-modal-sheet
                            className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
                            onClick={(e) => { if (e.target === e.currentTarget) setShowWaGuide(false); }}
                        >
                            <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(90dvh,100%)]">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
                                    <h3 className="text-white font-bold text-base">Registro por WhatsApp</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowWaGuide(false)}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white touch-manipulation"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-4 space-y-3 overflow-y-auto text-sm text-slate-300">
                                    <p>
                                        No hace falta abrir la web de WhatsApp desde aquí. Escribe desde tu teléfono:
                                    </p>
                                    <ol className="list-decimal list-inside space-y-2 text-slate-200">
                                        <li>Abre WhatsApp en tu celular</li>
                                        <li>Envía el mensaje <strong className="text-white">{WA_MSG}</strong> al número de Presta Pro</li>
                                        <li>El bot te pedirá datos de tu empresa y te enviará un enlace para terminar (slug y contraseña)</li>
                                    </ol>
                                    <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-3 space-y-2">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">Número</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-white text-base">{formatWaDisplay(PLATFORM_WA)}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(PLATFORM_WA, 'Número copiado')}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold min-h-[40px] touch-manipulation"
                                            >
                                                <Copy size={14} /> Copiar
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-bold pt-1">Mensaje</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-emerald-300 text-base">{WA_MSG}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyText(WA_MSG, 'Mensaje copiado')}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold min-h-[40px] touch-manipulation"
                                            >
                                                <Copy size={14} /> Copiar
                                            </button>
                                        </div>
                                        {copyHint && (
                                            <p className="text-xs text-emerald-400">{copyHint}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        También puedes usar <strong className="text-slate-300">Crear Cuenta Gratis</strong> y registrarte sin WhatsApp.
                                    </p>
                                </div>
                                <div className="p-4 border-t border-slate-700 flex-shrink-0 safe-area-bottom">
                                    <button
                                        type="button"
                                        onClick={() => setShowWaGuide(false)}
                                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold min-h-[48px] touch-manipulation"
                                    >
                                        Entendido
                                    </button>
                                </div>
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
        </div >
    );
}

export default LoginView;
