/**
 * Print utility using a hidden iframe to avoid Cross-Origin-Opener-Policy issues
 * and prevent popup blockers.
 */
export const printHtmlContent = (title, contentHtml) => {
  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  // Safe content check
  const safeContent = (contentHtml || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  // Write content
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #000; }
          pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; }
          h1 { text-align: center; margin-bottom: 24px; font-size: 20px; text-transform: uppercase; }
          
          @media print {
             body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${contentHtml.includes('<') ? contentHtml : `<h1>${title}</h1><pre>${contentHtml}</pre>`}
      </body>
    </html>
  `);
  doc.close();

  // Print after image loading (if any)
  iframe.contentWindow.addEventListener('load', () => {
    // Small delay to ensure rendering
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print failed', e);
        alert('No se pudo iniciar la impresión. Intente nuevamente.');
      } finally {
        // Remove iframe after user interacts with print dialog (or after delay)
        // Note: There is no standard event for "after print dialog closed".
        // We'll leave it or remove it after a long timeout. 
        // Removing immediately stops printing in some browsers (Firefox).
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 60000);
      }
    }, 500);
  });

  // Backup if load event doesn't fire (e.g. no external resources)
  if (iframe.contentWindow.document.readyState === 'complete') {
    iframe.contentWindow.dispatchEvent(new Event('load'));
  }
};

/**
 * Print thermal ticket (58mm) - uses same working pattern as printHtmlContent
 * @param {Object} receipt - Receipt data
 * @param {Object} options - { companyName, isCopy }
 */
export const printThermalTicket = (receipt, options = {}) => {
  if (!receipt) return;

  const { companyName = 'RenKredit', isCopy = false } = options;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || receipt.penalty || 0);
  const totalAmount = baseAmount + penaltyAmount;

  const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ticket${isCopy ? ' (COPIA)' : ''}</title>
    <style>
        @page { size: 58mm auto; margin: 1mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            line-height: 1.2;
            width: 54mm;
            max-width: 54mm;
            color: #000;
            background: #fff;
            padding: 2mm;
        }
        .copy-banner {
            text-align: center;
            font-weight: bold;
            border: 2px solid #000;
            padding: 3px;
            margin-bottom: 4px;
            font-size: 11px;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
        .company-name { font-size: 12px; font-weight: bold; }
        .receipt-title { font-size: 9px; font-weight: bold; margin: 2px 0; }
        .receipt-ref, .receipt-date { font-size: 7px; color: #333; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .section { margin: 3px 0; }
        .section-title { font-weight: bold; font-size: 8px; margin-bottom: 1px; }
        .line { display: flex; justify-content: space-between; padding: 1px 0; font-size: 8px; }
        .line-amount { font-weight: bold; }
        .penalty { color: #c00; }
        .total-section {
            text-align: center;
            padding: 4px 0;
            margin: 4px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }
        .total-label { font-size: 8px; }
        .total-amount { font-size: 14px; font-weight: bold; margin: 2px 0; }
        .payment-type { font-size: 8px; font-weight: bold; }
        .footer { text-align: center; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #000; font-size: 7px; }
        .footer-thanks { font-weight: bold; }
        @media print {
            body { width: 54mm !important; max-width: 54mm !important; }
        }
    </style>
</head>
<body>
    ${isCopy ? '<div class="copy-banner">*** COPIA ***</div>' : ''}
    
    <div class="header">
        <div class="company-name">${companyName}</div>
        <div class="receipt-title">COMPROBANTE DE PAGO${isCopy ? ' (REIMPRESO)' : ''}</div>
        <div class="receipt-ref">Ref: ${(receipt.id || '').slice(-8).toUpperCase()}</div>
        <div class="receipt-date">${formatDate(receipt.date || new Date())}</div>
    </div>
    
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div>${receipt.clientName || 'Cliente'}</div>
        ${receipt.clientPhone ? `<div style="font-size:7px;">${receipt.clientPhone}</div>` : ''}
    </div>

    <div class="divider"></div>
    
    <div class="section">
        <div class="section-title">DETALLE</div>
        <div class="line">
            <span>Cuota #${receipt.installmentNumber || receipt.number || 1}</span>
            <span class="line-amount">${formatCurrency(baseAmount)}</span>
        </div>
        ${penaltyAmount > 0 ? `
        <div class="line penalty">
            <span>Mora</span>
            <span class="line-amount">${formatCurrency(penaltyAmount)}</span>
        </div>
        ` : ''}
        ${receipt.remainingBalance !== undefined ? `
        <div class="line">
            <span>Saldo Pendiente</span>
            <span class="line-amount">${formatCurrency(receipt.remainingBalance)}</span>
        </div>
        ` : ''}
    </div>
    
    <div class="total-section">
        <div class="total-label">TOTAL PAGADO</div>
        <div class="total-amount">${formatCurrency(totalAmount)}</div>
        <div class="payment-type">PAGO DE PRÉSTAMO</div>
    </div>
    
    <div class="footer">
        <div class="footer-thanks">¡Gracias por su pago!</div>
        <div>Conserve este comprobante</div>
    </div>
</body>
</html>
    `.trim();

  // Use same iframe pattern that works for reports
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.contentWindow.addEventListener('load', () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print ticket failed', e);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 60000);
      }
    }, 500);
  });

  if (iframe.contentWindow.document.readyState === 'complete') {
    iframe.contentWindow.dispatchEvent(new Event('load'));
  }
};

/**
 * Print Text Receipt - Odoo POS style plain text format for 58mm thermal printers
 * Uses monospace text with character alignment, minimal CSS - like ESC/POS output
 * This format is more compatible with basic thermal printers
 * 
 * @param {Object} receipt - Receipt data
 * @param {Object} options - { companyName, isCopy }
 */
export const printTextReceipt = (receipt, options = {}) => {
  if (!receipt) return;

  const {
    companyName = 'RenKredit',
    companyAddress = '',
    companyPhone = '',
    companyWhatsApp = '',
    isCopy = false
  } = options;
  const LINE_WIDTH = 32; // Characters width for 58mm paper

  // Helper functions
  const center = (text) => {
    const padding = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const leftRight = (left, right) => {
    const spaces = Math.max(1, LINE_WIDTH - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const line = (char = '-') => char.repeat(LINE_WIDTH);

  const formatMoney = (amount) => {
    return 'RD$' + parseFloat(amount || 0).toFixed(2);
  };

  const formatDateShort = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || receipt.penalty || 0);
  const totalAmount = baseAmount + penaltyAmount;

  // Build plain text receipt (Odoo POS style)
  const lines = [];

  // Copy banner
  if (isCopy) {
    lines.push(center('*** COPIA ***'));
    lines.push('');
  }

  // Header with company info
  lines.push(center('****************************'));
  lines.push(center(companyName.toUpperCase()));
  lines.push(center('****************************'));
  if (companyAddress) {
    lines.push(center(companyAddress.substring(0, LINE_WIDTH)));
  }
  if (companyPhone) {
    lines.push(center('Tel: ' + companyPhone));
  }
  if (companyWhatsApp) {
    lines.push(center('WhatsApp: ' + companyWhatsApp));
  }
  lines.push('');
  lines.push(center('COMPROBANTE DE PAGO'));
  if (isCopy) lines.push(center('(REIMPRESO)'));
  lines.push(line('='));

  // Reference & Date
  lines.push('Ref: ' + (receipt.id || '').slice(-8).toUpperCase());
  lines.push('Fecha: ' + formatDateShort(receipt.date || new Date()));
  lines.push(line('-'));

  // Client - MORE PROMINENT
  lines.push('');
  lines.push(center('** CLIENTE **'));
  const clientName = (receipt.clientName || 'Cliente').toUpperCase();
  lines.push(center(clientName.substring(0, LINE_WIDTH)));
  if (receipt.clientPhone) {
    lines.push(center('Tel: ' + receipt.clientPhone));
  }
  lines.push('');
  lines.push(line('-'));

  // Detail
  lines.push('DETALLE:');
  const cuotaLabel = receipt.isPartialPayment
    ? `Abono Cuota #${receipt.installmentNumber || receipt.number || 1}`
    : `Cuota #${receipt.installmentNumber || receipt.number || 1}`;
  lines.push(leftRight(cuotaLabel, formatMoney(baseAmount)));

  if (penaltyAmount > 0) {
    lines.push(leftRight('Mora', formatMoney(penaltyAmount)));
  }

  if (receipt.remainingBalance !== undefined) {
    lines.push(leftRight('Saldo Pend.', formatMoney(receipt.remainingBalance)));
  }

  lines.push(line('='));

  // Total - VERY PROMINENT
  lines.push('');
  lines.push(center('**********************'));
  lines.push(center('TOTAL PAGADO'));
  lines.push(center('>>> ' + formatMoney(totalAmount) + ' <<<'));
  lines.push(center('**********************'));
  lines.push('');

  // Footer
  lines.push(center('Gracias por su pago!'));
  lines.push(center('Conserve este comprobante'));
  lines.push('');

  // Convert to plain text HTML (monospace, no styling)
  const textContent = lines.join('\n');

  const ticketHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket</title>
<style>
@page { size: 58mm auto; margin: 0; }
@media print { body { width: 58mm; } }
body {
  font-family: 'Courier New', 'Lucida Console', monospace;
  font-size: 10px;
  line-height: 1.1;
  margin: 0;
  padding: 2mm;
  white-space: pre;
  background: white;
  color: black;
}
</style>
</head>
<body>${textContent}</body>
</html>`;

  // Use iframe print (same working pattern)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.contentWindow.addEventListener('load', () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print text receipt failed', e);
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 60000);
      }
    }, 500);
  });

  if (iframe.contentWindow.document.readyState === 'complete') {
    iframe.contentWindow.dispatchEvent(new Event('load'));
  }
};

/**
 * Print Modern Ticket - HTML/CSS with logo support for 58mm thermal printers
 * Similar to Odoo POS receipt format - works with printers that support graphics
 * 
 * @param {Object} receipt - Receipt data
 * @param {Object} options - { companyName, companyLogo, companyAddress, companyPhone, companyWhatsApp, isCopy }
 */
export const printModernTicket = (receipt, options = {}) => {
  if (!receipt) return;

  const {
    companyName = 'RenKredit',
    companyLogo = '',
    companyAddress = '',
    companyPhone = '',
    companyWhatsApp = '',
    isCopy = false
  } = options;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const baseAmount = parseFloat(receipt.amount || 0);
  const penaltyAmount = parseFloat(receipt.penaltyAmount || receipt.penalty || 0);
  const totalAmount = baseAmount + penaltyAmount;

  const ticketHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Ticket ${isCopy ? '(COPIA)' : ''}</title>
<style>
@page { 
  size: 58mm auto; 
  margin: 0; 
}
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}
body {
  font-family: Arial, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  width: 58mm;
  max-width: 58mm;
  padding: 2mm;
  background: white;
  color: black;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.copy-banner {
  background: #000;
  color: #fff;
  text-align: center;
  font-weight: bold;
  padding: 3px;
  margin-bottom: 3mm;
  font-size: 12px;
}
.header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 2mm;
  margin-bottom: 2mm;
}
.logo {
  max-width: 35mm;
  max-height: 15mm;
  margin: 0 auto 2mm;
  display: block;
}
.company-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 1mm;
}
.company-info {
  font-size: 9px;
  color: #333;
}
.title {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  margin: 2mm 0;
  padding: 1mm 0;
  background: #f0f0f0;
}
.ref-date {
  font-size: 9px;
  margin-bottom: 2mm;
}
.divider {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}
.section-title {
  font-weight: bold;
  font-size: 10px;
  background: #eee;
  padding: 1mm 2mm;
  margin-bottom: 1mm;
}
.client-box {
  background: #f8f8f8;
  padding: 2mm;
  border: 1px solid #ddd;
  margin-bottom: 2mm;
}
.client-name {
  font-size: 12px;
  font-weight: bold;
}
.client-phone {
  font-size: 9px;
  color: #666;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 1mm 0;
  font-size: 10px;
}
.detail-row.penalty {
  color: #c00;
}
.total-box {
  background: #000;
  color: #fff;
  text-align: center;
  padding: 3mm 2mm;
  margin: 2mm 0;
}
.total-label {
  font-size: 10px;
  margin-bottom: 1mm;
}
.total-amount {
  font-size: 18px;
  font-weight: bold;
}
.footer {
  text-align: center;
  font-size: 9px;
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px dashed #000;
}
.footer-thanks {
  font-weight: bold;
  margin-bottom: 1mm;
}
@media print {
  body { 
    width: 58mm !important; 
    max-width: 58mm !important;
  }
}
</style>
</head>
<body>
${isCopy ? '<div class="copy-banner">*** COPIA ***</div>' : ''}

<div class="header">
  ${companyLogo ? `<img src="${companyLogo}" class="logo" alt="${companyName}">` : ''}
  <div class="company-name">${companyName}</div>
  ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
  ${companyPhone ? `<div class="company-info">Tel: ${companyPhone}</div>` : ''}
  ${companyWhatsApp ? `<div class="company-info">WhatsApp: ${companyWhatsApp}</div>` : ''}
</div>

<div class="title">COMPROBANTE DE PAGO${isCopy ? ' (REIMPRESO)' : ''}</div>

<div class="ref-date">
  <div><strong>Ref:</strong> ${(receipt.id || '').slice(-8).toUpperCase()}</div>
  <div><strong>Fecha:</strong> ${formatDate(receipt.date || new Date())}</div>
</div>

<div class="divider"></div>

<div class="section-title">CLIENTE</div>
<div class="client-box">
  <div class="client-name">${receipt.clientName || 'Cliente'}</div>
  ${receipt.clientPhone ? `<div class="client-phone">Tel: ${receipt.clientPhone}</div>` : ''}
</div>

<div class="section-title">DETALLE</div>
<div class="detail-row">
  <span>${receipt.isPartialPayment ? 'Abono' : 'Cuota'} #${receipt.installmentNumber || receipt.number || 1}</span>
  <span><strong>${formatMoney(baseAmount)}</strong></span>
</div>
${penaltyAmount > 0 ? `
<div class="detail-row penalty">
  <span>Mora</span>
  <span><strong>${formatMoney(penaltyAmount)}</strong></span>
</div>
` : ''}
${receipt.remainingBalance !== undefined ? `
<div class="detail-row">
  <span>Saldo Pendiente</span>
  <span>${formatMoney(receipt.remainingBalance)}</span>
</div>
` : ''}

<div class="total-box">
  <div class="total-label">TOTAL PAGADO</div>
  <div class="total-amount">${formatMoney(totalAmount)}</div>
</div>

<div class="footer">
  <div class="footer-thanks">¡Gracias por su pago!</div>
  <div>Conserve este comprobante</div>
</div>
</body>
</html>`;

  // Use iframe print (same working pattern)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.contentWindow.addEventListener('load', () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print modern ticket failed', e);
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 60000);
      }
    }, 500);
  });

  if (iframe.contentWindow.document.readyState === 'complete') {
    iframe.contentWindow.dispatchEvent(new Event('load'));
  }
};
