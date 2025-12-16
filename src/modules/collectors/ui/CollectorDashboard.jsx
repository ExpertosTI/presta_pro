import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, DollarSign, Calendar, MapPin, CheckCircle,
    Clock, Phone, LogOut, Key, AlertCircle
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Badge from '../../../shared/components/ui/Badge';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

/**
 * CollectorDashboard - Vista exclusiva para cobradores
 * Solo muestra sus clientes asignados y cobros pendientes
 */
export default function CollectorDashboard({
    collector,
    onLogout,
    onChangePassword,
    showToast
}) {
    const [clients, setClients] = useState([]);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    // Load collector's assigned clients and their loans
    useEffect(() => {
        loadData();
    }, [collector?.id]);

    const loadData = async () => {
        if (!collector?.id) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('collectorToken');

            // Get assigned clients
            const clientsRes = await fetch(`/api/collectors/${collector.id}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (clientsRes.ok) {
                const clientsData = await clientsRes.json();
                setClients(clientsData);

                // Extract loans from clients
                const allLoans = clientsData.flatMap(c =>
                    (c.loans || []).map(l => ({ ...l, clientName: c.name, clientPhone: c.phone }))
                );
                setLoans(allLoans);
            }
        } catch (error) {
            console.error('Error loading collector data:', error);
            showToast?.('Error cargando datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Today's pending payments
    const pendingToday = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return loans.filter(loan => {
            const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
            return schedule.some(s =>
                s.status === 'PENDING' &&
                s.date?.split('T')[0] <= today
            );
        });
    }, [loans]);

    // Stats
    const stats = useMemo(() => {
        const totalPending = pendingToday.reduce((sum, loan) => {
            const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
            const pendingInstallments = schedule.filter(s => s.status === 'PENDING');
            return sum + pendingInstallments.reduce((s, i) => s + (i.payment || 0), 0);
        }, 0);

        return {
            totalClients: clients.length,
            pendingLoans: pendingToday.length,
            totalPending
        };
    }, [clients, pendingToday]);

    const handlePayment = async (loanId, installmentId) => {
        if (!paymentAmount || processing) return;

        try {
            setProcessing(true);
            const token = localStorage.getItem('collectorToken');

            // Get current location
            let location = null;
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 5000,
                            enableHighAccuracy: true
                        });
                    });
                    location = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                } catch (e) {
                    console.log('Location not available');
                }
            }

            const res = await fetch(`/api/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loanId,
                    installmentId,
                    amount: parseFloat(paymentAmount),
                    collectorId: collector.id,
                    location
                })
            });

            if (res.ok) {
                showToast?.('Pago registrado correctamente', 'success');
                setPaymentAmount('');
                setSelectedClient(null);
                loadData();
            } else {
                const err = await res.json();
                showToast?.(err.error || 'Error registrando pago', 'error');
            }
        } catch (error) {
            console.error('Payment error:', error);
            showToast?.('Error registrando pago', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                            {collector?.photoUrl ? (
                                <img src={collector.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <Users className="w-6 h-6 text-indigo-600" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{collector?.name}</h1>
                            <p className="text-sm text-slate-500">Cobrador</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onChangePassword}
                            className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Cambiar contraseña"
                        >
                            <Key size={20} />
                        </button>
                        <button
                            onClick={onLogout}
                            className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                            title="Cerrar sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="text-center p-4">
                    <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalClients}</p>
                    <p className="text-xs text-slate-500">Clientes</p>
                </Card>
                <Card className="text-center p-4">
                    <Clock className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pendingLoans}</p>
                    <p className="text-xs text-slate-500">Pendientes</p>
                </Card>
                <Card className="text-center p-4">
                    <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalPending)}</p>
                    <p className="text-xs text-slate-500">Por Cobrar</p>
                </Card>
            </div>

            {/* Pending Today */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                📋 Cobros Pendientes ({pendingToday.length})
            </h2>

            {pendingToday.length === 0 ? (
                <Card className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">¡No hay cobros pendientes!</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {pendingToday.map(loan => {
                        const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
                        const pendingInstallment = schedule.find(s => s.status === 'PENDING');

                        return (
                            <Card key={loan.id} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{loan.clientName}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <Phone size={12} /> {loan.clientPhone}
                                        </p>
                                    </div>
                                    <Badge variant="warning">Cuota #{pendingInstallment?.number}</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-bold text-indigo-600">
                                            {formatCurrency(pendingInstallment?.payment || 0)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Vence: {formatDate(pendingInstallment?.date)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setSelectedClient({ loan, installment: pendingInstallment })}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                                    >
                                        Cobrar
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Payment Modal */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold mb-4">Registrar Cobro</h3>

                        <div className="mb-4">
                            <p className="text-sm text-slate-500">Cliente</p>
                            <p className="font-medium">{selectedClient.loan.clientName}</p>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-slate-500">Cuota #{selectedClient.installment?.number}</p>
                            <p className="text-2xl font-bold text-indigo-600">
                                {formatCurrency(selectedClient.installment?.payment || 0)}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Monto a cobrar</label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder={selectedClient.installment?.payment?.toString()}
                                className="w-full p-3 border rounded-lg text-lg"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedClient(null);
                                    setPaymentAmount('');
                                }}
                                className="flex-1 py-2 border rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handlePayment(
                                    selectedClient.loan.id,
                                    selectedClient.installment?.id
                                )}
                                disabled={processing || !paymentAmount}
                                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {processing ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
