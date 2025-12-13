import React, { useState, useEffect } from 'react';
import {
    CreditCard, CheckCircle, AlertTriangle, Package, Calendar,
    Upload, FileText, ChevronRight, Star, Shield, Users
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import subscriptionService from '../services/subscriptionService';

export function SubscriptionDashboard({ showToast }) {
    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPlans, setShowPlans] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [subData, plansData] = await Promise.all([
                subscriptionService.getMySubscription(),
                subscriptionService.getPlans()
            ]);
            setSubscription(subData);
            setPlans(plansData);
        } catch (e) {
            console.error('Error loading subscription data:', e);
            showToast?.('Error cargando información de suscripción', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast?.('El archivo no debe superar los 5MB', 'error');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('proof', file);
            // Default to PRO monthly for manual uploads if not specified (flow simplification)
            formData.append('plan', 'PRO');
            formData.append('amount', '1500');
            formData.append('interval', 'monthly');

            await subscriptionService.uploadPaymentProof(formData);
            showToast?.('Comprobante subido exitosamente. Esperando verificación.', 'success');
            loadData(); // Reload to show pending status
        } catch (e) {
            showToast?.('Error subiendo comprobante', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <p className="text-center text-slate-500 py-8">Cargando suscripción...</p>
            </Card>
        );
    }

    const currentPlan = subscription?.plan || 'FREE';
    const isPro = currentPlan !== 'FREE';
    const status = subscription?.status || 'ACTIVE';
    const daysRemaining = subscription?.daysRemaining || 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-xl">
                    <CreditCard className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mi Suscripción</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona tu plan y facturación</p>
                </div>
            </div>

            {/* Current Plan Status */}
            <Card className="border-l-4 border-fuchsia-500">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Plan Actual</span>
                            {status === 'ACTIVE' ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                    <CheckCircle size={10} /> Activo
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} /> {status}
                                </span>
                            )}
                        </div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {currentPlan}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isPro
                                ? `Renovación: ${formatDate(subscription?.currentPeriodEnd)}`
                                : 'Actualiza a PRO para desbloquear todas las funciones'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {!isPro ? (
                            <button
                                onClick={() => setShowPlans(!showPlans)}
                                className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg font-medium shadow-lg shadow-purple-200 dark:shadow-none hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Star size={18} className="fill-current" />
                                Actualizar a PRO
                            </button>
                        ) : (
                            <button
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => setShowPlans(!showPlans)}
                            >
                                Cambiar Plan
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UsageCard
                    label="Clientes"
                    used={subscription?._count?.clients || 0}
                    limit={subscription?.limits?.maxClients || 50}
                    icon={Users}
                />
                <UsageCard
                    label="Préstamos Activos"
                    used={subscription?._count?.loans || 0}
                    limit={subscription?.limits?.maxLoans || 20}
                    icon={FileText}
                />
                <UsageCard
                    label="Almacenamiento"
                    used={subscription?.storageUsed || 0}
                    limit={subscription?.limits?.storageLimit || 100}
                    unit="MB"
                    icon={Upload}
                />
            </div>

            {/* Plans Selection */}
            {showPlans && (
                <div className="mt-8 animate-fade-in-up">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center">Planes Disponibles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                isCurrent={currentPlan === plan.id}
                                onSelect={() => {/* Implement payment flow */ }}
                            />
                        ))}
                    </div>

                    {/* Manual Payment Upload */}
                    <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-2">¿Pagaste por transferencia?</h4>
                        <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">Sube tu comprobante de pago para activar tu plan manualmente.</p>

                        <div className="flex justify-center">
                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload size={18} />
                                {uploading ? 'Subiendo...' : 'Subir Comprobante'}
                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Formatos: JPG, PNG, PDF (Max 5MB)</p>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <Card>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Historial de Pagos
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-2 px-3">Fecha</th>
                                <th className="text-left py-2 px-3">Concepto</th>
                                <th className="text-left py-2 px-3">Monto</th>
                                <th className="text-left py-2 px-3">Estado</th>
                                <th className="text-right py-2 px-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscription?.payments?.length > 0 ? (
                                subscription.payments.map(payment => (
                                    <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700/50">
                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{formatDate(payment.createdAt)}</td>
                                        <td className="py-2 px-3 font-medium">Plan {payment.plan} ({payment.interval === 'yearly' ? 'Anual' : 'Mensual'})</td>
                                        <td className="py-2 px-3">${(payment.amount / 100).toFixed(2)} USD</td>
                                        <td className="py-2 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payment.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                                                payment.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {payment.status === 'VERIFIED' ? 'Completado' :
                                                    payment.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            {/* Download invoice button could go here */}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-slate-500">No hay pagos registrados</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function UsageCard({ label, used, limit, unit = '', icon: Icon }) {
    const percentage = Math.min(100, (used / limit) * 100);
    const color = percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-amber-500' : 'bg-green-500';

    return (
        <Card className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <Icon size={16} className="text-slate-400" />
            </div>
            <div className="flex items-end gap-1 mb-2">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{used}</span>
                <span className="text-sm text-slate-400 mb-1">/ {limit === 999999 ? '∞' : limit}{unit}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </Card>
    );
}

function PlanCard({ plan, isCurrent, onSelect }) {
    // Calculate price with fallback: use price field, or monthlyPrice/100, default to 0
    const displayPrice = plan.price ?? (plan.monthlyPrice != null ? plan.monthlyPrice / 100 : 0);
    const isFreePlan = displayPrice === 0 || plan.id === 'FREE';

    return (
        <div className={`relative p-6 rounded-2xl bg-white dark:bg-slate-800 border-2 transition-all ${isCurrent ? 'border-fuchsia-500 shadow-xl scale-105 z-10' : 'border-slate-100 dark:border-slate-700 hover:border-fuchsia-200 dark:hover:border-slate-600'
            }`}>
            {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-fuchsia-500 text-white text-xs font-bold rounded-full shadow-md">
                    PLAN ACTUAL
                </span>
            )}

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
            <div className="mb-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {isFreePlan ? 'Gratis' : `$${displayPrice}`}
                </span>
                {!isFreePlan && <span className="text-slate-500"> USD/mes</span>}
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                {plan.description || "Ideal para comenzar"}
            </p>

            <ul className="space-y-3 mb-8">
                {(plan.features || []).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            {!isCurrent && (
                <button
                    onClick={() => onSelect(plan)}
                    className={`w-full py-2.5 rounded-lg font-bold transition-colors ${plan.price > 0
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                        : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    {plan.price > 0 ? 'Seleccionar Plan' : 'Plan Básico'}
                </button>
            )}
        </div>
    );
}

export default SubscriptionDashboard;
