import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, DollarSign, Clock, Phone, LogOut, Key,
    CheckCircle, MapPin, AlertTriangle, Share2, Printer
} from 'lucide-react';
import Card from '../../../shared/components/ui/Card';
import Badge from '../../../shared/components/ui/Badge';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { PaymentConfirmationModal } from '../../payments';

/**
 * CollectorDashboard - Mobile-first view for collectors
 * 100% optimized for phones (375px+)
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
    const [paymentToConfirm, setPaymentToConfirm] = useState(null);
    const [lastReceipt, setLastReceipt] = useState(null);

    // Load collector's assigned clients and their loans
    useEffect(() => {
        loadData();
    }, [collector?.id]);

    const loadData = async () => {
        if (!collector?.id) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('collectorToken');

            const clientsRes = await fetch(`/api/collectors/${collector.id}/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (clientsRes.ok) {
                const clientsData = await clientsRes.json();
                setClients(clientsData);

                // Extract loans from clients with installments
                const allLoans = clientsData.flatMap(c =>
                    (c.loans || []).map(l => ({
                        ...l,
                        clientName: c.name,
                        clientPhone: c.phone,
                        clientAddress: c.address
                    }))
                );
                setLoans(allLoans);
            } else {
                const err = await clientsRes.json();
                showToast?.(err.error || 'Error cargando datos', 'error');
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
        return loans.flatMap(loan => {
            const installments = Array.isArray(loan.installments) ? loan.installments : [];
            return installments
                .filter(s => s.status === 'PENDING' && s.date?.split('T')[0] <= today)
                .map(installment => ({
                    ...installment,
                    loanId: loan.id,
                    clientName: loan.clientName,
                    clientPhone: loan.clientPhone,
                    clientAddress: loan.clientAddress,
                    isOverdue: s.date?.split('T')[0] < today
                }));
        });
    }, [loans]);

    // Stats
    const stats = useMemo(() => {
        const totalPending = pendingToday.reduce((sum, p) => sum + (p.payment || 0), 0);
        return {
            totalClients: clients.length,
            pendingCount: pendingToday.length,
            totalPending
        };
    }, [clients, pendingToday]);

    // Get current location
    const getLocation = async () => {
        if (!navigator.geolocation) return null;
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    enableHighAccuracy: true
                });
            });
            return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch (e) {
            console.log('Location not available');
            return null;
        }
    };

    // Handle payment confirmation
    const handlePaymentConfirm = async (loanId, installmentId, options) => {
        try {
            const token = localStorage.getItem('collectorToken');
            const location = await getLocation();

            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    loanId,
                    installmentId,
                    amount: options.customAmount,
                    penaltyAmount: options.penaltyAmount || 0,
                    collectorId: collector.id,
                    location
                })
            });

            const data = await res.json();

            if (res.ok) {
                showToast?.('✅ Pago registrado correctamente', 'success');
                setLastReceipt(data.receipt);
                setPaymentToConfirm(null);
                loadData();
            } else {
                showToast?.(data.error || 'Error registrando pago', 'error');
            }
        } catch (error) {
            console.error('Payment error:', error);
            showToast?.('Error registrando pago', 'error');
        }
    };

    // Share receipt via WhatsApp
    const shareReceipt = (item) => {
        const msg = `🧾 *Recibo de Pago*
Cliente: ${item.clientName}
Cuota: #${item.number}
Monto: ${formatCurrency(item.payment)}
Fecha: ${formatDate(new Date())}
        
_PrestaPro by RENACE.TECH_`;
        window.open(`https://wa.me/${item.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
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
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-20">
            {/* Fixed Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            {collector?.photoUrl ? (
                                <img src={collector.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <Users className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-base font-bold">{collector?.name}</h1>
                            <p className="text-xs text-white/70">Cobrador</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={onChangePassword} className="p-2 hover:bg-white/10 rounded-full" title="Cambiar contraseña">
                            <Key size={18} />
                        </button>
                        <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full" title="Salir">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Row - Horizontal scroll on mobile */}
            <div className="flex gap-3 px-4 py-4 overflow-x-auto">
                <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl p-4 min-w-[100px] text-center shadow">
                    <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalClients}</p>
                    <p className="text-[10px] text-slate-500">Clientes</p>
                </div>
                <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl p-4 min-w-[100px] text-center shadow">
                    <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.pendingCount}</p>
                    <p className="text-[10px] text-slate-500">Pendientes</p>
                </div>
                <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl p-4 min-w-[120px] text-center shadow">
                    <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalPending)}</p>
                    <p className="text-[10px] text-slate-500">Por Cobrar</p>
                </div>
            </div>

            {/* Pending Collections */}
            <div className="px-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    📋 Cobros Pendientes
                    <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                        {pendingToday.length}
                    </span>
                </h2>

                {pendingToday.length === 0 ? (
                    <Card className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-slate-600 dark:text-slate-400">¡No hay cobros pendientes!</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {pendingToday.map((item, idx) => (
                            <div
                                key={`${item.loanId}-${item.id}`}
                                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-indigo-500"
                            >
                                {/* Client Info */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">
                                            {item.clientName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <Phone size={12} />
                                            <a href={`tel:${item.clientPhone}`} className="text-blue-600">
                                                {item.clientPhone}
                                            </a>
                                        </div>
                                        {item.clientAddress && (
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <MapPin size={12} />
                                                <span className="truncate">{item.clientAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={item.isOverdue ? 'danger' : 'warning'}>
                                            Cuota #{item.number}
                                        </Badge>
                                        {item.isOverdue && (
                                            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1 justify-end">
                                                <AlertTriangle size={10} /> Vencida
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Amount and Actions */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {formatCurrency(item.payment)}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            Vence: {formatDate(item.date)}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        {/* WhatsApp */}
                                        <button
                                            onClick={() => shareReceipt(item)}
                                            className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-600 rounded-full"
                                        >
                                            <Share2 size={18} />
                                        </button>

                                        {/* Cobrar Button */}
                                        <button
                                            onClick={() => setPaymentToConfirm({
                                                loanId: item.loanId,
                                                installmentId: item.id,
                                                clientName: item.clientName,
                                                number: item.number,
                                                date: item.date,
                                                amount: item.payment
                                            })}
                                            className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow active:scale-95 transition-transform"
                                        >
                                            Cobrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Confirmation Modal */}
            {paymentToConfirm && (
                <PaymentConfirmationModal
                    paymentToConfirm={paymentToConfirm}
                    onConfirm={handlePaymentConfirm}
                    onCancel={() => setPaymentToConfirm(null)}
                />
            )}
        </div>
    );
}
