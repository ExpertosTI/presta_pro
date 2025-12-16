import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, DollarSign, Clock, Phone, LogOut, Key,
    CheckCircle, MapPin, AlertTriangle, Share2, Printer, Navigation
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
    const [activeTab, setActiveTab] = useState('cobros');
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', description: '' });
    const [todayPayments, setTodayPayments] = useState([]);

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

                // Add to today's payments for history
                setTodayPayments(prev => [...prev, {
                    clientName: paymentToConfirm.clientName,
                    clientPhone: paymentToConfirm.clientPhone,
                    number: paymentToConfirm.number,
                    amount: options.customAmount || paymentToConfirm.amount,
                    date: new Date()
                }]);

                setLastReceipt({
                    ...data.receipt,
                    clientName: paymentToConfirm.clientName,
                    clientPhone: paymentToConfirm.clientPhone,
                    amount: options.customAmount || paymentToConfirm.amount,
                    number: paymentToConfirm.number
                });
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

    // Handle expense submit
    const handleExpenseSubmit = async () => {
        try {
            const token = localStorage.getItem('collectorToken');
            const location = await getLocation();

            const res = await fetch('/api/collectors/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    collectorId: collector.id,
                    category: expenseForm.category,
                    amount: parseFloat(expenseForm.amount),
                    description: expenseForm.description,
                    location
                })
            });

            if (res.ok) {
                showToast?.('✅ Gasto registrado', 'success');
                setShowExpenseForm(false);
                setExpenseForm({ category: '', amount: '', description: '' });
            } else {
                const data = await res.json();
                showToast?.(data.error || 'Error registrando gasto', 'error');
            }
        } catch (error) {
            console.error('Expense error:', error);
            showToast?.('Error registrando gasto', 'error');
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
                <div className="flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl p-4 min-w-[100px] text-center shadow">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{todayPayments.length}</p>
                    <p className="text-[10px] text-slate-500">Cobrados</p>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'cobros' ? (
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
                                            {/* Call */}
                                            <a
                                                href={`tel:${item.clientPhone}`}
                                                className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full"
                                            >
                                                <Phone size={18} />
                                            </a>

                                            {/* GPS Navigation */}
                                            {item.clientAddress && (
                                                <button
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.clientAddress)}`)}
                                                    className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full"
                                                >
                                                    <Navigation size={18} />
                                                </button>
                                            )}

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
                                                    clientPhone: item.clientPhone,
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
            ) : activeTab === 'historial' ? (
                <div className="px-4">
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        ✅ Cobros de Hoy
                        <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-0.5 rounded-full">
                            {todayPayments.length}
                        </span>
                    </h2>

                    {todayPayments.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-600 dark:text-slate-400">No hay cobros registrados hoy</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {todayPayments.map((payment, idx) => (
                                <Card key={idx} className="p-4 border-l-4 border-emerald-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{payment.clientName}</p>
                                            <p className="text-xs text-slate-500">Cuota #{payment.number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                                            <p className="text-[10px] text-slate-500">{formatDate(payment.date)}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-emerald-700 dark:text-emerald-400">Total Cobrado</p>
                                    <p className="text-xl font-bold text-emerald-600">
                                        {formatCurrency(todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                                    </p>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Payment Confirmation Modal */}
            {paymentToConfirm && (
                <PaymentConfirmationModal
                    paymentToConfirm={paymentToConfirm}
                    onConfirm={handlePaymentConfirm}
                    onCancel={() => setPaymentToConfirm(null)}
                />
            )}

            {/* Receipt Success Modal */}
            {lastReceipt && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-green-500 px-6 py-4 text-white text-center">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                            <h3 className="text-lg font-bold">¡Pago Registrado!</h3>
                        </div>

                        <div className="p-6 text-center">
                            <p className="text-3xl font-bold text-green-600 mb-2">
                                {formatCurrency(lastReceipt.amount)}
                            </p>
                            <p className="text-sm text-slate-500 mb-4">
                                {lastReceipt.clientName} - Cuota #{lastReceipt.number}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const msg = `🧾 *Recibo de Pago*\nCliente: ${lastReceipt.clientName}\nMonto: ${formatCurrency(lastReceipt.amount)}\nFecha: ${formatDate(new Date())}\n\n_PrestaPro by RENACE.TECH_`;
                                        window.open(`https://wa.me/${lastReceipt.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
                                    }}
                                    className="flex-1 py-3 bg-green-100 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <Share2 size={18} /> WhatsApp
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 py-3 bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> Imprimir
                                </button>
                            </div>

                            <button
                                onClick={() => setLastReceipt(null)}
                                className="w-full mt-4 py-3 text-slate-500 font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Form Modal */}
            {showExpenseForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            📝 Registrar Gasto
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Categoría</label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-700"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="FUEL">⛽ Gasolina</option>
                                    <option value="FOOD">🍔 Comida</option>
                                    <option value="TRANSPORT">🚌 Transporte</option>
                                    <option value="PHONE">📱 Teléfono</option>
                                    <option value="OTHER">📦 Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Monto</label>
                                <input
                                    type="number"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-700 text-lg font-bold"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-700"
                                    placeholder="Opcional..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowExpenseForm(false)}
                                className="flex-1 py-3 border rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExpenseSubmit}
                                disabled={!expenseForm.category || !expenseForm.amount}
                                className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex justify-around z-40">
                <button
                    onClick={() => setActiveTab('cobros')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'cobros' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <DollarSign size={20} />
                    <span className="text-[10px] font-medium">Cobros</span>
                </button>
                <button
                    onClick={() => setShowExpenseForm(true)}
                    className="flex flex-col items-center gap-1 text-slate-400"
                >
                    <AlertTriangle size={20} />
                    <span className="text-[10px] font-medium">Gastos</span>
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`flex flex-col items-center gap-1 ${activeTab === 'historial' ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                    <Clock size={20} />
                    <span className="text-[10px] font-medium">Historial</span>
                </button>
            </div>
        </div>
    );
}

