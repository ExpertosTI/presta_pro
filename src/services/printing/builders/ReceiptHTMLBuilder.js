import { formatCurrency, formatReceiptDate } from '../../../shared/utils/formatters';

const PAPER_WIDTH = '80mm';
const CONTENT_WIDTH = '76mm';

export function generateReceiptHTML(receipt, companySettings = {}) {
  const { companyName = 'Presta Pro', companyLogo = null } = companySettings;

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || 0);
  const totalAmount = baseAmount + penaltyAmount;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago</title>
    <style>
        @page { size: ${PAPER_WIDTH} auto; margin: 2mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            width: ${CONTENT_WIDTH};
            max-width: ${CONTENT_WIDTH};
            color: #000;
            background: #fff;
            padding: 2mm;
        }
        .header { text-align: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
        .logo { max-width: 40mm; max-height: 15mm; margin-bottom: 4px; }
        .company-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .receipt-title { font-size: 12px; font-weight: bold; margin: 4px 0; }
        .receipt-id { font-size: 10px; color: #666; }
        .date { font-size: 10px; margin-top: 4px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .section { margin: 6px 0; }
        .section-title { font-weight: bold; font-size: 10px; margin-bottom: 2px; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .label { color: #333; }
        .value { font-weight: bold; text-align: right; }
        .total-section { text-align: center; padding: 8px 0; margin: 8px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; }
        .total-label { font-size: 11px; color: #333; }
        .total-amount { font-size: 18px; font-weight: bold; margin: 4px 0; }
        .payment-type { font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .penalty { color: #c00; }
        .footer { text-align: center; margin-top: 10px; padding-top: 6px; border-top: 1px dashed #000; font-size: 9px; }
        .footer-thanks { font-weight: bold; margin-bottom: 2px; }
        @media print { body { width: ${CONTENT_WIDTH} !important; max-width: ${CONTENT_WIDTH} !important; } }
    </style>
</head>
<body>
    <div class="header">
        ${companyLogo ? `<img src="${companyLogo}" class="logo" alt="${companyName}">` : ''}
        <div class="company-name">${companyName}</div>
        <div class="receipt-title">COMPROBANTE DE PAGO</div>
        <div class="receipt-id">Ref: TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}</div>
        <div class="date">${formatReceiptDate(receipt.date || new Date())}</div>
    </div>
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div>${receipt.clientName || 'Cliente'}</div>
        ${receipt.clientPhone ? `<div>${receipt.clientPhone}</div>` : ''}
    </div>
    ${receipt.loanAmount ? `
    <div class="section">
        <div class="section-title">PRESTAMO</div>
        <div class="row"><span class="label">Capital</span><span class="value">${formatCurrency(receipt.loanAmount)}</span></div>
        ${receipt.installmentNumber ? `<div class="row"><span class="label">Cuota(s) Pagada(s)</span><span class="value">#${receipt.installmentNumber}</span></div>` : ''}
        ${receipt.remainingBalance !== undefined ? `<div class="row" style="border-top: 1px solid #ccc; padding-top: 3px; margin-top: 3px;"><span class="label"><strong>Saldo Restante</strong></span><span class="value"><strong>${formatCurrency(receipt.remainingBalance)}</strong></span></div>` : ''}
    </div>` : ''}
    <div class="divider"></div>
    <div class="section">
        <div class="section-title">DETALLE</div>
        ${receipt.paymentBreakdown?.length > 0
    ? receipt.paymentBreakdown.map(item => `<div class="row"><span class="label">Cuota #${item.number}</span><span class="value">${formatCurrency(item.amount)}</span></div>`).join('')
    : `<div class="row"><span class="label">Cuota #${receipt.installmentNumber || '1'}</span><span class="value">${formatCurrency(baseAmount)}</span></div>`}
        ${penaltyAmount > 0 ? `<div class="row penalty"><span class="label">Mora</span><span class="value">${formatCurrency(penaltyAmount)}</span></div>` : ''}
        ${receipt.remainingBalance !== undefined && receipt.remainingBalance > 0 ? `<div class="row"><span class="label">Saldo Pendiente</span><span class="value">${formatCurrency(receipt.remainingBalance)}</span></div>` : ''}
    </div>
    <div class="total-section">
        <div class="total-label">TOTAL PAGADO</div>
        <div class="total-amount">${formatCurrency(totalAmount)}</div>
        <div class="payment-type">PAGO DE PRESTAMO</div>
    </div>
    <div class="footer">
        <div class="footer-thanks">Gracias por su pago!</div>
        <div>Conserve este comprobante</div>
    </div>
</body>
</html>`.trim();
}
