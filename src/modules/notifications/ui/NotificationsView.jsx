import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, Mail, Calendar, Clock, AlertTriangle, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import { formatDateTime } from '../../../shared/utils/formatters';
import notificationService from '../services/notificationService';

const NOTIFICATION_ICONS = {
    PAYMENT_DUE: '💰',
    PAYMENT_RECEIVED: '✅',
    REPORT: '📊',
    SYSTEM: '⚙️',
    SUBSCRIPTION: '💳',
    OVERDUE: '⚠️'
};

const NOTIFICATION_COLORS = {
    PAYMENT_DUE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    REPORT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    SYSTEM: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    SUBSCRIPTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

// MEJORA 11: Type labels for grouping
const TYPE_LABELS = {
    PAYMENT_DUE: 'Pagos Pendientes',
    PAYMENT_RECEIVED: 'Pagos Recibidos',
    REPORT: 'Reportes',
    SYSTEM: 'Sistema',
    SUBSCRIPTION: 'Suscripción',
    OVERDUE: 'Mora'
};

export function NotificationsView({ showToast, systemSettings }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, unread, preferences
    const [preferences, setPreferences] = useState(null);
    const [savingPrefs, setSavingPrefs] = useState(false);

    // MEJORA: Expanded notification ID for click-to-expand
    const [expandedId, setExpandedId] = useState(null);
    // MEJORA 11: Group by type toggle
    const [groupByType, setGroupByType] = useState(false);

    useEffect(() => {
        loadNotifications();
        loadPreferences();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationService.getNotifications();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (e) {
            console.error('Error loading notifications:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadPreferences = async () => {
        try {
            const prefs = await notificationService.getEmailPreferences();
            setPreferences(prefs);
        } catch (e) {
            console.error('Error loading preferences:', e);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch (e) {
            showToast?.('Error al marcar como leída', 'error');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            showToast?.('Todas las notificaciones marcadas como leídas', 'success');
        } catch (e) {
            showToast?.('Error al marcar todas', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showToast?.('Notificación eliminada', 'success');
        } catch (e) {
            showToast?.('Error al eliminar', 'error');
        }
    };

    const handleSavePreferences = async () => {
        try {
            setSavingPrefs(true);
            await notificationService.updateEmailPreferences(preferences);
            showToast?.('Preferencias guardadas', 'success');
        } catch (e) {
            showToast?.('Error guardando preferencias', 'error');
        } finally {
            setSavingPrefs(false);
        }
    };

    const handleTestEmail = async () => {
        const email = preferences?.reportEmail || prompt('Ingresa email para prueba:');
        if (!email) return;

        try {
            await notificationService.sendTestEmail(email);
            showToast?.('Email de prueba enviado', 'success');
        } catch (e) {
            showToast?.('Error enviando email', 'error');
        }
    };

    // MEJORA 8: WhatsApp reminder
    const handleWhatsAppReminder = (notification) => {
        const phone = systemSettings?.companyWhatsApp || '';
        if (!phone) {
            showToast?.('Configure el WhatsApp de empresa en Ajustes', 'error');
            return;
        }
        const message = encodeURIComponent(`Recordatorio: ${notification.title}\n${notification.message}`);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    };

    // Click handler for touchable notifications
    const handleNotificationClick = (notification) => {
        if (expandedId === notification.id) {
            // Already expanded - navigate if has actionUrl
            if (notification.actionUrl) {
                window.location.href = notification.actionUrl;
            }
        } else {
            // First click - expand
            setExpandedId(notification.id);
            // Mark as read
            if (!notification.read) {
                handleMarkAsRead(notification.id);
            }
        }
    };

    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    // MEJORA 11: Group notifications by type
    const groupedNotifications = useMemo(() => {
        if (!groupByType) return null;
        const groups = {};
        filteredNotifications.forEach(n => {
            const type = n.type || 'SYSTEM';
            if (!groups[type]) groups[type] = [];
            groups[type].push(n);
        });
        return groups;
    }, [filteredNotifications, groupByType]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notificaciones</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <CheckCheck size={18} />
                        Marcar todas como leídas
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                {[
                    { id: 'all', label: 'Todas', icon: Bell },
                    { id: 'unread', label: 'Sin leer', icon: AlertTriangle, count: unreadCount },
                    { id: 'preferences', label: 'Preferencias', icon: Settings }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'preferences' ? (
                /* Preferences Tab */
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <Mail size={20} />
                        Preferencias de Email
                    </h3>

                    {preferences ? (
                        <div className="space-y-6">
                            {/* Reports Section */}
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Calendar size={18} />
                                    Reportes Automáticos
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'dailyReport', label: 'Diario', desc: 'Resumen cada día' },
                                        { key: 'weeklyReport', label: 'Semanal', desc: 'Cada lunes' },
                                        { key: 'monthlyReport', label: 'Mensual', desc: 'Primer día del mes' }
                                    ].map(report => (
                                        <label key={report.key} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={preferences[report.key] || false}
                                                onChange={(e) => setPreferences(p => ({ ...p, [report.key]: e.target.checked }))}
                                                className="mt-1 w-5 h-5 rounded text-blue-600"
                                            />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{report.label}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{report.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Alerts Section */}
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <AlertTriangle size={18} />
                                    Alertas
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: 'paymentReminders', label: 'Recordatorios de pago', desc: 'Antes del vencimiento' },
                                        { key: 'overdueAlerts', label: 'Alertas de mora', desc: 'Cuotas vencidas' },
                                        { key: 'subscriptionAlerts', label: 'Suscripción', desc: 'Vencimiento próximo' }
                                    ].map(alert => (
                                        <label key={alert.key} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={preferences[alert.key] || false}
                                                onChange={(e) => setPreferences(p => ({ ...p, [alert.key]: e.target.checked }))}
                                                className="mt-1 w-5 h-5 rounded text-blue-600"
                                            />
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{alert.label}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{alert.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <Clock size={16} className="inline mr-2" />
                                        Hora de envío de reportes
                                    </label>
                                    <select
                                        value={preferences.reportHour || 8}
                                        onChange={(e) => setPreferences(p => ({ ...p, reportHour: parseInt(e.target.value) }))}
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <Mail size={16} className="inline mr-2" />
                                        Email alternativo para reportes
                                    </label>
                                    <input
                                        type="email"
                                        value={preferences.reportEmail || ''}
                                        onChange={(e) => setPreferences(p => ({ ...p, reportEmail: e.target.value }))}
                                        placeholder="Dejar vacío para usar email principal"
                                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={handleSavePreferences}
                                    disabled={savingPrefs}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingPrefs ? 'Guardando...' : 'Guardar Preferencias'}
                                </button>
                                <button
                                    onClick={handleTestEmail}
                                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Enviar Email de Prueba
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Cargando preferencias...</p>
                    )}
                </Card>
            ) : (
                /* Notifications List */
                <div className="space-y-3">
                    {/* MEJORA 11: Group toggle */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500">{filteredNotifications.length} notificaciones</span>
                        <button
                            onClick={() => setGroupByType(!groupByType)}
                            className={`text-sm px-3 py-1 rounded-lg transition-colors ${groupByType ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {groupByType ? '✓ Agrupado por tipo' : 'Agrupar por tipo'}
                        </button>
                    </div>

                    {loading ? (
                        <Card>
                            <p className="text-center text-slate-500 py-8">Cargando notificaciones...</p>
                        </Card>
                    ) : filteredNotifications.length === 0 ? (
                        <Card>
                            <div className="text-center py-12">
                                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">
                                    {activeTab === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                                </p>
                            </div>
                        </Card>
                    ) : groupByType && groupedNotifications ? (
                        /* GROUPED VIEW */
                        Object.entries(groupedNotifications).map(([type, items]) => (
                            <div key={type} className="mb-4">
                                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                                    <span>{NOTIFICATION_ICONS[type] || '📌'}</span>
                                    {TYPE_LABELS[type] || type} ({items.length})
                                </h3>
                                <div className="space-y-2">
                                    {items.map(notification => (
                                        <NotificationCard
                                            key={notification.id}
                                            notification={notification}
                                            expandedId={expandedId}
                                            handleNotificationClick={handleNotificationClick}
                                            handleWhatsAppReminder={handleWhatsAppReminder}
                                            handleDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        /* FLAT VIEW */
                        filteredNotifications.map(notification => (
                            <NotificationCard
                                key={notification.id}
                                notification={notification}
                                expandedId={expandedId}
                                handleNotificationClick={handleNotificationClick}
                                handleWhatsAppReminder={handleWhatsAppReminder}
                                handleDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Touchable Notification Card Component
function NotificationCard({ notification, expandedId, handleNotificationClick, handleWhatsAppReminder, handleDelete }) {
    const isExpanded = expandedId === notification.id;

    return (
        <div
            onClick={() => handleNotificationClick(notification)}
            className={`p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${notification.read
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                } ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-2 rounded-lg shrink-0 ${NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.SYSTEM}`}>
                    <span className="text-xl">{NOTIFICATION_ICONS[notification.type] || '📌'}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold ${notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                            {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                {formatDateTime(notification.createdAt)}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                    </div>

                    {/* Message - truncated or full based on expanded state */}
                    <p className={`text-sm text-slate-600 dark:text-slate-400 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {notification.message}
                    </p>

                    {/* Expanded Actions */}
                    {isExpanded && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                            {notification.actionUrl && (
                                <a
                                    href={notification.actionUrl}
                                    className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-lg text-center hover:bg-blue-700"
                                >
                                    Abrir →
                                </a>
                            )}
                            <button
                                onClick={() => handleWhatsAppReminder(notification)}
                                className="py-2 px-3 bg-green-500 text-white text-sm font-medium rounded-lg flex items-center gap-1 hover:bg-green-600"
                            >
                                <MessageCircle size={14} />
                                WhatsApp
                            </button>
                            <button
                                onClick={() => handleDelete(notification.id)}
                                className="py-2 px-3 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotificationsView;
