/**
 * usePrintReceipt - Odoo-style Print Hook
 * 
 * Based on Odoo POS AbstractReceiptScreen pattern:
 * 1. Export data for printing (like Odoo's export_for_printing)
 * 2. Render receipt template
 * 3. Print via iframe (like Odoo's print mechanism)
 * 4. Handle print lifecycle events
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Paper sizes constants (like Odoo POS)
const PAPER_SIZES = {
    '58mm': { width: '58mm', content: '54mm', fontSize: '9px' },
    '80mm': { width: '80mm', content: '76mm', fontSize: '11px' },
};

// Default settings
const DEFAULT_SETTINGS = {
    paperSize: '58mm',
    autoPrint: true,
    showPreview: false,
    closeDelay: 300,
};

/**
 * Format receipt data for printing (Odoo export_for_printing pattern)
 */
export function exportReceiptForPrinting(receipt, options = {}) {
    const { companyName = 'Presta Pro', companyLogo = null, isCopy = false } = options;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP',
            minimumFractionDigits: 2,
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

    return {
        // Header data (like Odoo headerData)
        header: {
            companyName,
            companyLogo,
            title: isCopy ? 'COMPROBANTE DE PAGO (COPIA)' : 'COMPROBANTE DE PAGO',
            reference: `TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}`,
            date: formatDate(receipt.date || new Date()),
            isCopy,
        },
        // Client data
        client: {
            name: receipt.clientName || 'Cliente',
            phone: receipt.clientPhone || '',
        },
        // Loan data
        loan: receipt.loanAmount ? {
            capital: formatCurrency(receipt.loanAmount),
            installmentNumber: receipt.installmentNumber,
            remainingBalance: formatCurrency(receipt.remainingBalance || 0),
        } : null,
        // Payment breakdown
        lines: receipt.paymentBreakdown?.length > 0
            ? receipt.paymentBreakdown.map(item => ({
                label: `Cuota #${item.number}`,
                amount: formatCurrency(item.amount),
            }))
            : [{
                label: `Cuota #${receipt.installmentNumber || 1}`,
                amount: formatCurrency(baseAmount),
            }],
        // Penalty if any
        penalty: penaltyAmount > 0 ? {
            label: 'Mora',
            amount: formatCurrency(penaltyAmount),
        } : null,
        // Totals
        totals: {
            base: formatCurrency(baseAmount),
            penalty: formatCurrency(penaltyAmount),
            total: formatCurrency(baseAmount + penaltyAmount),
        },
        // Footer
        footer: {
            thanks: '¡Gracias por su pago!',
            note: 'Conserve este comprobante',
        },
    };
}

/**
 * Generate receipt HTML (like Odoo QWeb template rendering)
 */
export function generateReceiptHTML(receiptData, paperSettings) {
    const { width, content, fontSize } = paperSettings;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${receiptData.header.title}</title>
    <style>
        @page { size: ${width} auto; margin: 1mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            font-size: ${fontSize};
            line-height: 1.2;
            width: ${content};
            max-width: ${content};
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
            font-size: 12px;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
        .company-name { font-size: 14px; font-weight: bold; }
        .receipt-title { font-size: 10px; font-weight: bold; margin: 2px 0; }
        .receipt-ref, .receipt-date { font-size: 8px; color: #444; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .section { margin: 4px 0; }
        .section-title { font-weight: bold; font-size: 9px; margin-bottom: 2px; }
        .line { display: flex; justify-content: space-between; padding: 1px 0; }
        .line-label { color: #333; }
        .line-amount { font-weight: bold; text-align: right; }
        .penalty { color: #c00; }
        .total-section {
            text-align: center;
            padding: 6px 0;
            margin: 6px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }
        .total-label { font-size: 9px; color: #333; }
        .total-amount { font-size: 16px; font-weight: bold; margin: 2px 0; }
        .payment-type { font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; font-size: 8px; }
        .footer-thanks { font-weight: bold; margin-bottom: 2px; }
        @media print {
            body { width: ${content} !important; max-width: ${content} !important; }
        }
    </style>
</head>
<body>
    ${receiptData.header.isCopy ? '<div class="copy-banner">*** COPIA ***</div>' : ''}
    
    <div class="header">
        ${receiptData.header.companyLogo ? `<img src="${receiptData.header.companyLogo}" style="max-width:30mm;max-height:10mm;margin-bottom:2px;">` : ''}
        <div class="company-name">${receiptData.header.companyName}</div>
        <div class="receipt-title">${receiptData.header.title}</div>
        <div class="receipt-ref">Ref: ${receiptData.header.reference}</div>
        <div class="receipt-date">${receiptData.header.date}</div>
    </div>
    
    <div class="section">
        <div class="section-title">CLIENTE</div>
        <div>${receiptData.client.name}</div>
        ${receiptData.client.phone ? `<div style="font-size:8px;">${receiptData.client.phone}</div>` : ''}
    </div>

    ${receiptData.loan ? `
    <div class="divider"></div>
    <div class="section">
        <div class="section-title">PRÉSTAMO</div>
        <div class="line">
            <span class="line-label">Capital</span>
            <span class="line-amount">${receiptData.loan.capital}</span>
        </div>
        ${receiptData.loan.installmentNumber ? `
        <div class="line">
            <span class="line-label">Cuota(s) Pagada(s)</span>
            <span class="line-amount">#${receiptData.loan.installmentNumber}</span>
        </div>
        ` : ''}
        <div class="line" style="border-top:1px solid #ccc;padding-top:2px;margin-top:2px;">
            <span class="line-label"><strong>Saldo Restante</strong></span>
            <span class="line-amount"><strong>${receiptData.loan.remainingBalance}</strong></span>
        </div>
    </div>
    ` : ''}

    <div class="divider"></div>
    
    <div class="section">
        <div class="section-title">DETALLE</div>
        ${receiptData.lines.map(line => `
        <div class="line">
            <span class="line-label">${line.label}</span>
            <span class="line-amount">${line.amount}</span>
        </div>
        `).join('')}
        ${receiptData.penalty ? `
        <div class="line penalty">
            <span class="line-label">${receiptData.penalty.label}</span>
            <span class="line-amount">${receiptData.penalty.amount}</span>
        </div>
        ` : ''}
    </div>
    
    <div class="total-section">
        <div class="total-label">TOTAL PAGADO</div>
        <div class="total-amount">${receiptData.totals.total}</div>
        <div class="payment-type">PAGO DE PRÉSTAMO</div>
    </div>
    
    <div class="footer">
        <div class="footer-thanks">${receiptData.footer.thanks}</div>
        <div>${receiptData.footer.note}</div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Print via iframe (Odoo POS pattern)
 */
function printViaIframe(html, onComplete) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
        console.error('Could not access iframe document');
        document.body.removeChild(iframe);
        onComplete?.(false);
        return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                onComplete?.(true);
            } catch (e) {
                console.error('Print error:', e);
                // Fallback: open in popup
                const printWindow = window.open('', '_blank', 'width=320,height=600');
                if (printWindow) {
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    onComplete?.(true);
                } else {
                    onComplete?.(false);
                }
            }
            // Cleanup iframe after print dialog closes
            setTimeout(() => {
                try { document.body.removeChild(iframe); } catch { }
            }, 1000);
        }, 100);
    };
}

/**
 * usePrintReceipt Hook - Main export
 * 
 * Usage:
 * const { printReceipt, printReceiptCopy, isPrinting, lastPrinted } = usePrintReceipt({
 *     companyName: 'My Company',
 *     paperSize: '58mm',
 * });
 * 
 * // Print receipt
 * await printReceipt(receipt);
 * 
 * // Print copy
 * await printReceiptCopy(receipt);
 */
export function usePrintReceipt(options = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...options };
    const [isPrinting, setIsPrinting] = useState(false);
    const [lastPrinted, setLastPrinted] = useState(null);
    const printQueueRef = useRef([]);

    const paperSettings = PAPER_SIZES[settings.paperSize] || PAPER_SIZES['58mm'];

    // Core print function (like Odoo's _onPrint)
    const doPrint = useCallback(async (receipt, isCopy = false) => {
        if (!receipt) return false;

        setIsPrinting(true);

        try {
            // Step 1: Export for printing (Odoo pattern)
            const receiptData = exportReceiptForPrinting(receipt, {
                companyName: settings.companyName || 'Presta Pro',
                companyLogo: settings.companyLogo,
                isCopy,
            });

            // Step 2: Generate HTML (like QWeb template render)
            const html = generateReceiptHTML(receiptData, paperSettings);

            // Step 3: Print via iframe (Odoo pattern)
            return new Promise((resolve) => {
                printViaIframe(html, (success) => {
                    setIsPrinting(false);
                    if (success) {
                        setLastPrinted({ receipt, printedAt: new Date(), isCopy });
                    }
                    resolve(success);
                });
            });
        } catch (error) {
            console.error('Print error:', error);
            setIsPrinting(false);
            return false;
        }
    }, [settings, paperSettings]);

    // Print receipt (primary)
    const printReceipt = useCallback((receipt) => {
        return doPrint(receipt, false);
    }, [doPrint]);

    // Print receipt copy
    const printReceiptCopy = useCallback((receipt) => {
        return doPrint(receipt, true);
    }, [doPrint]);

    // Batch print (for multiple receipts)
    const printBatch = useCallback(async (receipts, options = {}) => {
        const { delayBetween = 500 } = options;
        const results = [];

        for (const receipt of receipts) {
            const success = await doPrint(receipt, false);
            results.push({ receipt, success });
            if (delayBetween > 0 && receipts.indexOf(receipt) < receipts.length - 1) {
                await new Promise(r => setTimeout(r, delayBetween));
            }
        }

        return results;
    }, [doPrint]);

    return {
        printReceipt,
        printReceiptCopy,
        printBatch,
        isPrinting,
        lastPrinted,
        paperSettings,
    };
}

// Export utilities
export { PAPER_SIZES };

export default usePrintReceipt;
