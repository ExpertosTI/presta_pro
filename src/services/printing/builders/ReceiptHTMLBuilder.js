import { formatCurrency, formatReceiptDate, escapeHtml } from '../../../shared/utils/formatters';

const PAPER_WIDTH = '80mm';
const CONTENT_WIDTH = '76mm';

export function generateReceiptHTML(receipt, companySettings = {}) {
  const {
    companyName = 'Presta Pro',
    companyLogo = null,
    companyRNC = '',
    companyAddress = '',
    companyWhatsApp = '',
    receiptFooter = ''
  } = companySettings;

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
        @page { size: ${PAPER_WIDTH} auto; margin: 4mm 5mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-weight: 900 !important; color: #000 !important; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 900 !important;
            line-height: 1.5;
            width: ${CONTENT_WIDTH};
            max-width: ${CONTENT_WIDTH};
            color: #000 !important;
            background: #fff;
            padding: 2mm 3mm;
        }
        .header { text-align: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px dashed #000; }
        .logo { max-width: 40mm; max-height: 15mm; margin-bottom: 4px; }
        .company-name { font-size: 15px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
        .receipt-title { font-size: 13px; font-weight: 900; margin: 6px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; text-transform: uppercase; }
        .receipt-id { font-size: 11px; color: #000 !important; font-weight: 900; }
        .date { font-size: 11px; margin-top: 4px; font-weight: 900; }
        .divider { border-top: 2px dashed #000; margin: 6px 0; }
        .section { margin: 8px 0; }
        .section-title { font-weight: 900; font-size: 12px; margin-bottom: 4px; border-bottom: 1.5px solid #000; padding-bottom: 2px; text-transform: uppercase; }
        .row { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; margin: 4px 0; }
        .label { color: #000 !important; font-weight: 900; flex: 1; min-width: 0; word-break: break-word; }
        .value { font-weight: 900; text-align: right; color: #000 !important; white-space: nowrap; flex-shrink: 0; padding-left: 4px; }
        .total-section { text-align: center; padding: 10px 0; margin: 10px 0; border-top: 2.5px solid #000; border-bottom: 2.5px solid #000; }
        .total-label { font-size: 12px; color: #000 !important; font-weight: 900; }
        .total-amount { font-size: 20px; font-weight: 900; margin: 4px 0; color: #000 !important; }
        .payment-type { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #000 !important; }
        .penalty { color: #000 !important; font-weight: 900; }
        .footer { text-align: center; margin-top: 12px; padding-top: 8px; border-top: 2px dashed #000; font-size: 10px; font-weight: 900; }
        .footer-thanks { font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
        @media print {
            body { width: ${CONTENT_WIDTH} !important; max-width: ${CONTENT_WIDTH} !important; padding: 0 3mm !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        ${companyLogo ? `<img src="${escapeHtml(companyLogo)}" class="logo" alt="${escapeHtml(companyName)}">` : ''}
        <div class="company-name">${escapeHtml(companyName)}</div>
        ${companyRNC ? `<div style="font-size: 10px; font-weight: 900; margin-top: 2px;">RNC: ${escapeHtml(companyRNC)}</div>` : ''}
        ${companyAddress ? `<div style="font-size: 10px; font-weight: 900; margin-top: 1px;">Dir: ${escapeHtml(companyAddress)}</div>` : ''}
        ${companyWhatsApp ? `<div style="font-size: 10px; font-weight: 900; margin-top: 1px;">WhatsApp: ${escapeHtml(companyWhatsApp)}</div>` : ''}
        <div class="receipt-title">COMPROBANTE DE PAGO</div>
        <div class="receipt-id">Ref: TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}</div>
        <div class="date">${formatReceiptDate(receipt.date || new Date())}</div>
    </div>
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div style="font-weight: 900; font-size: 13px;">${escapeHtml(receipt.clientName || 'Cliente')}</div>
        ${receipt.clientPhone ? `<div style="font-weight: 900;">${escapeHtml(receipt.clientPhone)}</div>` : ''}
    </div>
    ${receipt.loanAmount ? `
    <div class="section">
        <div class="section-title">PRESTAMO</div>
        <div class="row"><span class="label">Capital</span><span class="value">${formatCurrency(receipt.loanAmount)}</span></div>
        ${receipt.installmentNumber ? `<div class="row"><span class="label">Cuota(s) Pagada(s)</span><span class="value">#${receipt.installmentNumber}</span></div>` : ''}
        ${receipt.remainingBalance !== undefined ? `<div class="row" style="border-top: 1.5px solid #000; padding-top: 4px; margin-top: 4px;"><span class="label">Saldo Restante</span><span class="value">${formatCurrency(receipt.remainingBalance)}</span></div>` : ''}
    </div>` : ''}
    <div class="divider"></div>
    <div class="section">
        <div class="section-title">DETALLE</div>
        ${receipt.paymentBreakdown?.length > 0
    ? receipt.paymentBreakdown.map(item => `<div class="row"><span class="label">Cuota #${item.number}</span><span class="value">${formatCurrency(item.amount)}</span></div>`).join('')
    : `<div class="row"><span class="label">Cuota #${receipt.installmentNumber || '1'}</span><span class="value">${formatCurrency(baseAmount)}</span></div>`}
        ${penaltyAmount > 0 ? `<div class="row penalty"><span class="label">Mora</span><span class="value">${formatCurrency(penaltyAmount)}</span></div>` : ''}
        ${receipt.remainingBalance !== undefined && receipt.remainingBalance > 0 ? `<div class="row" style="border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;"><span class="label">Saldo Pendiente</span><span class="value">${formatCurrency(receipt.remainingBalance)}</span></div>` : ''}
    </div>
    <div class="total-section">
        <div class="total-label">TOTAL PAGADO</div>
        <div class="total-amount">${formatCurrency(totalAmount)}</div>
        <div class="payment-type">PAGO DE PRESTAMO</div>
    </div>
    <div class="footer">
        <div class="footer-thanks">¡Gracias por su pago!</div>
        <div>${receiptFooter ? escapeHtml(receiptFooter) : 'Conserve este comprobante'}</div>
    </div>
</body>
</html>`.trim();
}
