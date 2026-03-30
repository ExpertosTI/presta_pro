// Thermal Printer Service for 80mm receipts
// Supports: RawBT (Android), 2Conect, Generic ESC/POS (Bluetooth), HTML Print

const PAPER_WIDTH = '80mm';
const CONTENT_WIDTH = '76mm';

// ============================================================
// PRINTER DRIVER REGISTRY
// ============================================================

export const PRINTER_DRIVERS = {
    RAWBT: 'rawbt',
    BLUETOOTH_ESCPOS: 'bluetooth_escpos',
    HTML_PRINT: 'html_print',
};

export const PRINTER_BRANDS = {
    RAWBT: { id: 'rawbt', name: 'RawBT', driver: PRINTER_DRIVERS.RAWBT, platforms: ['android'] },
    CONECT_2: { id: '2conect', name: '2Conect', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    XPRINTER: { id: 'xprinter', name: 'Xprinter', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    EPSON: { id: 'epson', name: 'Epson TM', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    STAR: { id: 'star', name: 'Star', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    MUNBYN: { id: 'munbyn', name: 'Munbyn', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    GOOJPRT: { id: 'goojprt', name: 'Goojprt', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios'] },
    GENERIC: { id: 'generic', name: 'Generica ESC/POS', driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS, platforms: ['android', 'ios', 'windows'] },
    BROWSER: { id: 'browser', name: 'Navegador (PDF)', driver: PRINTER_DRIVERS.HTML_PRINT, platforms: ['android', 'ios', 'windows', 'web'] },
};

// ============================================================
// PRINTER STATE MANAGEMENT
// ============================================================

let _connectedDevice = null;
let _connectedCharacteristic = null;
let _printerConfig = loadPrinterConfig();

function loadPrinterConfig() {
    try {
        const saved = localStorage.getItem('presta_pro_printer');
        return saved ? JSON.parse(saved) : { driver: PRINTER_DRIVERS.HTML_PRINT, brand: 'browser', paperWidth: 80 };
    } catch { return { driver: PRINTER_DRIVERS.HTML_PRINT, brand: 'browser', paperWidth: 80 }; }
}

export function savePrinterConfig(config) {
    _printerConfig = { ..._printerConfig, ...config };
    localStorage.setItem('presta_pro_printer', JSON.stringify(_printerConfig));
}

export function getPrinterConfig() {
    return { ..._printerConfig };
}

export function isBluetoothSupported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

export function isRawBTAvailable() {
    return /android/i.test(navigator.userAgent || '');
}

export function getAvailableDrivers() {
    const drivers = [PRINTER_BRANDS.BROWSER];
    if (isRawBTAvailable()) drivers.unshift(PRINTER_BRANDS.RAWBT);
    if (isBluetoothSupported()) {
        drivers.push(PRINTER_BRANDS.CONECT_2, PRINTER_BRANDS.XPRINTER, PRINTER_BRANDS.EPSON,
            PRINTER_BRANDS.STAR, PRINTER_BRANDS.MUNBYN, PRINTER_BRANDS.GOOJPRT, PRINTER_BRANDS.GENERIC);
    }
    return drivers;
}

// ============================================================
// ESC/POS COMMAND BUILDER
// ============================================================

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const ESCPOS = {
    INIT: [ESC, 0x40],
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_LEFT: [ESC, 0x61, 0x00],
    ALIGN_RIGHT: [ESC, 0x61, 0x02],
    BOLD_ON: [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
    DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
    DOUBLE_ON: [ESC, 0x21, 0x30],
    NORMAL_SIZE: [ESC, 0x21, 0x00],
    UNDERLINE_ON: [ESC, 0x2D, 0x01],
    UNDERLINE_OFF: [ESC, 0x2D, 0x00],
    CUT_PAPER: [GS, 0x56, 0x00],
    CUT_PARTIAL: [GS, 0x56, 0x01],
    FEED_LINES: (n) => [ESC, 0x64, n],
    LINE: [LF],
};

function textToBytes(text) {
    const encoder = new TextEncoder();
    return encoder.encode(text);
}

function buildESCPOSReceipt(receipt, companySettings = {}) {
    const { companyName = 'Presta Pro' } = companySettings;
    const commands = [];
    const push = (...bytes) => commands.push(...bytes.flat());
    const text = (str) => push(...textToBytes(str));
    const line = () => push(...ESCPOS.LINE);
    const dashes = () => { text('--------------------------------'); line(); };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-DO', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const baseAmount = parseFloat(receipt.amount || 0);
    const penaltyAmount = parseFloat(receipt.penaltyAmount || 0);
    const totalAmount = baseAmount + penaltyAmount;

    // Initialize
    push(...ESCPOS.INIT);

    // Header
    push(...ESCPOS.ALIGN_CENTER);
    push(...ESCPOS.BOLD_ON);
    push(...ESCPOS.DOUBLE_ON);
    text(companyName); line();
    push(...ESCPOS.NORMAL_SIZE);
    push(...ESCPOS.BOLD_OFF);
    line();
    push(...ESCPOS.BOLD_ON);
    text('COMPROBANTE DE PAGO'); line();
    push(...ESCPOS.BOLD_OFF);
    text(`Ref: TPPR3N4${(receipt.id || '').slice(-6).toUpperCase().padStart(6, '0')}`); line();
    text(formatDate(receipt.date || new Date())); line();

    dashes();

    // Client
    push(...ESCPOS.ALIGN_LEFT);
    push(...ESCPOS.BOLD_ON);
    text('CLIENTE'); line();
    push(...ESCPOS.BOLD_OFF);
    text(receipt.clientName || 'Cliente'); line();
    if (receipt.clientPhone) { text(receipt.clientPhone); line(); }

    dashes();

    // Loan info
    if (receipt.loanAmount) {
        push(...ESCPOS.BOLD_ON);
        text('PRESTAMO'); line();
        push(...ESCPOS.BOLD_OFF);

        const capitalLine = `Capital:${formatCurrency(receipt.loanAmount).padStart(20)}`;
        text(capitalLine); line();

        if (receipt.installmentNumber) {
            text(`Cuota(s):          #${receipt.installmentNumber}`); line();
        }
        if (receipt.remainingBalance !== undefined) {
            push(...ESCPOS.BOLD_ON);
            const balLine = `Saldo:${formatCurrency(receipt.remainingBalance).padStart(22)}`;
            text(balLine); line();
            push(...ESCPOS.BOLD_OFF);
        }
        dashes();
    }

    // Detail
    push(...ESCPOS.BOLD_ON);
    text('DETALLE'); line();
    push(...ESCPOS.BOLD_OFF);

    if (receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0) {
        receipt.paymentBreakdown.forEach(item => {
            const itemLine = `Cuota #${item.number}${formatCurrency(item.amount).padStart(32 - `Cuota #${item.number}`.length)}`;
            text(itemLine); line();
        });
    } else {
        const cuotaNum = receipt.installmentNumber || '1';
        const itemLine = `Cuota #${cuotaNum}${formatCurrency(baseAmount).padStart(32 - `Cuota #${cuotaNum}`.length)}`;
        text(itemLine); line();
    }

    if (penaltyAmount > 0) {
        const moraLine = `Mora${formatCurrency(penaltyAmount).padStart(28)}`;
        text(moraLine); line();
    }

    // Total
    dashes();
    push(...ESCPOS.ALIGN_CENTER);
    push(...ESCPOS.BOLD_ON);
    text('TOTAL PAGADO'); line();
    push(...ESCPOS.DOUBLE_ON);
    text(formatCurrency(totalAmount)); line();
    push(...ESCPOS.NORMAL_SIZE);
    push(...ESCPOS.BOLD_OFF);
    text('PAGO DE PRESTAMO'); line();
    dashes();

    // Footer
    push(...ESCPOS.ALIGN_CENTER);
    push(...ESCPOS.BOLD_ON);
    text('Gracias por su pago!'); line();
    push(...ESCPOS.BOLD_OFF);
    text('Conserve este comprobante'); line();
    line();
    line();

    // Feed and cut
    push(...ESCPOS.FEED_LINES(4));
    push(...ESCPOS.CUT_PARTIAL);

    return new Uint8Array(commands);
}

// ============================================================
// RAWBT DRIVER (Android)
// ============================================================

export function printViaRawBT(receipt, companySettings = {}) {
    return new Promise((resolve, reject) => {
        try {
            const html = generateThermalReceiptHTML(receipt, companySettings);
            const base64 = btoa(unescape(encodeURIComponent(html)));

            // RawBT intent scheme: rawbt:base64,<data>
            const rawbtUrl = `rawbt:base64,${base64}`;

            // Try opening the RawBT intent
            const link = document.createElement('a');
            link.href = rawbtUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                resolve({ success: true, method: 'rawbt' });
            }, 500);
        } catch (error) {
            reject(new Error(`RawBT error: ${error.message}`));
        }
    });
}

// ============================================================
// WEB BLUETOOTH ESC/POS DRIVER (2Conect, Xprinter, Generic)
// ============================================================

// Known Bluetooth printer service UUIDs
const PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
    '0000ff00-0000-1000-8000-00805f9b34fb', // Alternative service
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC (common in Chinese printers)
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // 2Conect / other brands
];

const PRINTER_CHAR_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb', // Write characteristic
    '0000ff02-0000-1000-8000-00805f9b34fb', // Alternative write
    '49535343-8841-43f4-a8d4-ecbe34729bb3', // ISSC write
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // 2Conect write
];

export async function scanBluetoothPrinter() {
    if (!isBluetoothSupported()) {
        throw new Error('Bluetooth no disponible en este navegador. Usa Chrome en Android.');
    }

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: PRINTER_SERVICE_UUIDS },
                { namePrefix: '2C-' },     // 2Conect
                { namePrefix: 'BTP' },      // Generic BTP
                { namePrefix: 'XP-' },      // Xprinter
                { namePrefix: 'MHT-' },     // MHT printers
                { namePrefix: 'RPP' },       // Rongta
                { namePrefix: 'MPT-' },     // Munbyn
                { namePrefix: 'Star' },     // Star Micronics
                { namePrefix: 'TM-' },      // Epson TM
            ],
            optionalServices: PRINTER_SERVICE_UUIDS,
        });

        return device;
    } catch (error) {
        if (error.name === 'NotFoundError') {
            // User cancelled or no devices found - try with acceptAllDevices
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: PRINTER_SERVICE_UUIDS,
            });
            return device;
        }
        throw error;
    }
}

export async function connectBluetoothPrinter(device) {
    if (!device?.gatt) throw new Error('Dispositivo Bluetooth no valido');

    const server = await device.gatt.connect();

    // Try known service UUIDs
    let service = null;
    for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
            service = await server.getPrimaryService(uuid);
            break;
        } catch { /* try next */ }
    }

    if (!service) {
        // Try getting all services and find one with writable characteristic
        const services = await server.getPrimaryServices();
        for (const svc of services) {
            try {
                const chars = await svc.getCharacteristics();
                for (const char of chars) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        service = svc;
                        _connectedCharacteristic = char;
                        break;
                    }
                }
                if (_connectedCharacteristic) break;
            } catch { /* try next */ }
        }
    }

    if (!service) throw new Error('No se encontro servicio de impresion compatible');

    // Find write characteristic if not found yet
    if (!_connectedCharacteristic) {
        for (const uuid of PRINTER_CHAR_UUIDS) {
            try {
                _connectedCharacteristic = await service.getCharacteristic(uuid);
                break;
            } catch { /* try next */ }
        }

        if (!_connectedCharacteristic) {
            const chars = await service.getCharacteristics();
            _connectedCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
        }
    }

    if (!_connectedCharacteristic) throw new Error('No se encontro caracteristica de escritura');

    _connectedDevice = device;

    // Save device name for reconnection
    savePrinterConfig({
        lastDeviceName: device.name,
        driver: PRINTER_DRIVERS.BLUETOOTH_ESCPOS,
    });

    return { device, characteristic: _connectedCharacteristic };
}

export async function disconnectBluetoothPrinter() {
    if (_connectedDevice?.gatt?.connected) {
        _connectedDevice.gatt.disconnect();
    }
    _connectedDevice = null;
    _connectedCharacteristic = null;
}

export function getBluetoothConnectionStatus() {
    return {
        connected: !!_connectedDevice?.gatt?.connected,
        deviceName: _connectedDevice?.name || null,
    };
}

async function sendDataToBluetoothPrinter(data) {
    if (!_connectedCharacteristic) {
        throw new Error('Impresora no conectada. Conecta primero via Bluetooth.');
    }

    // Send in chunks (BLE has ~512 byte MTU limit, use 200 for safety)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        if (_connectedCharacteristic.properties.writeWithoutResponse) {
            await _connectedCharacteristic.writeValueWithoutResponse(chunk);
        } else {
            await _connectedCharacteristic.writeValue(chunk);
        }
        // Small delay between chunks to prevent buffer overflow
        if (i + CHUNK_SIZE < data.length) {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
}

export async function printViaBluetoothESCPOS(receipt, companySettings = {}) {
    const data = buildESCPOSReceipt(receipt, companySettings);
    await sendDataToBluetoothPrinter(data);
    return { success: true, method: 'bluetooth_escpos', bytes: data.length };
}

// ============================================================
// HTML PRINT DRIVER (Browser fallback)
// ============================================================

export function generateThermalReceiptHTML(receipt, companySettings = {}) {
    const { companyName = 'Presta Pro', companyLogo = null } = companySettings;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-DO', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

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
        <div class="date">${formatDate(receipt.date || new Date())}</div>
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
        ${receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0
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

export function printViaHTML(receipt, companySettings = {}) {
    return new Promise((resolve, reject) => {
        try {
            const html = generateThermalReceiptHTML(receipt, companySettings);
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;visibility:hidden';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document || iframe.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
                iframe.onload = () => {
                    setTimeout(() => {
                        try {
                            iframe.contentWindow?.print();
                            resolve({ success: true, method: 'html_print' });
                        } catch (e) {
                            const w = window.open('', '_blank', 'width=320,height=600');
                            if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
                            resolve({ success: true, method: 'html_print_fallback' });
                        }
                        setTimeout(() => document.body.removeChild(iframe), 1000);
                    }, 100);
                };
            } else {
                reject(new Error('No se pudo crear iframe de impresion'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// ============================================================
// UNIFIED PRINT FUNCTION
// ============================================================

export async function printReceipt(receipt, companySettings = {}, driverOverride = null) {
    const driver = driverOverride || _printerConfig.driver;

    switch (driver) {
        case PRINTER_DRIVERS.RAWBT:
            return printViaRawBT(receipt, companySettings);

        case PRINTER_DRIVERS.BLUETOOTH_ESCPOS:
            if (!_connectedCharacteristic) {
                throw new Error('Impresora Bluetooth no conectada. Ve a Configuracion > Impresora para conectar.');
            }
            return printViaBluetoothESCPOS(receipt, companySettings);

        case PRINTER_DRIVERS.HTML_PRINT:
        default:
            return printViaHTML(receipt, companySettings);
    }
}

// Legacy compatibility
export const printThermalReceipt = (receipt, companySettings) => printViaHTML(receipt, companySettings);
export const printThermalDirect = (receipt, companySettings) => {
    const html = generateThermalReceiptHTML(receipt, companySettings);
    const w = window.open('', '_blank', 'width=320,height=600');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.onload = () => { w.print(); w.close(); }; }
};

export default {
    // Core
    generateThermalReceiptHTML,
    printReceipt,
    // Drivers
    printViaRawBT,
    printViaBluetoothESCPOS,
    printViaHTML,
    // Bluetooth management
    scanBluetoothPrinter,
    connectBluetoothPrinter,
    disconnectBluetoothPrinter,
    getBluetoothConnectionStatus,
    // Config
    savePrinterConfig,
    getPrinterConfig,
    getAvailableDrivers,
    isBluetoothSupported,
    isRawBTAvailable,
    // Constants
    PRINTER_DRIVERS,
    PRINTER_BRANDS,
    // Legacy
    printThermalReceipt,
    printThermalDirect,
};
