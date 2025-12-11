import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Edit2, Trash2, Key, Shield, Activity,
    Phone, Mail, User, CheckCircle, XCircle, AlertTriangle,
    Copy, Eye, EyeOff, UserPlus
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import { formatDateTime } from '../../../shared/utils/formatters';
import collectorService from '../services/collectorService';

const DEFAULT_PERMISSIONS = {
    canViewAllClients: false,
    canRegisterPayments: true,
    canApplyPenalties: true,
    canViewLoanDetails: true,
    canViewClientDocuments: false,
    canEditClients: false,
    canViewReports: false,
    maxPaymentAmount: null
};

const PERMISSION_LABELS = {
    canViewAllClients: { label: 'Ver todos los clientes', desc: 'Ver clientes no asignados' },
    canRegisterPayments: { label: 'Registrar pagos', desc: 'Cobrar cuotas' },
    canApplyPenalties: { label: 'Aplicar mora', desc: 'Agregar penalidades' },
    canViewLoanDetails: { label: 'Ver préstamos', desc: 'Detalles de préstamos' },
    canViewClientDocuments: { label: 'Ver documentos', desc: 'Documentos de clientes' },
    canEditClients: { label: 'Editar clientes', desc: 'Modificar datos' },
    canViewReports: { label: 'Ver reportes', desc: 'Acceso a reportes' }
};

export function CollectorsView({ showToast, clients = [] }) {
    const [collectors, setCollectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCollector, setEditingCollector] = useState(null);
    const [showPermissions, setShowPermissions] = useState(null);
    const [showActivity, setShowActivity] = useState(null);
    const [activityData, setActivityData] = useState([]);
    const [tempPassword, setTempPassword] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        createCredentials: false,
        username: ''
    });

    useEffect(() => {
        loadCollectors();
    }, []);

    const loadCollectors = async () => {
        try {
            setLoading(true);
            const data = await collectorService.getCollectors();
            setCollectors(data);
        } catch (e) {
            showToast?.('Error cargando cobradores', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCollector) {
                const updated = await collectorService.updateCollector(editingCollector.id, formData);
                setCollectors(prev => prev.map(c => c.id === editingCollector.id ? { ...c, ...updated } : c));
                showToast?.('Cobrador actualizado', 'success');
            } else {
                const created = await collectorService.createCollector(formData);
                setCollectors(prev => [created, ...prev]);
                if (created.temporaryPassword) {
                    setTempPassword(created.temporaryPassword);
                }
                showToast?.('Cobrador creado', 'success');
            }
            resetForm();
        } catch (e) {
            showToast?.(e.message || 'Error guardando cobrador', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este cobrador? Los clientes asignados serán desasignados.')) return;
        try {
            await collectorService.deleteCollector(id);
            setCollectors(prev => prev.filter(c => c.id !== id));
            showToast?.('Cobrador eliminado', 'success');
        } catch (e) {
            showToast?.('Error eliminando cobrador', 'error');
        }
    };

    const handleResetPassword = async (id) => {
        if (!confirm('¿Generar nueva contraseña? La anterior dejará de funcionar.')) return;
        try {
            const result = await collectorService.resetPassword(id);
            setTempPassword(result.newPassword);
            showToast?.(result.message || 'Contraseña reseteada', 'success');
        } catch (e) {
            showToast?.('Error reseteando contraseña', 'error');
        }
    };

    const handleSavePermissions = async (id, permissions) => {
        try {
            await collectorService.updatePermissions(id, permissions);
            setCollectors(prev => prev.map(c => c.id === id ? { ...c, permissions } : c));
            setShowPermissions(null);
            showToast?.('Permisos actualizados', 'success');
        } catch (e) {
            showToast?.('Error guardando permisos', 'error');
        }
    };

    const handleViewActivity = async (collector) => {
        setShowActivity(collector);
        try {
            const data = await collectorService.getActivity(collector.id);
            setActivityData(data.activities || []);
        } catch (e) {
            setActivityData([]);
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingCollector(null);
        setFormData({ name: '', phone: '', email: '', createCredentials: false, username: '' });
    };

    const openEdit = (collector) => {
        setEditingCollector(collector);
        setFormData({
            name: collector.name,
            phone: collector.phone || '',
            email: collector.email || '',
            createCredentials: false,
            username: collector.username || ''
        });
        setShowForm(true);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showToast?.('Copiado al portapapeles', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cobradores</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {collectors.length} cobradores registrados
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    Nuevo Cobrador
                </button>
            </div>

            {/* Temp Password Modal */}
            {tempPassword && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Key className="text-amber-500" />
                            Contraseña Temporal
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Guarda esta contraseña. El cobrador deberá cambiarla en su primer inicio de sesión.
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4">
                            <code className="flex-1 text-lg font-mono text-slate-800 dark:text-slate-200">{tempPassword}</code>
                            <button
                                onClick={() => copyToClipboard(tempPassword)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                        <button
                            onClick={() => setTempPassword(null)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            {editingCollector ? 'Editar Cobrador' : 'Nuevo Cobrador'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <User size={14} className="inline mr-1" />
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <Phone size={14} className="inline mr-1" />
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                    placeholder="809-555-1234"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <Mail size={14} className="inline mr-1" />
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                    placeholder="cobrador@email.com"
                                />
                            </div>

                            {!editingCollector && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.createCredentials}
                                            onChange={(e) => setFormData(p => ({ ...p, createCredentials: e.target.checked }))}
                                            className="w-5 h-5 rounded text-indigo-600"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">Crear credenciales de acceso</p>
                                            <p className="text-xs text-slate-500">Permitir login al cobrador</p>
                                        </div>
                                    </label>

                                    {formData.createCredentials && (
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Usuario
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '.') }))}
                                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                                placeholder={formData.name.toLowerCase().replace(/\s/g, '.') || 'usuario'}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Se generará una contraseña temporal</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                                >
                                    {editingCollector ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermissions && (
                <PermissionsModal
                    collector={showPermissions}
                    onSave={(perms) => handleSavePermissions(showPermissions.id, perms)}
                    onClose={() => setShowPermissions(null)}
                />
            )}

            {/* Activity Modal */}
            {showActivity && (
                <ActivityModal
                    collector={showActivity}
                    activities={activityData}
                    onClose={() => setShowActivity(null)}
                />
            )}

            {/* Collectors List */}
            {loading ? (
                <Card>
                    <p className="text-center text-slate-500 py-8">Cargando cobradores...</p>
                </Card>
            ) : collectors.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">No hay cobradores registrados</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                        >
                            Crear primer cobrador
                        </button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collectors.map(collector => (
                        <Card key={collector.id} className="relative">
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4">
                                {collector.isActive !== false ? (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                                        <CheckCircle size={12} />
                                        Activo
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                                        <XCircle size={12} />
                                        Inactivo
                                    </span>
                                )}
                            </div>

                            {/* Collector Info */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {collector.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{collector.name}</h3>
                                    {collector.phone && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Phone size={12} />
                                            {collector.phone}
                                        </p>
                                    )}
                                    {collector.email && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                            <Mail size={12} />
                                            {collector.email}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 mb-4 text-sm">
                                <div className="flex-1 text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{collector.clients?.length || 0}</p>
                                    <p className="text-xs text-slate-500">Clientes</p>
                                </div>
                                <div className="flex-1 text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{collector._count?.routeClosings || 0}</p>
                                    <p className="text-xs text-slate-500">Cierres</p>
                                </div>
                            </div>

                            {/* Credentials indicator */}
                            {collector.hasCredentials && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                                    <Key size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm text-blue-700 dark:text-blue-300">Usuario: {collector.username}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => openEdit(collector)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Edit2 size={14} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => setShowPermissions(collector)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Shield size={14} />
                                    Permisos
                                </button>
                                <button
                                    onClick={() => handleViewActivity(collector)}
                                    className="flex items-center justify-center gap-1 py-2 px-3 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Activity size={14} />
                                </button>
                                {collector.hasCredentials && (
                                    <button
                                        onClick={() => handleResetPassword(collector.id)}
                                        // className="flex items-center justify-center gap-1 py-2 px-3 text-sm text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                        className="flex items-center justify-center gap-1 py-2 px-3 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        <Key size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(collector.id)}
                                    className="flex items-center justify-center gap-1 py-2 px-3 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// Permissions Modal Component
function PermissionsModal({ collector, onSave, onClose }) {
    const [permissions, setPermissions] = useState(collector.permissions || DEFAULT_PERMISSIONS);

    const handleToggle = (key) => {
        setPermissions(p => ({ ...p, [key]: !p[key] }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="text-indigo-600" />
                    Permisos de {collector.name}
                </h3>

                <div className="space-y-3 mb-6">
                    {Object.entries(PERMISSION_LABELS).map(([key, { label, desc }]) => (
                        <label key={key} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                            <input
                                type="checkbox"
                                checked={permissions[key] || false}
                                onChange={() => handleToggle(key)}
                                className="w-5 h-5 rounded text-indigo-600"
                            />
                            <div className="flex-1">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{label}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(permissions)}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                    >
                        Guardar Permisos
                    </button>
                </div>
            </div>
        </div>
    );
}

// Activity Modal Component
function ActivityModal({ collector, activities, onClose }) {
    const ACTION_LABELS = {
        LOGIN: { label: 'Inicio de sesión', icon: '🔓', color: 'text-green-600' },
        LOGOUT: { label: 'Cierre de sesión', icon: '🔒', color: 'text-slate-500' },
        PAYMENT_REGISTERED: { label: 'Pago registrado', icon: '💰', color: 'text-emerald-600' },
        CLIENT_VISITED: { label: 'Cliente visitado', icon: '👤', color: 'text-blue-600' },
        ROUTE_STARTED: { label: 'Ruta iniciada', icon: '🚀', color: 'text-indigo-600' },
        ROUTE_FINISHED: { label: 'Ruta finalizada', icon: '✅', color: 'text-teal-600' }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Activity className="text-indigo-600" />
                    Actividad de {collector.name}
                </h3>

                {activities.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Sin actividad registrada</p>
                ) : (
                    <div className="space-y-3 mb-4">
                        {activities.map(act => {
                            const info = ACTION_LABELS[act.action] || { label: act.action, icon: '📌', color: 'text-slate-600' };
                            return (
                                <div key={act.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="text-lg">{info.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium ${info.color}`}>{info.label}</p>
                                        <p className="text-xs text-slate-500">{formatDateTime(act.createdAt)}</p>
                                        {act.details && (
                                            <p className="text-xs text-slate-400 mt-1">{JSON.stringify(act.details)}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-medium"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}

export default CollectorsView;
