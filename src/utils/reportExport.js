/**
 * Report Export Utilities
 * PDF and Excel export for accounting reports
 */

import { formatCurrency, formatDate, formatDateTime } from './formatters';

/**
 * Generate and download Excel file
 */
export function exportToExcel(data, filename = 'reporte') {
    const { receipts, expenses, loans, companyName = 'Presta Pro', dateRange } = data;

    // Create workbook content as CSV (Excel compatible)
    let csvContent = '';

    // Header
    csvContent += `${companyName} - Reporte Financiero\n`;
    csvContent += `Generado: ${formatDateTime(new Date())}\n`;
    if (dateRange) {
        csvContent += `Período: ${dateRange.from} - ${dateRange.to}\n`;
    }
    csvContent += '\n';

    // Summary section
    const totalCobrado = (receipts || []).reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
    const totalGastos = (expenses || []).reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalCapital = (loans || []).reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);

    csvContent += 'RESUMEN\n';
    csvContent += `Capital Prestado,${totalCapital.toFixed(2)}\n`;
    csvContent += `Total Cobrado,${totalCobrado.toFixed(2)}\n`;
    csvContent += `Total Gastos,${totalGastos.toFixed(2)}\n`;
    csvContent += `Utilidad Neta,${(totalCobrado - totalGastos).toFixed(2)}\n`;
    csvContent += '\n';

    // Receipts section
    if (receipts && receipts.length > 0) {
        csvContent += 'COBROS\n';
        csvContent += 'Fecha,Cliente,Préstamo ID,Cuota #,Monto,Mora,Total\n';
        receipts.forEach(r => {
            const base = parseFloat(r.amount || 0);
            const penalty = parseFloat(r.penaltyAmount || r.penalty || 0);
            csvContent += `${formatDateTime(r.date)},${r.clientName || ''},${(r.loanId || '').substring(0, 6)},${r.installmentNumber || ''},${base.toFixed(2)},${penalty.toFixed(2)},${(base + penalty).toFixed(2)}\n`;
        });
        csvContent += '\n';
    }

    // Expenses section
    if (expenses && expenses.length > 0) {
        csvContent += 'GASTOS\n';
        csvContent += 'Fecha,Categoría,Descripción,Monto\n';
        expenses.forEach(e => {
            csvContent += `${formatDate(e.date)},${e.category || 'Gasto'},${e.notes || e.description || ''},${parseFloat(e.amount || 0).toFixed(2)}\n`;
        });
        csvContent += '\n';
    }

    // Loans section
    if (loans && loans.length > 0) {
        csvContent += 'PRÉSTAMOS\n';
        csvContent += 'ID,Cliente,Monto,Tasa,Plazo,Estado,Pagado\n';
        loans.forEach(l => {
            csvContent += `${(l.id || '').substring(0, 6)},${l.clientName || ''},${parseFloat(l.amount || 0).toFixed(2)},${l.rate}%,${l.term},${l.status || 'ACTIVE'},${parseFloat(l.totalPaid || 0).toFixed(2)}\n`;
        });
    }

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate and download PDF report
 */
export function exportToPDF(data, filename = 'reporte') {
    const { receipts, expenses, loans, companyName = 'Presta Pro', companyLogo } = data;

    const totalCobrado = (receipts || []).reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
    const totalGastos = (expenses || []).reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
    const totalCapital = (loans || []).reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const utilidadNeta = totalCobrado - totalGastos;

    // Create printable HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${companyName} - Reporte Financiero</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
        .header h1 { font-size: 24px; color: #1e293b; }
        .header p { color: #64748b; margin-top: 5px; }
        .logo { max-height: 60px; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
        .summary-card .value { font-size: 20px; font-weight: bold; color: #1e293b; margin-top: 5px; }
        .summary-card .value.positive { color: #10b981; }
        .summary-card .value.negative { color: #ef4444; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 16px; color: #1e293b; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: 600; color: #475569; }
        tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${companyLogo ? `<img src="${companyLogo}" class="logo" alt="Logo">` : ''}
        <h1>${companyName}</h1>
        <p>Reporte Financiero - Generado: ${formatDateTime(new Date())}</p>
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <div class="label">Capital Prestado</div>
          <div class="value">${formatCurrency(totalCapital)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Cobrado</div>
          <div class="value positive">${formatCurrency(totalCobrado)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Gastos</div>
          <div class="value negative">${formatCurrency(totalGastos)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Utilidad Neta</div>
          <div class="value ${utilidadNeta >= 0 ? 'positive' : 'negative'}">${formatCurrency(utilidadNeta)}</div>
        </div>
      </div>
      
      ${receipts && receipts.length > 0 ? `
        <div class="section">
          <h2>Últimos Cobros (${receipts.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Préstamo</th>
                <th class="text-center">Cuota</th>
                <th class="text-right">Monto</th>
                <th class="text-right">Mora</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipts.slice(0, 20).map(r => {
        const base = parseFloat(r.amount || 0);
        const penalty = parseFloat(r.penaltyAmount || r.penalty || 0);
        return `
                  <tr>
                    <td>${formatDate(r.date)}</td>
                    <td>${r.clientName || '-'}</td>
                    <td>${(r.loanId || '').substring(0, 6).toUpperCase()}</td>
                    <td class="text-center">#${r.installmentNumber || '-'}</td>
                    <td class="text-right">${formatCurrency(base)}</td>
                    <td class="text-right negative">${formatCurrency(penalty)}</td>
                    <td class="text-right positive">${formatCurrency(base + penalty)}</td>
                  </tr>
                `;
    }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      ${expenses && expenses.length > 0 ? `
        <div class="section">
          <h2>Últimos Gastos (${expenses.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.slice(0, 20).map(e => `
                <tr>
                  <td>${formatDate(e.date)}</td>
                  <td>${e.category || 'Gasto'}</td>
                  <td>${e.notes || e.description || '-'}</td>
                  <td class="text-right negative">${formatCurrency(e.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Este reporte fue generado automáticamente por ${companyName}</p>
        <p>Presta Pro by Renace.Tech</p>
      </div>
    </body>
    </html>
  `;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    }
}
