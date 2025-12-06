import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import logoSmall from '../../logo-small.svg';

// --- TICKET DE PAGO (ESTILO MODERNO / IMPRESIÓN TÉRMICA) ---
const PaymentTicket = ({ receipt, companyName = "Presta Pro" }) => {
    if (!receipt) return null;

    const baseAmount = typeof receipt.amount === 'number' ? receipt.amount : parseFloat(receipt.amount || 0) || 0;
    const penaltyAmount = typeof receipt.penaltyAmount === 'number' ? receipt.penaltyAmount : parseFloat(receipt.penaltyAmount || 0) || 0;
    const totalCollected = baseAmount + penaltyAmount;

    const loanAmount = typeof receipt.loanAmount === 'number' ? receipt.loanAmount : parseFloat(receipt.loanAmount || 0) || 0;
    const totalPaidAfter = typeof receipt.totalPaidAfter === 'number'
        ? receipt.totalPaidAfter
        : parseFloat(receipt.totalPaidAfter || 0) || totalCollected;
    const remainingBalance = typeof receipt.remainingBalance === 'number'
        ? receipt.remainingBalance
        : parseFloat(receipt.remainingBalance || 0) || 0;

    const isLoanSettled = remainingBalance <= 0.01 && loanAmount > 0;

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
                <div className="text-[10px] mb-1 space-y-0.5">
                    <div className="flex justify-between">
                        <span>
                            Recibo: <span className="font-mono font-bold">{String(receipt.id).substr(0, 8).toUpperCase()}</span>
                        </span>
                        <span>{formatDateTime(receipt.date)}</span>
                    </div>
                    {receipt.clientPhone && (
                        <p>Tel: <span className="font-mono">{receipt.clientPhone}</span></p>
                    )}
                </div>

                {/* Cliente */}
                <div className="text-[10px] mb-1">
                    <p className="font-semibold">
                        Cliente: <span className="font-normal">{receipt.clientName}</span>
                    </p>
                    {receipt.clientAddress && (
                        <p className="text-[9px] text-slate-600">Dir.: {receipt.clientAddress}</p>
                    )}
                </div>

                {/* Resumen de montos */}
                <div className="text-[10px] border-y border-slate-200 py-1 mb-1 space-y-0.5">
                    <p>Abono a cuotas: <span className="font-semibold">{formatCurrency(baseAmount)}</span></p>
                    {penaltyAmount > 0 && (
                        <p>Mora cobrada: <span className="font-semibold">{formatCurrency(penaltyAmount)}</span></p>
                    )}
                    <p>Total pagado a la fecha: <span className="font-semibold">{formatCurrency(totalPaidAfter)}</span></p>
                    <p>Total restante: <span className="font-semibold">{formatCurrency(remainingBalance)}</span></p>
                </div>

                {/* Detalle de cuota y préstamo */}
                <div className="text-[10px] mb-1 space-y-0.5">
                    <p className="font-semibold uppercase tracking-wide text-center">DETALLE</p>
                    <p>
                        Préstamo: <span className="font-mono font-semibold">{String(receipt.loanId).substr(0, 6).toUpperCase()}</span>
                    </p>
                    <p>
                        Cuota #{receipt.installmentNumber}
                        {receipt.installmentDate && ` • ${formatDate(receipt.installmentDate)}`}
                    </p>
                    <p>Monto cuota: {formatCurrency(baseAmount)}</p>
                    {penaltyAmount > 0 && <p>Mora aplicada: {formatCurrency(penaltyAmount)}</p>}
                    {loanAmount > 0 && (
                        <p>Monto préstamo: {formatCurrency(loanAmount)}</p>
                    )}
                    <p>Saldo del préstamo: {formatCurrency(remainingBalance)}</p>
                    {isLoanSettled && (
                        <p className="mt-1 font-bold text-center tracking-wide">PRESTAMO SALDADO</p>
                    )}
                </div>

                <p className="text-[8px] text-center mt-1 text-slate-500">No somos responsables de dinero entregado sin recibo.</p>
            </div>
        </div>
    );
};

export default PaymentTicket;
