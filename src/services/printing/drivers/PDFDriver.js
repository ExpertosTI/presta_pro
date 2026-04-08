import jsPDF from 'jspdf';
import { formatCurrency, formatReceiptDate } from '../../../shared/utils/formatters';

export function generateReceiptPDF(receipt, companySettings = {}) {
  if (!receipt) return;

  const { companyName = 'Presta Pro' } = companySettings;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || 0);
  const totalAmount = baseAmount + penaltyAmount;

  let y = 8;
  const left = 5;
  const right = 75;
  const center = 40;

  // Header
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(companyName, center, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.text('COMPROBANTE DE PAGO', center, y, { align: 'center' });
  y += 4;

  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text(`Ref: TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}`, center, y, { align: 'center' });
  y += 3.5;
  doc.text(formatReceiptDate(receipt.date || new Date()), center, y, { align: 'center' });
  y += 4;

  doc.line(left, y, right, y);
  y += 4;

  // Client
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('CLIENTE', left, y);
  y += 3.5;
  doc.setFont(undefined, 'normal');
  doc.text(receipt.clientName || 'Cliente', left, y);
  y += 3.5;
  if (receipt.clientPhone) {
    doc.text(receipt.clientPhone, left, y);
    y += 3.5;
  }

  doc.line(left, y, right, y);
  y += 4;

  // Loan info
  if (receipt.loanAmount) {
    doc.setFont(undefined, 'bold');
    doc.text('PRESTAMO', left, y);
    y += 3.5;
    doc.setFont(undefined, 'normal');
    doc.text('Capital:', left, y);
    doc.text(formatCurrency(receipt.loanAmount), right, y, { align: 'right' });
    y += 3.5;

    if (receipt.installmentNumber) {
      doc.text('Cuota(s):', left, y);
      doc.text(`#${receipt.installmentNumber}`, right, y, { align: 'right' });
      y += 3.5;
    }

    if (receipt.remainingBalance !== undefined) {
      doc.setFont(undefined, 'bold');
      doc.text('Saldo:', left, y);
      doc.text(formatCurrency(receipt.remainingBalance), right, y, { align: 'right' });
      doc.setFont(undefined, 'normal');
      y += 3.5;
    }

    doc.line(left, y, right, y);
    y += 4;
  }

  // Detail
  doc.setFont(undefined, 'bold');
  doc.text('DETALLE', left, y);
  y += 3.5;
  doc.setFont(undefined, 'normal');

  if (receipt.paymentBreakdown?.length > 0) {
    for (const item of receipt.paymentBreakdown) {
      doc.text(`Cuota #${item.number}`, left, y);
      doc.text(formatCurrency(item.amount), right, y, { align: 'right' });
      y += 3.5;
    }
  } else {
    const cuotaNum = receipt.installmentNumber || '1';
    doc.text(`Cuota #${cuotaNum}`, left, y);
    doc.text(formatCurrency(baseAmount), right, y, { align: 'right' });
    y += 3.5;
  }

  if (penaltyAmount > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text('Mora', left, y);
    doc.text(formatCurrency(penaltyAmount), right, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 3.5;
  }

  // Total
  y += 1;
  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);
  y += 5;

  doc.setFontSize(9);
  doc.text('TOTAL PAGADO', center, y, { align: 'center' });
  y += 5;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(formatCurrency(totalAmount), center, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.text('PAGO DE PRESTAMO', center, y, { align: 'center' });
  y += 3;

  doc.setLineWidth(0.5);
  doc.line(left, y, right, y);
  y += 5;

  // Footer
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('Gracias por su pago!', center, y, { align: 'center' });
  y += 3.5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text('Conserve este comprobante', center, y, { align: 'center' });

  doc.save(`recibo_${receipt.id || 'pago'}.pdf`);
}
