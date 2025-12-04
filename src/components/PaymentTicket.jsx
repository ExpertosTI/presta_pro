import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import logoSmall from '../../logo-small.svg';

// --- TICKET DE PAGO (ESTILO MODERNO / IMPRESIÓN TÉRMICA) ---
const PaymentTicket = ({ receipt, companyName = "Presta Pro" }) => {
    if (!receipt) return null;
    const baseAmount = typeof receipt.amount === 'number' ? receipt.amount : parseFloat(receipt.amount || 0) || 0;
    const penaltyAmount = typeof receipt.penaltyAmount === 'number' ? receipt.penaltyAmount : parseFloat(receipt.penaltyAmount || 0) || 0;
    const totalCollected = baseAmount + penaltyAmount;
    return (
        <div className="hidden print:block fixed inset-0 bg-white z-[100] p-2 font-sans text-slate-900 text-[11px] leading-tight">
            <div className="max-w-[72mm] mx-auto border border-slate-300 rounded-lg p-2">
                {/* Encabezado compacto con logo */}
                <div className="text-center mb-1">
                    <div className="flex justify-center mb-1">
                        <img src={logoSmall} alt={companyName} className="h-8 object-contain" />
                    </div>
                    <p className="text-sm font-extrabold tracking-tight">{companyName}</p>
                    <p className="text-[10px] text-slate-600 font-semibold">RECIBO DE PAGO</p>
                </div>

                {/* Datos básicos */}
                <div className="flex justify-between text-[10px] mb-1">
                    <span>
                        No: <span className="font-mono font-bold">{String(receipt.id).substr(0, 8).toUpperCase()}</span>
                    </span>
                    <span>{formatDateTime(receipt.date)}</span>
                </div>

                {/* Monto principal */}
                <div className="text-center border-y border-slate-200 py-1 mb-1">
                    <p className="text-[9px] text-slate-600 font-semibold">MONTO PAGADO</p>
                    <p className="text-xl font-extrabold tracking-tight">{formatCurrency(totalCollected)}</p>
                </div>

                {/* Cliente */}
                <div className="text-[10px] mb-1">
                    <p className="font-semibold">
                        Cliente: <span className="font-normal">{receipt.clientName}</span>
                    </p>
                </div>

                {/* Préstamo */}
                <div className="text-[10px] mb-1">
                    <p>
                        Préstamo: <span className="font-mono font-semibold">{String(receipt.loanId).substr(0, 6).toUpperCase()}</span>
                    </p>
                    {typeof receipt.remainingBalance === 'number' && (
                        <p>
                            Balance pendiente: <span className="font-semibold">{formatCurrency(receipt.remainingBalance)}</span>
                        </p>
                    )}
                </div>

                {/* Cuota */}
                <div className="text-[10px] mb-1">
                    <p>
                        Cuota #{receipt.installmentNumber}
                        {receipt.installmentDate && ` • ${formatDate(receipt.installmentDate)}`}
                    </p>
                    <p>Monto cuota: {formatCurrency(baseAmount)}</p>
                    {penaltyAmount > 0 && <p>Mora: {formatCurrency(penaltyAmount)}</p>}
                    <p>Total cobrado: {formatCurrency(totalCollected)}</p>
                </div>

                <p className="text-[9px] text-center mt-1 text-slate-500">Gracias por su pago.</p>
            </div>
        </div>
    );
};

export default PaymentTicket;
