import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle, User, Phone, Mail, MapPin, CreditCard, DollarSign, FileText, Loader2, Building2 } from 'lucide-react';
import { publicApi } from '../services/publicApi';

/**
 * Public Loan Application Form
 * Accessible without authentication at /aplicar/:tenantSlug
 */
export const PublicLoanForm = ({ tenantSlug }) => {
    const [tenantInfo, setTenantInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        applicantName: '',
        applicantPhone: '',
        applicantEmail: '',
        applicantIdNumber: '',
        applicantAddress: '',
        amountRequested: '',
        purpose: '',
        notes: ''
    });

    const [formErrors, setFormErrors] = useState({});

    // Load tenant info
    useEffect(() => {
        const loadTenantInfo = async () => {
            try {
                setLoading(true);
                setError(null);
                const info = await publicApi.getTenantInfo(tenantSlug);
                setTenantInfo(info);
            } catch (err) {
                console.error('Error loading tenant:', err);
                setError(err.response?.data?.error || 'No se pudo cargar la información de la empresa');
            } finally {
                setLoading(false);
            }
        };

        if (tenantSlug) {
            loadTenantInfo();
        }
    }, [tenantSlug]);

    const validateForm = () => {
        const errors = {};

        if (!formData.applicantName.trim()) {
            errors.applicantName = 'El nombre es requerido';
        }

        if (!formData.applicantPhone.trim()) {
            errors.applicantPhone = 'El teléfono es requerido';
        } else if (!/^[\d\s\-\+\(\)]{7,20}$/.test(formData.applicantPhone.trim())) {
            errors.applicantPhone = 'Formato de teléfono inválido';
        }

        if (formData.applicantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) {
            errors.applicantEmail = 'Formato de email inválido';
        }

        if (!formData.amountRequested || parseFloat(formData.amountRequested) <= 0) {
            errors.amountRequested = 'Ingrese un monto válido';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error on change
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setSubmitting(true);
            setError(null);

            await publicApi.submitLoanApplication({
                tenantSlug,
                ...formData,
                amountRequested: parseFloat(formData.amountRequested)
            });

            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting application:', err);
            setError(err.response?.data?.error || 'Error al enviar la solicitud. Intente nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-300">Cargando...</p>
                </div>
            </div>
        );
    }

    // Error state (tenant not found)
    if (error && !tenantInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 text-center border border-red-500/20">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Empresa no encontrada</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    // Success state
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 text-center border border-green-500/20">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h2>
                    <p className="text-gray-400 mb-6">
                        Tu solicitud ha sido recibida por <strong className="text-white">{tenantInfo?.name}</strong>.
                        Nos pondremos en contacto contigo pronto.
                    </p>
                    <button
                        onClick={() => {
                            setSubmitted(false);
                            setFormData({
                                applicantName: '',
                                applicantPhone: '',
                                applicantEmail: '',
                                applicantIdNumber: '',
                                applicantAddress: '',
                                amountRequested: '',
                                purpose: '',
                                notes: ''
                            });
                        }}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                    >
                        Enviar otra solicitud
                    </button>
                </div>
            </div>
        );
    }

    // Form state
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Solicitar Préstamo</h1>
                    <p className="text-gray-400">
                        Completa el formulario para solicitar un préstamo con <strong className="text-purple-400">{tenantInfo?.name}</strong>
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Personal Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Información Personal</h3>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Nombre Completo <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="applicantName"
                                        value={formData.applicantName}
                                        onChange={handleChange}
                                        placeholder="Juan Pérez"
                                        className={`w-full pl-11 pr-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${formErrors.applicantName ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500'
                                            }`}
                                    />
                                </div>
                                {formErrors.applicantName && <p className="mt-1 text-sm text-red-400">{formErrors.applicantName}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Teléfono <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="tel"
                                        name="applicantPhone"
                                        value={formData.applicantPhone}
                                        onChange={handleChange}
                                        placeholder="809-555-1234"
                                        className={`w-full pl-11 pr-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${formErrors.applicantPhone ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500'
                                            }`}
                                    />
                                </div>
                                {formErrors.applicantPhone && <p className="mt-1 text-sm text-red-400">{formErrors.applicantPhone}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        name="applicantEmail"
                                        value={formData.applicantEmail}
                                        onChange={handleChange}
                                        placeholder="correo@ejemplo.com"
                                        className={`w-full pl-11 pr-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${formErrors.applicantEmail ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500'
                                            }`}
                                    />
                                </div>
                                {formErrors.applicantEmail && <p className="mt-1 text-sm text-red-400">{formErrors.applicantEmail}</p>}
                            </div>

                            {/* ID Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Cédula
                                </label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        name="applicantIdNumber"
                                        value={formData.applicantIdNumber}
                                        onChange={handleChange}
                                        placeholder="001-1234567-8"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Dirección
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <textarea
                                        name="applicantAddress"
                                        value={formData.applicantAddress}
                                        onChange={handleChange}
                                        placeholder="Calle, sector, ciudad..."
                                        rows={2}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Loan Info Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Información del Préstamo</h3>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Monto Solicitado (RD$) <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="number"
                                        name="amountRequested"
                                        value={formData.amountRequested}
                                        onChange={handleChange}
                                        placeholder="50,000"
                                        min="1000"
                                        step="1000"
                                        className={`w-full pl-11 pr-4 py-3 bg-slate-700/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${formErrors.amountRequested ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-600 focus:ring-purple-500/50 focus:border-purple-500'
                                            }`}
                                    />
                                </div>
                                {formErrors.amountRequested && <p className="mt-1 text-sm text-red-400">{formErrors.amountRequested}</p>}
                            </div>

                            {/* Purpose */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    ¿Para qué necesita el préstamo?
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <textarea
                                        name="purpose"
                                        value={formData.purpose}
                                        onChange={handleChange}
                                        placeholder="Ej: Compra de inventario, mejoras del hogar, emergencia médica..."
                                        rows={2}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Notas Adicionales
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Cualquier información adicional..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar Solicitud
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Powered by <a href="https://renace.tech" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">RenKredit</a>
                </p>
            </div>
        </div>
    );
};

export default PublicLoanForm;
