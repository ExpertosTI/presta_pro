import React from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import logoSmall from '../logo.png';

// --- TICKET DE PAGO (ESTILO MODERNO / IMPRESIÓN TÉRMICA) ---
const PaymentTicket = ({ receipt, companyName = "Presta Pro", companyLogo }) => {
    if (!receipt) return null;

    const baseAmount = typeof receipt?.amount === 'number' ? receipt.amount : parseFloat(receipt?.amount || 0) || 0;
    const penaltyAmount = typeof receipt?.penaltyAmount === 'number' ? receipt.penaltyAmount : parseFloat(receipt?.penaltyAmount || 0) || 0;
    const totalCollected = baseAmount + penaltyAmount;

    const loanAmount = typeof receipt.loanAmount === 'number' ? receipt.loanAmount : parseFloat(receipt.loanAmount || 0) || 0;
    const totalPaidAfter = typeof receipt.totalPaidAfter === 'number'
        ? receipt.totalPaidAfter
        : parseFloat(receipt.totalPaidAfter || 0) || totalCollected;
    const remainingBalance = typeof receipt.remainingBalance === 'number'
        ? receipt.remainingBalance
        : parseFloat(receipt.remainingBalance || 0) || 0;

    // Only show "PRÉSTAMO SALDADO" if remaining balance is truly zero/near-zero AND we have loan amount data
    // This prevents showing it on every single payment
    const isLoanSettled = remainingBalance <= 0.5 && loanAmount > 0 && totalPaidAfter >= loanAmount;

    return (

        <div className="hidden print:block fixed inset-0 bg-white z-[200] font-mono text-black leading-tight">
            <style>
                {`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
                `}
            </style>
            <div className="w-[72mm] mx-auto p-2" style={{ maxWidth: '72mm' }}>
                {/* Encabezado compacto con logo */}
                <div className="text-center mb-2">
                    {companyLogo && (
                        <div className="flex justify-center mb-1">
                            <img src={companyLogo} alt={companyName} className="h-10 object-contain grayscale" />
                        </div>
                    )}
                    <p className="text-sm font-bold uppercase">{companyName}</p>
                    <p className="text-[10px] font-semibold">RECIBO DE PAGO</p>
                </div>

                {/* Datos básicos */}
                <div className="text-[10px] mb-2 border-b border-black pb-1 border-dashed">
                    <div className="flex justify-between">
                        <span>Recibo:</span>
                        <span className="font-bold">{String(receipt.id).substr(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Fecha:</span>
                        <span>{formatDateTime(receipt.date)}</span>
                    </div>
                    {receipt.clientPhone && (
                        <div className="flex justify-between">
                            <span>Tel:</span>
                            <span>{receipt.clientPhone}</span>
                        </div>
                    )}
                </div>

                {/* Cliente */}
                <div className="text-[10px] mb-2 border-b border-black pb-1 border-dashed">
                    <p className="font-bold">CLIENTE:</p>
                    <p className="text-xs">{receipt.clientName}</p>
                    {receipt.clientAddress && (
                        <p className="text-[9px] mt-0.5">{receipt.clientAddress}</p>
                    )}
                </div>

                {/* Detalle de cuota y préstamo */}
                <div className="text-[10px] mb-2 border-b border-black pb-1 border-dashed tracking-tight">
                    <p className="font-bold mb-1">DETALLE DEL PAGO:</p>
                    <p>Préstamo: <span className="font-bold">{String(receipt.loanId).substr(0, 6).toUpperCase()}</span></p>
                    <p>Cuota #{receipt.installmentNumber} {receipt.installmentDate && `(${formatDate(receipt.installmentDate)})`}</p>

                    <div className="flex justify-between mt-1">
                        <span>Cuota Base:</span>
                        <span>{formatCurrency(baseAmount)}</span>
                    </div>
                    {penaltyAmount > 0 && (
                        <div className="flex justify-between">
                            <span>Mora:</span>
                            <span>{formatCurrency(penaltyAmount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-xs mt-1 pt-1 border-t border-black border-dotted">
                        <span>TOTAL PAGADO:</span>
                        <span>{formatCurrency(totalCollected)}</span>
                    </div>
                </div>

                {/* Saldos */}
                <div className="text-[10px] mb-4">
                    <div className="flex justify-between">
                        <span>Saldo anterior:</span>
                        <span>{formatCurrency((remainingBalance + totalCollected))}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Saldo actual:</span>
                        <span>{formatCurrency(remainingBalance)}</span>
                    </div>
                    {isLoanSettled && (
                        <p className="mt-2 font-black text-center text-sm border border-black p-1 uppercase">*** PRÉSTAMO SALDADO ***</p>
                    )}
                </div>

                <p className="text-[8px] text-center mt-2">
                    Gracias por su pago.<br />
                    Conserve este recibo como comprobante.
                </p>
                <div className="text-center mt-4 text-[8px]">.</div>
            </div>
        </div>
    );
};

export default PaymentTicket;
