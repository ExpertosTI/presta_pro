import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card.jsx';
import { Check, Crown, Zap, Building2, CreditCard, Building, Banknote, Loader2, Upload, X, AlertCircle } from 'lucide-react';

const API_BASE_URL = '';

// Azul Logo SVG
const AzulLogo = () => (
    <svg viewBox="0 0 120 40" className="h-6 w-auto">
        <rect width="120" height="40" rx="6" fill="#003366" />
        <text x="60" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial, sans-serif">AZUL</text>
    </svg>
);

const PLAN_ICONS = {
    FREE: Zap,
    PRO: Crown,
    ENTERPRISE: Building2,
};

const PLAN_COLORS = {
    FREE: 'border-slate-400 dark:border-slate-600',
    PRO: 'border-emerald-500 ring-2 ring-emerald-500/20',
    ENTERPRISE: 'border-slate-900 dark:border-amber-400 ring-2 ring-amber-400/20',
};

const PLAN_BADGES = {
    FREE: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    PRO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    ENTERPRISE: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300',
};

export function PricingView({ showToast, currentPlan = 'FREE' }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingInterval, setBillingInterval] = useState('monthly');
    const [paymentMethod, setPaymentMethod] = useState('AZUL');
    const [processing, setProcessing] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans`);
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            } else {
                // API returned error (401, 403, etc) - use fallback plans
                console.warn('Plans API returned', res.status, '- using fallback plans');
                setFallbackPlans();
            }
        } catch (err) {
            console.error('Error fetching plans:', err);
            setFallbackPlans();
        } finally {
            setLoading(false);
        }
    };

    const setFallbackPlans = () => {
        setPlans([
            {
                id: 'FREE',
                name: 'Plan Gratis',
                monthlyPrice: 0,
                yearlyPrice: 0,
                monthlyPriceFormatted: 'RD$0.00',
                yearlyPriceFormatted: 'RD$0.00',
                features: ['10 clientes', '5 préstamos activos', '1 usuario', 'Sin acceso a IA', 'Expira en 30 días'],
            },
            {
                id: 'PRO',
                name: 'Plan Profesional',
                monthlyPrice: 80000,
                yearlyPrice: 800000,
                monthlyPriceFormatted: 'RD$800.00',
                yearlyPriceFormatted: 'RD$8,000.00',
                features: ['100 clientes', '50 préstamos activos', '5 usuarios', '100 consultas AI/mes'],
            },
            {
                id: 'ENTERPRISE',
                name: 'Plan Empresarial',
                monthlyPrice: 140000,
                yearlyPrice: 1400000,
                monthlyPriceFormatted: 'RD$1,400.00',
                yearlyPriceFormatted: 'RD$14,000.00',
                features: ['Clientes ilimitados', 'Préstamos ilimitados', 'Usuarios ilimitados', 'AI ilimitado', 'Soporte prioritario'],
            },
        ]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setProofPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleUpgrade = async (planId) => {
        if (planId === 'FREE' || planId === currentPlan) return;

        // For manual payments, show upload modal
        if ((paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CASH') && !proofFile) {
            setShowUploadModal(true);
            return;
        }

        setProcessing(true);
        try {
            const token = localStorage.getItem('authToken');
            const planInfo = plans.find(p => p.id === planId);
            const price = billingInterval === 'yearly' ? planInfo?.yearlyPriceFormatted : planInfo?.monthlyPriceFormatted;

            // For manual payments with proof file, use upload-proof endpoint
            if (proofFile && (paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CASH')) {
                const formData = new FormData();
                formData.append('proof', proofFile);
                formData.append('plan', planId);
                formData.append('amount', price);
                formData.append('method', paymentMethod);

                const res = await fetch(`${API_BASE_URL}/api/subscriptions/upload-proof`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    showToast?.(data.error || 'Error al enviar comprobante', 'error');
                    return;
                }

                showToast?.('Comprobante enviado. Recibirás confirmación por correo.', 'success');
                setSelectedPlan(null);
                setShowUploadModal(false);
                setProofFile(null);
                setProofPreview(null);
                return;
            }

            // For card payments (Azul)
            const res = await fetch(`${API_BASE_URL}/api/subscriptions/upgrade`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan: planId,
                    interval: billingInterval,
                    paymentMethod,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast?.(data.error || 'Error al procesar', 'error');
                return;
            }

            if (data.method === 'AZUL' && data.formData) {
                const form = document.createElement('form');
                form.action = data.redirectUrl;
                form.method = 'POST';

                Object.entries(data.formData).forEach(([key, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
                return;
            }

            // For manual payments
            showToast?.('Comprobante enviado. Recibirás confirmación por correo y en notificaciones.', 'success');
            setSelectedPlan(null);
            setShowUploadModal(false);
            setProofFile(null);
            setProofPreview(null);
        } catch (err) {
            console.error('Upgrade error:', err);
            showToast?.('Error al procesar el upgrade', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-slate-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Planes y Precios</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Elige el plan que mejor se adapte a tu negocio</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center">
                <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl inline-flex">
                    <button
                        onClick={() => setBillingInterval('monthly')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingInterval === 'monthly'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow'
                            : 'text-slate-600 dark:text-slate-400'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingInterval('yearly')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingInterval === 'yearly'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow'
                            : 'text-slate-600 dark:text-slate-400'
                            }`}
                    >
                        Anual <span className="text-emerald-600 text-xs ml-1">2 meses gratis</span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan) => {
                    const Icon = PLAN_ICONS[plan.id] || Zap;
                    const isCurrentPlan = currentPlan === plan.id;
                    const price = billingInterval === 'yearly' ? plan.yearlyPriceFormatted : plan.monthlyPriceFormatted;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative ${PLAN_COLORS[plan.id]} ${plan.id === 'PRO' ? 'transform scale-105' : ''}`}
                        >
                            {plan.id === 'PRO' && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                        Más Popular
                                    </span>
                                </div>
                            )}

                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-xl ${PLAN_BADGES[plan.id]}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{plan.name}</h3>
                                        {isCurrentPlan && (
                                            <span className="text-xs text-emerald-600 font-semibold">Tu plan actual</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{price}</span>
                                    <span className="text-slate-600 dark:text-slate-400 text-sm">
                                        /{billingInterval === 'yearly' ? 'año' : 'mes'}
                                    </span>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    {plan.features?.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                            <Check size={16} className="text-emerald-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {plan.id === 'FREE' ? (
                                    <button
                                        disabled
                                        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                                    >
                                        {isCurrentPlan ? 'Plan Actual' : 'Gratis'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setSelectedPlan(plan.id)}
                                        disabled={isCurrentPlan || processing}
                                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${isCurrentPlan
                                            ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                            : plan.id === 'PRO'
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
                                                : 'bg-gradient-to-r from-slate-800 to-slate-700 text-white hover:from-slate-900 hover:to-slate-800 shadow-lg shadow-slate-500/25'
                                            }`}
                                    >
                                        {isCurrentPlan ? 'Plan Actual' : 'Seleccionar'}
                                    </button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Payment Method Modal */}
            {selectedPlan && !showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                                Selecciona método de pago
                            </h3>

                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('AZUL')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'AZUL'
                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="bg-[#003366] p-2 rounded-lg">
                                        <CreditCard size={20} className="text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">Tarjeta de Crédito/Débito</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <AzulLogo />
                                            <span className="text-xs text-slate-500">Visa, MasterCard, AMEX</span>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'BANK_TRANSFER'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Building size={24} className="text-emerald-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">Transferencia Bancaria</p>
                                        <p className="text-xs text-slate-500">Adjunta comprobante • Confirmación en 24h</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('CASH')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'CASH'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Banknote size={24} className="text-amber-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">Efectivo / Depósito</p>
                                        <p className="text-xs text-slate-500">Adjunta comprobante • Confirmación manual</p>
                                    </div>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setSelectedPlan(null); setProofFile(null); setProofPreview(null); }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleUpgrade(selectedPlan)}
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing && <Loader2 className="animate-spin" size={16} />}
                                    Continuar
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Upload Proof Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                                    Adjuntar Comprobante
                                </h3>
                                <button onClick={() => { setShowUploadModal(false); setProofFile(null); setProofPreview(null); }}>
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                                <div className="flex gap-2">
                                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-800 dark:text-amber-200">
                                        <p className="font-semibold mb-2">Datos para {paymentMethod === 'BANK_TRANSFER' ? 'transferencia' : 'depósito'}:</p>
                                        <p className="font-bold">Adderly Marte</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-300 mb-2">Cédula: 224-0056380-9</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                            <div
                                                onClick={() => { navigator.clipboard.writeText('804637114'); showToast('Copiado: Banco Popular'); }}
                                                className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors active:scale-95"
                                            >
                                                <p className="font-semibold text-amber-900 dark:text-amber-100">Banco Popular</p>
                                                <p className="font-mono">804637114</p>
                                            </div>
                                            <div
                                                onClick={() => { navigator.clipboard.writeText('10499770022'); showToast('Copiado: Banco BHD'); }}
                                                className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors active:scale-95"
                                            >
                                                <p className="font-semibold text-amber-900 dark:text-amber-100">Banco BHD</p>
                                                <p className="font-mono">10499770022</p>
                                            </div>
                                            <div
                                                onClick={() => { navigator.clipboard.writeText('9606451004'); showToast('Copiado: BanReservas'); }}
                                                className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors active:scale-95"
                                            >
                                                <p className="font-semibold text-amber-900 dark:text-amber-100">BanReservas</p>
                                                <p className="font-mono">9606451004</p>
                                            </div>
                                            <div
                                                onClick={() => { navigator.clipboard.writeText('1001256657'); showToast('Copiado: QIK'); }}
                                                className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors active:scale-95"
                                            >
                                                <p className="font-semibold text-amber-900 dark:text-amber-100">QIK Banco Digital</p>
                                                <p className="font-mono">1001256657</p>
                                            </div>
                                        </div>
                                        <p className="text-xs mt-2 text-amber-600 dark:text-amber-400">📧 adderlymarte@hotmail.com</p>
                                    </div>
                                    <p className="text-xs mt-2 text-slate-500 italic text-center">Haz clic en un número para copiar</p>
                                </div>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                            >
                                {proofPreview ? (
                                    <div className="space-y-2">
                                        <img src={proofPreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                                        <p className="text-sm text-emerald-600 font-semibold">✓ {proofFile?.name}</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Haz clic para subir tu comprobante
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">PNG, JPG o PDF</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                                Recibirás confirmación por correo electrónico y en el centro de notificaciones
                            </p>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => { setShowUploadModal(false); setProofFile(null); setProofPreview(null); }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleUpgrade(selectedPlan)}
                                    disabled={!proofFile || processing}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing && <Loader2 className="animate-spin" size={16} />}
                                    Enviar Comprobante
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default PricingView;
