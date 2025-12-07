import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';

const ClientStatement = ({ client, loans, receipts, onClose }) => {
    if (!client) return null;

    const clientLoans = loans.filter(l => l.clientId === client.id);
    const clientReceipts = receipts.filter(r => r.clientId === client.id);

    const totalLent = clientLoans.reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const totalPaid = clientReceipts.reduce((acc, r) => {
        const base = parseFloat(r.amount || 0);
        const penalty = parseFloat(r.penaltyAmount || 0);
        return acc + base + penalty;
    }, 0);
    const totalPending = clientLoans.reduce((acc, l) => {
        const loanAmount = parseFloat(l.amount || 0);
        const loanPaid = parseFloat(l.totalPaid || 0);
        return acc + Math.max(loanAmount - loanPaid, 0);
    }, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* Modal Overlay */}
            <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm print:hidden">
                <div className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            Estado de Cuenta - {client.name}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                            >
                                🖨️ Imprimir
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                ✕ Cerrar
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Client Info */}
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">Información del Cliente</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="font-semibold text-slate-600 dark:text-slate-400">Nombre:</span> <span className="text-slate-800 dark:text-slate-200">{client.name}</span></div>
                                {client.phone && <div><span className="font-semibold text-slate-600 dark:text-slate-400">Teléfono:</span> <span className="text-slate-800 dark:text-slate-200">{client.phone}</span></div>}
                                {client.address && <div className="col-span-2"><span className="font-semibold text-slate-600 dark:text-slate-400">Dirección:</span> <span className="text-slate-800 dark:text-slate-200">{client.address}</span></div>}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Total Prestado</p>
                                <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(totalLent)}</p>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Total Pagado</p>
                                <p className="text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Saldo Pendiente</p>
                                <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{formatCurrency(totalPending)}</p>
                            </div>
                        </div>

                        {/* Loans */}
                        <div className="mb-6">
                            <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Préstamos</h3>
                            {clientLoans.length === 0 ? (
                                <p className="text-slate-500 text-sm">No hay préstamos registrados</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th className="p-2 text-left text-slate-700 dark:text-slate-300">Fecha</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Monto</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Tasa</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Pagado</th>
                                                <th className="p-2 text-center text-slate-700 dark:text-slate-300">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {clientLoans.map(loan => (
                                                <tr key={loan.id}>
                                                    <td className="p-2 text-slate-800 dark:text-slate-200">{formatDate(loan.startDate)}</td>
                                                    <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(loan.amount)}</td>
                                                    <td className="p-2 text-right text-slate-600 dark:text-slate-400">{loan.rate}%</td>
                                                    <td className="p-2 text-right text-green-600 dark:text-green-400">{formatCurrency(loan.totalPaid || 0)}</td>
                                                    <td className="p-2 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${loan.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                            {loan.status === 'PAID' ? 'Pagado' : 'Activo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Payment History */}
                        <div>
                            <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-100">Historial de Pagos</h3>
                            {clientReceipts.length === 0 ? (
                                <p className="text-slate-500 text-sm">No hay pagos registrados</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-700">
                                            <tr>
                                                <th className="p-2 text-left text-slate-700 dark:text-slate-300">Fecha</th>
                                                <th className="p-2 text-left text-slate-700 dark:text-slate-300">Recibo</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Cuota</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Mora</th>
                                                <th className="p-2 text-right text-slate-700 dark:text-slate-300">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {clientReceipts.map(receipt => {
                                                const base = parseFloat(receipt.amount || 0);
                                                const penalty = parseFloat(receipt.penaltyAmount || 0);
                                                const total = base + penalty;
                                                return (
                                                    <tr key={receipt.id}>
                                                        <td className="p-2 text-slate-800 dark:text-slate-200">{formatDate(receipt.date)}</td>
                                                        <td className="p-2 text-slate-600 dark:text-slate-400 font-mono text-xs">{String(receipt.id).substr(0, 8).toUpperCase()}</td>
                                                        <td className="p-2 text-right text-slate-800 dark:text-slate-200">{formatCurrency(base)}</td>
                                                        <td className="p-2 text-right text-amber-600 dark:text-amber-400">{penalty > 0 ? formatCurrency(penalty) : '-'}</td>
                                                        <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(total)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Version */}
            <div className="hidden print:block p-8 bg-white text-black">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold mb-2">Estado de Cuenta</h1>
                    <p className="text-sm text-gray-600">Fecha de emisión: {formatDate(new Date())}</p>
                </div>

                <div className="mb-6 border-b pb-4">
                    <h2 className="font-bold text-lg mb-2">Información del Cliente</h2>
                    <p><strong>Nombre:</strong> {client.name}</p>
                    {client.phone && <p><strong>Teléfono:</strong> {client.phone}</p>}
                    {client.address && <p><strong>Dirección:</strong> {client.address}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="border p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Total Prestado</p>
                        <p className="text-lg font-bold">{formatCurrency(totalLent)}</p>
                    </div>
                    <div className="border p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Total Pagado</p>
                        <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className="border p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Saldo Pendiente</p>
                        <p className="text-lg font-bold">{formatCurrency(totalPending)}</p>
                    </div>
                </div>

                {clientLoans.length > 0 && (
                    <div className="mb-6">
                        <h2 className="font-bold text-lg mb-2">Préstamos</h2>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-right">Tasa</th>
                                    <th className="p-2 text-right">Pagado</th>
                                    <th className="p-2 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientLoans.map(loan => (
                                    <tr key={loan.id} className="border-b">
                                        <td className="p-2">{formatDate(loan.startDate)}</td>
                                        <td className="p-2 text-right font-semibold">{formatCurrency(loan.amount)}</td>
                                        <td className="p-2 text-right">{loan.rate}%</td>
                                        <td className="p-2 text-right">{formatCurrency(loan.totalPaid || 0)}</td>
                                        <td className="p-2 text-center">{loan.status === 'PAID' ? 'Pagado' : 'Activo'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {clientReceipts.length > 0 && (
                    <div>
                        <h2 className="font-bold text-lg mb-2">Historial de Pagos</h2>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Recibo</th>
                                    <th className="p-2 text-right">Cuota</th>
                                    <th className="p-2 text-right">Mora</th>
                                    <th className="p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientReceipts.map(receipt => {
                                    const base = parseFloat(receipt.amount || 0);
                                    const penalty = parseFloat(receipt.penaltyAmount || 0);
                                    const total = base + penalty;
                                    return (
                                        <tr key={receipt.id} className="border-b">
                                            <td className="p-2">{formatDate(receipt.date)}</td>
                                            <td className="p-2 font-mono text-xs">{String(receipt.id).substr(0, 8).toUpperCase()}</td>
                                            <td className="p-2 text-right">{formatCurrency(base)}</td>
                                            <td className="p-2 text-right">{penalty > 0 ? formatCurrency(penalty) : '-'}</td>
                                            <td className="p-2 text-right font-semibold">{formatCurrency(total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default ClientStatement;
