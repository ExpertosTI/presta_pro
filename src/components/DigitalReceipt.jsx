import React from 'react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Share2, Printer, CheckCircle, X, Download } from 'lucide-react';

const DigitalReceipt = ({ receipt, companyName, onClose, onPrint }) => {
    if (!receipt) return null;

    const baseAmount = typeof receipt.amount === 'number' ? receipt.amount : parseFloat(receipt.amount || 0) || 0;
    const penaltyAmount = typeof receipt.penaltyAmount === 'number' ? receipt.penaltyAmount : parseFloat(receipt.penaltyAmount || 0) || 0;
    const total = baseAmount + penaltyAmount;

    const handleShare = () => {
        const text = `*COMPROBANTE DE PAGO* 🧾\n${companyName}\n\n✅ *Monto:* ${formatCurrency(total)}\n📅 *Fecha:* ${formatDateTime(receipt.date)}\n🔢 *Recibo:* ${receipt.id.slice(0, 8).toUpperCase()}\n👤 *Cliente:* ${receipt.clientName}\n\nGracias por su pago.`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between">
                    <span className="font-bold text-lg">Comprobante</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 animate-scale-in">
                            <CheckCircle size={48} className="text-white" strokeWidth={3} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">
                            ¡Transacción completada!
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {formatDateTime(receipt.date)}
                        </p>
                        <div className="mt-2 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-600 dark:text-slate-400">
                            {receipt.id.slice(0, 12)}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Monto Total</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {formatCurrency(total)}
                        </p>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 uppercase tracking-wide">
                            PAGO DE PRÉSTAMO
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{receipt.clientName}</p>
                                {receipt.clientPhone && <p className="text-xs text-slate-400">{receipt.clientPhone}</p>}
                            </div>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Detalle</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                    Cuota #{receipt.installmentNumber}
                                </p>
                                {penaltyAmount > 0 && (
                                    <p className="text-xs text-amber-600 font-semibold">Incluye mora: {formatCurrency(penaltyAmount)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={handleShare}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <Share2 size={18} /> Compartir
                    </button>

                    <button
                        onClick={onPrint}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Imprimir Ticket"
                    >
                        <Printer size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DigitalReceipt;
