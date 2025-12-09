import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export function PaymentTicket({ receipt, companyName = 'Renace.tech', systemSettings = {} }) {
  if (!receipt) return null;

  const displayCompanyName = systemSettings.companyName || companyName;
  const hasPenalty = receipt.penalty && receipt.penalty > 0;
  const hasMultipleInstallments = receipt.paidInstallments && receipt.paidInstallments.length > 1;

  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[100] p-4 font-mono text-black text-xs leading-tight">
      <div className="max-w-[80mm] mx-auto text-center">
        <h1 className="text-xl font-bold mb-1">{displayCompanyName}</h1>
        <p className="mb-2">RNC: 101-00000-1</p>
        <p className="mb-4 border-b border-black pb-2">RECIBO DE INGRESO</p>

        <div className="text-left mb-2">
          <p><strong>Recibo #:</strong> {receipt.id.substr(0, 8).toUpperCase()}</p>
          <p><strong>Fecha:</strong> {formatDateTime(receipt.date)}</p>
          <p><strong>Cliente:</strong> {receipt.clientName}</p>
          <p><strong>Préstamo ID:</strong> {receipt.loanId.substr(0, 6).toUpperCase()}</p>
        </div>

        {/* Desglose de cuotas pagadas */}
        <div className="border-y border-black py-2 my-2 text-left">
          {hasMultipleInstallments ? (
            <>
              <p className="font-bold mb-1">CUOTAS ABONADAS:</p>
              {receipt.paidInstallments.map((inst, idx) => (
                <div key={idx} className="flex justify-between text-[10px]">
                  <span>Cuota #{inst.number}:</span>
                  <span>{formatCurrency(inst.amount)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-400 mt-1 pt-1"></div>
            </>
          ) : (
            <p><strong>Cuota #:</strong> {receipt.installmentNumber}</p>
          )}

          <div className="flex justify-between mt-1">
            <span>Capital + Interés:</span>
            <span>{formatCurrency(receipt.amount)}</span>
          </div>

          {hasPenalty && (
            <div className="flex justify-between text-red-600">
              <span>Mora ({receipt.penaltyRate || 0}%):</span>
              <span>{formatCurrency(receipt.penalty)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-1">
            <span>TOTAL PAGADO:</span>
            <span>{formatCurrency(receipt.total || (receipt.amount + (receipt.penalty || 0)))}</span>
          </div>
        </div>

        <div className="text-left mb-4">
          <p><strong>Concepto:</strong> {hasPenalty ? 'Pago de Cuota + Mora' : 'Pago de Cuota'}</p>
          <p><strong>Cobrador:</strong> {receipt.collectorName || 'Admin'}</p>
          {receipt.remainingBalance !== undefined && (
            <p><strong>Saldo Pendiente:</strong> {formatCurrency(receipt.remainingBalance)}</p>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px]">¡Gracias por su pago puntual!</p>
          <p className="text-[10px]">Conserve este recibo como constancia.</p>
          <p className="mt-4">__________________________</p>
          <p>Firma Autorizada</p>
        </div>
      </div>
    </div>
  );
}

export default PaymentTicket;

