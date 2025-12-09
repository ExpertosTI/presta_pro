import React, { useState, useEffect } from 'react';
import Card from '../components/Card.jsx';
import { Check, Crown, Zap, Building2, CreditCard, Building, Banknote, Loader2 } from 'lucide-react';

const API_BASE_URL = '';

const PLAN_ICONS = {
    FREE: Zap,
    PRO: Crown,
    ENTERPRISE: Building2,
};

const PLAN_COLORS = {
    FREE: 'border-slate-300 dark:border-slate-600',
    PRO: 'border-emerald-500 ring-2 ring-emerald-500/20',
    ENTERPRISE: 'border-slate-800 dark:border-amber-500 ring-2 ring-amber-500/20',
};

const PLAN_BADGES = {
    FREE: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    PRO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    ENTERPRISE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function PricingView({ showToast, currentPlan = 'FREE' }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingInterval, setBillingInterval] = useState('monthly');
    const [paymentMethod, setPaymentMethod] = useState('AZUL');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans`);
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (err) {
            console.error('Error fetching plans:', err);
            // Use default plans if API fails
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
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId) => {
        if (planId === 'FREE' || planId === currentPlan) return;

        setProcessing(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE_URL}/api/subscriptions/upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
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
                // Create form and submit to Azul
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
            showToast?.(`Pago iniciado. ${data.instructions}`, 'success');
            setSelectedPlan(null);
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
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Planes y Precios</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Elige el plan que mejor se adapte a tu negocio</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
                    <button
                        onClick={() => setBillingInterval('monthly')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingInterval === 'monthly'
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow'
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingInterval('yearly')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billingInterval === 'yearly'
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow'
                            : 'text-slate-500 dark:text-slate-400'
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
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{plan.name}</h3>
                                        {isCurrentPlan && (
                                            <span className="text-xs text-emerald-600 font-semibold">Tu plan actual</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{price}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                                        /{billingInterval === 'yearly' ? 'año' : 'mes'}
                                    </span>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    {plan.features?.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Check size={16} className="text-emerald-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {plan.id === 'FREE' ? (
                                    <button
                                        disabled
                                        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
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
            {selectedPlan && (
                <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                                Selecciona método de pago
                            </h3>

                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('AZUL')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'AZUL'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <CreditCard size={24} className="text-blue-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Tarjeta (Azul)</p>
                                        <p className="text-xs text-slate-500">Visa, MasterCard, American Express</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'BANK_TRANSFER'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Building size={24} className="text-emerald-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Transferencia Bancaria</p>
                                        <p className="text-xs text-slate-500">Sube tu comprobante para verificación</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('CASH')}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${paymentMethod === 'CASH'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    <Banknote size={24} className="text-amber-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Efectivo</p>
                                        <p className="text-xs text-slate-500">Coordina el pago con el administrador</p>
                                    </div>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedPlan(null)}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleUpgrade(selectedPlan)}
                                    disabled={processing}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing && <Loader2 className="animate-spin" size={16} />}
                                    Continuar
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
