import React, { useMemo, useState } from 'react';
import Card from '../components/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
    TrendingUp, TrendingDown, Users, Wallet, Calendar, AlertTriangle,
    CheckCircle, Clock, DollarSign, Bell, Filter, ChevronRight, Crown
} from 'lucide-react';

export default function DashboardView({
    loans = [],
    clients = [],
    receipts = [],
    expenses = [],
    showToast,
    onNavigate,
    subscriptionInfo,
    tenantInfo
}) {
    const [filter, setFilter] = useState('today'); // today, week, month, all

    // Date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const getFilterDate = () => {
        switch (filter) {
            case 'today': return startOfToday;
            case 'week': return startOfWeek;
            case 'month': return startOfMonth;
            default: return new Date(0);
        }
    };

    // Core metrics
    const totalLent = loans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalCollected = loans.reduce((acc, l) => acc + (l.totalPaid || 0), 0);
    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
    const paidLoans = loans.filter(l => l.status === 'PAID').length;

    // Calculate expected interest
    const totalExpectedInterest = loans.reduce((acc, l) => acc + (l.totalInterest || 0), 0);
    const totalExpected = totalLent + totalExpectedInterest;
    const pendingAmount = totalExpected - totalCollected;

    // Filter-based metrics
    const filterDate = getFilterDate();
    const filteredReceipts = receipts.filter(r => new Date(r.date) >= filterDate);
    const filteredExpenses = expenses.filter(e => e.date && new Date(e.date) >= filterDate);

    const periodIncome = filteredReceipts.reduce((acc, r) => {
        const base = parseFloat(r.amount || 0);
        const penalty = parseFloat(r.penaltyAmount || 0);
        return acc + base + penalty;
    }, 0);

    const periodExpenses = filteredExpenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const periodProfit = periodIncome - periodExpenses;
    const periodPenalties = filteredReceipts.reduce((acc, r) => acc + parseFloat(r.penaltyAmount || 0), 0);

    // Overdue installments (notifications)
    const overdueInstallments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return loans.flatMap(loan => {
            const client = clients.find(c => c.id === loan.clientId);
            return (loan.schedule || [])
                .filter(inst => inst.status !== 'PAID' && new Date(inst.date) < today)
                .map(inst => ({
                    ...inst,
                    loanId: loan.id,
                    clientName: client?.name || 'Sin nombre',
                    clientPhone: client?.phone,
                    daysOverdue: Math.floor((today - new Date(inst.date)) / (1000 * 60 * 60 * 24)),
                }));
        }).sort((a, b) => b.daysOverdue - a.daysOverdue);
    }, [loans, clients]);

    // Upcoming due today
    const dueToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return loans.flatMap(loan => {
            const client = clients.find(c => c.id === loan.clientId);
            return (loan.schedule || [])
                .filter(inst => {
                    const d = new Date(inst.date);
                    return inst.status !== 'PAID' && d >= today && d < tomorrow;
                })
                .map(inst => ({
                    ...inst,
                    loanId: loan.id,
                    clientName: client?.name || 'Sin nombre',
                }));
        });
    }, [loans, clients]);

    // Recent payments
    const recentPayments = receipts
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const filterLabels = {
        today: 'Hoy',
        week: 'Esta Semana',
        month: 'Este Mes',
        all: 'Todo'
    };

    // Calculate days remaining for free plan
    const daysRemaining = useMemo(() => {
        if (!tenantInfo?.createdAt) return null;
        if (subscriptionInfo?.plan && subscriptionInfo.plan !== 'FREE') return null;

        const createdAt = new Date(tenantInfo.createdAt);
        const expiryDate = new Date(createdAt);
        expiryDate.setDate(expiryDate.getDate() + 30);

        const now = new Date();
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    }, [tenantInfo, subscriptionInfo]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Subscription Warning Banner */}
            {daysRemaining !== null && daysRemaining <= 30 && (
                <div className={`rounded-xl p-4 flex items-center gap-4 ${daysRemaining <= 7
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                    : daysRemaining <= 15
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    }`}>
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Crown size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold">
                            {daysRemaining === 0
                                ? '¡Tu cuenta expira hoy!'
                                : daysRemaining === 1
                                    ? '¡Tu cuenta expira mañana!'
                                    : `Tu cuenta expira en ${daysRemaining} días`}
                        </p>
                        <p className="text-sm opacity-90">
                            Elige un plan para mantener acceso a todas las funciones
                        </p>
                    </div>
                    <button
                        onClick={() => onNavigate?.('plans')}
                        className="px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2"
                    >
                        Ver Planes <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Header with filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Panel de Control</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Resumen financiero de tu negocio</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {Object.entries(filterLabels).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === key
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => onNavigate?.('loans')}
                    className="text-left w-full group"
                >
                    <Card className="bg-[#0f172a] border border-blue-900/50 hover:border-blue-500/50 transition-all group-hover:shadow-blue-900/20 group-hover:shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest">Cartera</p>
                                <p className="text-xl md:text-3xl font-black text-white mt-1 truncate">{formatCurrency(totalLent)}</p>
                                <p className="text-[10px] md:text-xs text-slate-400 mt-1">{loans.length} préstamos</p>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 flex-shrink-0">
                                <Wallet size={20} />
                            </div>
                        </div>
                    </Card>
                </button>

                <button
                    onClick={() => onNavigate?.('cuadre')}
                    className="text-left w-full group"
                >
                    <Card className="bg-[#0f172a] border border-emerald-900/50 hover:border-emerald-500/50 transition-all group-hover:shadow-emerald-900/20 group-hover:shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest">Recaudado</p>
                                <p className="text-xl md:text-3xl font-black text-white mt-1 truncate">{formatCurrency(totalCollected)}</p>
                                <p className="text-[10px] md:text-xs text-slate-400 mt-1 truncate">{paidLoans} pagados</p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                    </Card>
                </button>

                <button
                    onClick={() => onNavigate?.('routes')}
                    className="text-left w-full group"
                >
                    <Card className="bg-[#0f172a] border border-amber-900/50 hover:border-amber-500/50 transition-all group-hover:shadow-amber-900/20 group-hover:shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-bold text-amber-400 uppercase tracking-widest">Por Cobrar</p>
                                <p className="text-xl md:text-3xl font-black text-white mt-1 truncate">{formatCurrency(pendingAmount)}</p>
                                <p className="text-[10px] md:text-xs text-slate-400 mt-1">{activeLoans} activos</p>
                            </div>
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 flex-shrink-0">
                                <Clock size={20} />
                            </div>
                        </div>
                    </Card>
                </button>

                <button
                    onClick={() => onNavigate?.('clients')}
                    className="text-left w-full group"
                >
                    <Card className="bg-[#0f172a] border border-violet-900/50 hover:border-violet-500/50 transition-all group-hover:shadow-violet-900/20 group-hover:shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-xs font-bold text-violet-400 uppercase tracking-widest">Clientes</p>
                                <p className="text-xl md:text-3xl font-black text-white mt-1">{clients.length}</p>
                                <p className="text-[10px] md:text-xs text-slate-400 mt-1">Registrados</p>
                            </div>
                            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400 flex-shrink-0">
                                <Users size={20} />
                            </div>
                        </div>
                    </Card>
                </button>
            </div>

            {/* Period Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Ingresos ({filterLabels[filter]})</h3>
                        <span className="text-2xl font-bold text-emerald-600">{formatCurrency(periodIncome)}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Cuotas cobradas</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(periodIncome - periodPenalties)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Mora cobrada</span>
                            <span className="font-semibold text-amber-600">{formatCurrency(periodPenalties)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${Math.min((periodIncome / (totalExpected || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Gastos ({filterLabels[filter]})</h3>
                        <span className="text-2xl font-bold text-rose-600">{formatCurrency(periodExpenses)}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Movimientos</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredExpenses.length}</span>
                        </div>
                        <p className="text-xs text-slate-400">Control de gastos operativos</p>
                    </div>
                </Card>

                <Card className={periodProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Balance ({filterLabels[filter]})</h3>
                        <span className={`text-2xl font-bold ${periodProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(periodProfit)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {periodProfit >= 0 ? (
                            <TrendingUp size={16} className="text-emerald-500" />
                        ) : (
                            <TrendingDown size={16} className="text-rose-500" />
                        )}
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            {periodProfit >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
                        </span>
                    </div>
                </Card>
            </div>

            {/* Notifications & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue Notifications */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Bell size={18} className="text-amber-500" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Alertas de Mora</h3>
                        </div>
                        {overdueInstallments.length > 0 && (
                            <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-xs font-bold rounded-full">
                                {overdueInstallments.length}
                            </span>
                        )}
                    </div>
                    {overdueInstallments.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <CheckCircle size={32} className="text-emerald-500 mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sin cuotas vencidas</p>
                        </div>
                    ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {overdueInstallments.slice(0, 5).map((inst, idx) => (
                                <li key={`${inst.loanId}-${inst.id}-${idx}`} className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-rose-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{inst.clientName}</p>
                                            <p className="text-xs text-slate-500">Cuota #{inst.number} • {inst.daysOverdue} días vencida</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-rose-600">{formatCurrency(inst.payment)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Due Today */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Cobros de Hoy</h3>
                        </div>
                        {dueToday.length > 0 && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold rounded-full">
                                {dueToday.length}
                            </span>
                        )}
                    </div>
                    {dueToday.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <Calendar size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sin cobros programados hoy</p>
                        </div>
                    ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {dueToday.map((inst, idx) => (
                                <li key={`${inst.loanId}-${inst.id}-${idx}`} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{inst.clientName}</p>
                                        <p className="text-xs text-slate-500">Cuota #{inst.number}</p>
                                    </div>
                                    <span className="text-sm font-bold text-blue-600">{formatCurrency(inst.payment)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Últimos Cobros</h3>
                    <span className="text-xs text-slate-500">{receipts.length} total</span>
                </div>
                {recentPayments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No hay pagos registrados</p>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {recentPayments.map(r => (
                            <li key={r.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{r.clientName}</p>
                                    <p className="text-xs text-slate-500">{formatDate(r.date)} • Cuota #{r.installmentNumber || '?'}</p>
                                </div>
                                <span className="font-bold text-emerald-600">{formatCurrency(parseFloat(r.amount || 0) + parseFloat(r.penaltyAmount || 0))}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
