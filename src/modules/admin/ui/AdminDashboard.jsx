import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Building2, CreditCard, ScrollText, Search,
    TrendingUp, Users, DollarSign, AlertTriangle, CheckCircle,
    XCircle, Clock, Eye, Ban, PlayCircle, FileText, Megaphone, Send
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import { formatCurrency, formatDateTime, formatDate } from '../../../shared/utils/formatters';
import adminService from '../services/adminService';

const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Empresas', icon: Building2 },
    { id: 'payments', label: 'Pagos Pendientes', icon: CreditCard },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'logs', label: 'Audit Logs', icon: ScrollText }
];

export function AdminDashboard({ showToast }) {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [tenants, setTenants] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Broadcast state
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [sendEmail, setSendEmail] = useState(false);
    const [broadcastSending, setBroadcastSending] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState(null);


    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            switch (activeTab) {
                case 'dashboard':
                    const dashData = await adminService.getDashboard();
                    setStats(dashData);
                    break;
                case 'tenants':
                    const tenantsData = await adminService.getTenants({ search });
                    setTenants(tenantsData.tenants || []);
                    break;
                case 'payments':
                    const paymentsData = await adminService.getPendingPayments();
                    setPendingPayments(paymentsData || []);
                    break;
                case 'logs':
                    const logsData = await adminService.getLogs();
                    setLogs(logsData.logs || []);
                    break;
            }
        } catch (e) {
            console.error('Error loading admin data:', e);
        } finally {
            setLoading(false);
        }
    };

    // Modal states for custom dialogs
    const [suspendModal, setSuspendModal] = useState(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [activateModal, setActivateModal] = useState(null);
    const [verifyModal, setVerifyModal] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const handleSuspendTenant = (id) => {
        setSuspendModal(id);
        setSuspendReason('');
    };

    const confirmSuspendTenant = async () => {
        if (!suspendModal || !suspendReason.trim()) return;
        try {
            await adminService.suspendTenant(suspendModal, suspendReason);
            showToast?.('Empresa suspendida', 'success');
            setSuspendModal(null);
            setSuspendReason('');
            loadData();
        } catch (e) {
            showToast?.('Error suspendiendo', 'error');
        }
    };

    const handleActivateTenant = (id) => {
        setActivateModal(id);
    };

    const confirmActivateTenant = async () => {
        if (!activateModal) return;
        try {
            await adminService.activateTenant(activateModal);
            showToast?.('Empresa activada', 'success');
            setActivateModal(null);
            loadData();
        } catch (e) {
            showToast?.('Error activando', 'error');
        }
    };

    const handleVerifyPayment = async (id) => {
        setVerifyModal(id);
    };

    const confirmVerifyPayment = async () => {
        if (!verifyModal) return;
        try {
            await adminService.verifyPayment(verifyModal);
            showToast?.('Pago verificado y suscripción activada', 'success');
            setVerifyModal(null);
            loadData();
        } catch (e) {
            showToast?.('Error verificando pago', 'error');
        }
    };

    const handleRejectPayment = async (id) => {
        setRejectModal(id);
        setRejectReason('');
    };

    const confirmRejectPayment = async () => {
        if (!rejectModal || !rejectReason.trim()) return;
        try {
            await adminService.rejectPayment(rejectModal, rejectReason);
            showToast?.('Pago rechazado', 'success');
            setRejectModal(null);
            setRejectReason('');
            loadData();
        } catch (e) {
            showToast?.('Error rechazando pago', 'error');
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
            showToast?.('Completa título y mensaje', 'error');
            return;
        }
        setBroadcastSending(true);
        setBroadcastResult(null);
        try {
            const result = await adminService.sendBroadcast(broadcastTitle, broadcastMessage, sendEmail);
            setBroadcastResult(result.data?.stats || result.stats || { success: true });
            showToast?.('Broadcast enviado exitosamente', 'success');
            setBroadcastTitle('');
            setBroadcastMessage('');
            setSendEmail(false);
        } catch (e) {
            showToast?.('Error enviando broadcast', 'error');
            setBroadcastResult({ error: e.message });
        } finally {
            setBroadcastSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <LayoutDashboard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Panel de Administración</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestión global del sistema</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.id === 'payments' && pendingPayments.length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">{pendingPayments.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <Card><p className="text-center text-slate-500 py-8">Cargando...</p></Card>
            ) : (
                <>
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && stats && (
                        <div className="space-y-6">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    icon={Building2}
                                    label="Empresas"
                                    value={stats.tenants?.total || 0}
                                    subtext={`${stats.tenants?.active || 0} activas, ${stats.tenants?.suspended || 0} suspendidas`}
                                    color="blue"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Nuevas este mes"
                                    value={stats.tenants?.newThisMonth || 0}
                                    color="green"
                                />
                                <StatCard
                                    icon={CreditCard}
                                    label="Suscripciones Activas"
                                    value={stats.subscriptions?.active || 0}
                                    subtext={`${stats.subscriptions?.pendingPayments || 0} pagos pendientes`}
                                    color="purple"
                                />
                                <StatCard
                                    icon={DollarSign}
                                    label="Ingresos del Mes"
                                    value={formatCurrency(stats.revenue?.thisMonth || 0)}
                                    color="emerald"
                                />
                            </div>

                            {/* Plan Distribution */}
                            <Card>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Distribución de Planes</h3>
                                <div className="flex gap-4 flex-wrap">
                                    {(stats.planDistribution || []).map(p => (
                                        <div key={p.plan} className="flex-1 min-w-[120px] p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{p.count}</p>
                                            <p className="text-sm text-slate-500">{p.plan}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Tenants Tab */}
                    {activeTab === 'tenants' && (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                                        placeholder="Buscar empresas..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <button
                                    onClick={loadData}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                                >
                                    Buscar
                                </button>
                            </div>

                            {/* Tenants List */}
                            <div className="space-y-3">
                                {tenants.length === 0 ? (
                                    <Card><p className="text-center text-slate-500 py-8">No hay empresas</p></Card>
                                ) : tenants.map(tenant => (
                                    <Card key={tenant.id}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{tenant.name}</h3>
                                                    {tenant.suspendedAt ? (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">Suspendida</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">Activa</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">@{tenant.slug}</p>
                                                <div className="flex gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <span><Users size={14} className="inline mr-1" />{tenant._count?.clients || 0} clientes</span>
                                                    <span><FileText size={14} className="inline mr-1" />{tenant._count?.loans || 0} préstamos</span>
                                                    <span><CreditCard size={14} className="inline mr-1" />{tenant.subscription?.plan || 'FREE'}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {tenant.suspendedAt ? (
                                                    <button
                                                        onClick={() => handleActivateTenant(tenant.id)}
                                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                    >
                                                        <PlayCircle size={16} />
                                                        Activar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuspendTenant(tenant.id)}
                                                        className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Ban size={16} />
                                                        Suspender
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payments Tab */}
                    {activeTab === 'payments' && (
                        <div className="space-y-3">
                            {pendingPayments.length === 0 ? (
                                <Card>
                                    <div className="text-center py-12">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                        <p className="text-slate-500">No hay pagos pendientes de verificación</p>
                                    </div>
                                </Card>
                            ) : pendingPayments.map(payment => (
                                <Card key={payment.id}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="text-amber-500" size={18} />
                                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                                    {payment.subscription?.tenant?.name || 'Empresa'}
                                                </span>
                                                <span className="text-sm text-slate-500">({payment.subscription?.tenant?.slug})</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-slate-500">Monto</p>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(payment.amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Plan</p>
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{payment.plan}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Método</p>
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{payment.method}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-500">Fecha</p>
                                                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(payment.createdAt)}</p>
                                                </div>
                                            </div>
                                            {payment.proofImageUrl && (
                                                <a
                                                    href={payment.proofImageUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:underline"
                                                >
                                                    <Eye size={14} />
                                                    Ver comprobante
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleVerifyPayment(payment.id)}
                                                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                            >
                                                <CheckCircle size={16} />
                                                Verificar
                                            </button>
                                            <button
                                                onClick={() => handleRejectPayment(payment.id)}
                                                className="flex items-center gap-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                                            >
                                                <XCircle size={16} />
                                                Rechazar
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Broadcast Tab */}
                    {activeTab === 'broadcast' && (
                        <Card>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Enviar Broadcast</h3>
                                    <p className="text-sm text-slate-500">Envia una notificación a todas las empresas activas</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Título
                                    </label>
                                    <input
                                        type="text"
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        placeholder="Ej: 🚀 IA Disponible"
                                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Mensaje
                                    </label>
                                    <textarea
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        placeholder="El asistente de inteligencia artificial está disponible de nuevo..."
                                        rows={4}
                                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="sendEmail"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="sendEmail" className="text-sm text-slate-700 dark:text-slate-300">
                                        También enviar por correo electrónico
                                    </label>
                                </div>

                                <button
                                    onClick={handleSendBroadcast}
                                    disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {broadcastSending ? (
                                        <>Enviando...</>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Enviar Broadcast
                                        </>
                                    )}
                                </button>

                                {broadcastResult && (
                                    <div className={`p-4 rounded-xl ${broadcastResult.error ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                                        {broadcastResult.error ? (
                                            <p className="text-red-600 dark:text-red-400">❌ Error: {broadcastResult.error}</p>
                                        ) : (
                                            <div className="text-green-700 dark:text-green-400">
                                                <p className="font-semibold mb-2">✅ Broadcast enviado exitosamente</p>
                                                <p className="text-sm">Empresas: {broadcastResult.tenants || 0}</p>
                                                <p className="text-sm">Notificaciones: {broadcastResult.notificationsCreated || 0}</p>
                                                {sendEmail && (
                                                    <p className="text-sm">Emails enviados: {broadcastResult.emailsSent || 0} ({broadcastResult.emailsFailed || 0} fallidos)</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Logs Tab */}
                    {activeTab === 'logs' && (
                        <Card>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Registros de Auditoría</h3>
                            {logs.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No hay logs</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left py-2 px-3">Fecha</th>
                                                <th className="text-left py-2 px-3">Acción</th>
                                                <th className="text-left py-2 px-3">Tipo</th>
                                                <th className="text-left py-2 px-3">Admin</th>
                                                <th className="text-left py-2 px-3">Razón</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map(log => (
                                                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700/50">
                                                    <td className="py-2 px-3 text-slate-500">{formatDateTime(log.createdAt)}</td>
                                                    <td className="py-2 px-3 font-medium">{log.action}</td>
                                                    <td className="py-2 px-3">{log.targetType}</td>
                                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{log.adminEmail}</td>
                                                    <td className="py-2 px-3 text-slate-500">{log.reason || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}
                </>
            )}

            {/* Verify Payment Modal */}
            {verifyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Verificar Pago
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            ¿Confirmas que el pago ha sido recibido? Esto activará la suscripción del cliente.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setVerifyModal(null)}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmVerifyPayment}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Payment Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Rechazar Pago
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-3">
                            Indica la razón por la que rechazas este pago:
                        </p>
                        <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ej: Comprobante no válido"
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmRejectPayment}
                                disabled={!rejectReason.trim()}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                                Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Tenant Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Suspender Empresa
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-3">
                            Indica la razón para suspender esta empresa:
                        </p>
                        <input
                            type="text"
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="Ej: Falta de pago"
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmSuspendTenant}
                                disabled={!suspendReason.trim()}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
                            >
                                Suspender
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activate Tenant Modal */}
            {activateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Activar Empresa
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            ¿Confirmas que deseas activar esta empresa?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActivateModal(null)}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmActivateTenant}
                                className="flex-1 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Activar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtext, color = 'blue' }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    return (
        <Card>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                    {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
                </div>
            </div>
        </Card>
    );
}

export default AdminDashboard;
