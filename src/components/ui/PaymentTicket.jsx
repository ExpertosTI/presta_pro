import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export function PaymentTicket({ receipt, companyName = 'Renace.tech' }) {
  if (!receipt) return null;

  return (
    <div className="hidden print:block fixed inset-0 bg-white z-[100] p-4 font-mono text-black text-xs leading-tight">
      <div className="max-w-[80mm] mx-auto text-center">
        <h1 className="text-xl font-bold mb-1">{companyName}</h1>
        <p className="mb-2">RNC: 101-00000-1</p>
        <p className="mb-4 border-b border-black pb-2">RECIBO DE INGRESO</p>

        <div className="text-left mb-2">
          <p><strong>Recibo #:</strong> {receipt.id.substr(0, 8).toUpperCase()}</p>
          <p><strong>Fecha:</strong> {formatDateTime(receipt.date)}</p>
          <p><strong>Cliente:</strong> {receipt.clientName}</p>
          <p><strong>Préstamo ID:</strong> {receipt.loanId.substr(0, 6).toUpperCase()}</p>
        </div>

        <div className="border-y border-black py-2 my-2 text-left">
          <div className="flex justify-between font-bold text-sm">
            <span>MONTO PAGADO:</span>
            <span>{formatCurrency(receipt.amount)}</span>
          </div>
        </div>

        <div className="text-left mb-4">
          <p><strong>Cuota #:</strong> {receipt.installmentNumber}</p>
          <p><strong>Concepto:</strong> Pago de Cuota</p>
          <p><strong>Cobrador:</strong> Admin</p>
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
