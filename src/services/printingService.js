/**
 * Printing Service - ESC/POS Commands Generator
 * RenKredit by Renace.tech
 * 
 * Genera comandos ESC/POS para impresoras térmicas y los envía via RawBt
 * Compatible con: Bluetooth, WiFi, USB via app RawBt
 */

// Comandos ESC/POS básicos
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const ESCPOS = {
    // Inicializar impresora
    INIT: [ESC, 0x40],

    // Alineación
    ALIGN_LEFT: [ESC, 0x61, 0],
    ALIGN_CENTER: [ESC, 0x61, 1],
    ALIGN_RIGHT: [ESC, 0x61, 2],

    // Estilos de texto
    BOLD_ON: [ESC, 0x45, 1],
    BOLD_OFF: [ESC, 0x45, 0],
    DOUBLE_WIDTH: [GS, 0x21, 0x10],
    DOUBLE_HEIGHT: [GS, 0x21, 0x01],
    DOUBLE_SIZE: [GS, 0x21, 0x11],
    NORMAL_SIZE: [GS, 0x21, 0x00],
    UNDERLINE_ON: [ESC, 0x2D, 1],
    UNDERLINE_OFF: [ESC, 0x2D, 0],

    // Corte de papel
    CUT_PARTIAL: [GS, 0x56, 66, 3],
    CUT_FULL: [GS, 0x56, 65],

    // Salto de línea
    LINE_FEED: [LF],

    // Alimentar n líneas
    feedLines: (n) => [ESC, 0x64, n],

    // QR Code commands
    QR_MODEL: [GS, 0x28, 0x6B, 4, 0, 0x31, 0x41, 0x32, 0],
    QR_SIZE: (size) => [GS, 0x28, 0x6B, 3, 0, 0x31, 0x43, size],
    QR_ERROR: [GS, 0x28, 0x6B, 3, 0, 0x31, 0x45, 0x33],
    QR_STORE: (data) => {
        const bytes = new TextEncoder().encode(data);
        const pL = (bytes.length + 3) % 256;
        const pH = Math.floor((bytes.length + 3) / 256);
        return [GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes];
    },
    QR_PRINT: [GS, 0x28, 0x6B, 3, 0, 0x31, 0x51, 0x30],
};

/**
 * Clase para construir documentos ESC/POS
 */
class ESCPOSBuilder {
    constructor() {
        this.buffer = [];
        this.width = 32; // Para impresoras de 58mm (32 chars), usar 48 para 80mm
    }

    setWidth(chars) {
        this.width = chars;
        return this;
    }

    init() {
        this.buffer.push(...ESCPOS.INIT);
        return this;
    }

    text(str) {
        const bytes = new TextEncoder().encode(str);
        this.buffer.push(...bytes);
        return this;
    }

    line(str = '') {
        return this.text(str + '\n');
    }

    feed(lines = 1) {
        this.buffer.push(...ESCPOS.feedLines(lines));
        return this;
    }

    alignLeft() {
        this.buffer.push(...ESCPOS.ALIGN_LEFT);
        return this;
    }

    alignCenter() {
        this.buffer.push(...ESCPOS.ALIGN_CENTER);
        return this;
    }

    alignRight() {
        this.buffer.push(...ESCPOS.ALIGN_RIGHT);
        return this;
    }

    bold(on = true) {
        this.buffer.push(...(on ? ESCPOS.BOLD_ON : ESCPOS.BOLD_OFF));
        return this;
    }

    underline(on = true) {
        this.buffer.push(...(on ? ESCPOS.UNDERLINE_ON : ESCPOS.UNDERLINE_OFF));
        return this;
    }

    doubleWidth() {
        this.buffer.push(...ESCPOS.DOUBLE_WIDTH);
        return this;
    }

    doubleHeight() {
        this.buffer.push(...ESCPOS.DOUBLE_HEIGHT);
        return this;
    }

    doubleSize() {
        this.buffer.push(...ESCPOS.DOUBLE_SIZE);
        return this;
    }

    normalSize() {
        this.buffer.push(...ESCPOS.NORMAL_SIZE);
        return this;
    }

    separator(char = '-') {
        return this.line(char.repeat(this.width));
    }

    // Línea con texto izquierda-derecha
    leftRight(left, right, fillChar = ' ') {
        const leftStr = String(left);
        const rightStr = String(right);
        const fillLen = this.width - leftStr.length - rightStr.length;
        const fill = fillLen > 0 ? fillChar.repeat(fillLen) : ' ';
        return this.line(leftStr + fill + rightStr);
    }

    // QR Code
    qrCode(data, size = 6) {
        this.buffer.push(...ESCPOS.QR_MODEL);
        this.buffer.push(...ESCPOS.QR_SIZE(size));
        this.buffer.push(...ESCPOS.QR_ERROR);
        this.buffer.push(...ESCPOS.QR_STORE(data));
        this.buffer.push(...ESCPOS.QR_PRINT);
        return this;
    }

    cut(full = false) {
        this.buffer.push(...(full ? ESCPOS.CUT_FULL : ESCPOS.CUT_PARTIAL));
        return this;
    }

    // Obtener bytes
    getBytes() {
        return new Uint8Array(this.buffer);
    }

    // Obtener base64
    getBase64() {
        const bytes = this.getBytes();
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Obtener URL para RawBt
    getRawBtUrl() {
        return `rawbt:base64,${this.getBase64()}`;
    }
}

/**
 * Templates de recibos
 */
const ReceiptTemplates = {
    /**
     * Recibo de pago de préstamo
     */
    paymentReceipt: ({
        businessName = 'RenKredit',
        clientName,
        loanId,
        installmentNumber,
        amount,
        penalty = 0,
        remainingBalance,
        date = new Date(),
        collectorName,
        receiptNumber
    }) => {
        const builder = new ESCPOSBuilder();
        const total = amount + penalty;

        return builder
            .init()
            .alignCenter()
            .doubleSize()
            .line(businessName)
            .normalSize()
            .line('RECIBO DE PAGO')
            .separator('=')
            .feed(1)
            .alignLeft()
            .leftRight('Fecha:', formatDate(date))
            .leftRight('Recibo #:', receiptNumber || generateReceiptNumber())
            .separator()
            .bold()
            .line(`Cliente: ${clientName}`)
            .bold(false)
            .leftRight('Préstamo:', loanId?.slice(-8) || 'N/A')
            .leftRight('Cuota #:', installmentNumber)
            .separator()
            .leftRight('Monto Cuota:', formatMoney(amount))
            .leftRight('Mora:', formatMoney(penalty))
            .bold()
            .leftRight('TOTAL PAGADO:', formatMoney(total))
            .bold(false)
            .separator()
            .leftRight('Balance:', formatMoney(remainingBalance))
            .feed(1)
            .separator('=')
            .alignCenter()
            .line(collectorName ? `Cobrador: ${collectorName}` : '')
            .feed(1)
            .line('¡Gracias por su pago!')
            .line('www.renkredit.com')
            .feed(3)
            .cut();
    },

    /**
     * Resumen de préstamo
     */
    loanSummary: ({
        businessName = 'RenKredit',
        clientName,
        clientPhone,
        loanAmount,
        interestRate,
        term,
        frequency,
        startDate,
        totalToPay,
        installmentAmount,
        schedule = []
    }) => {
        const builder = new ESCPOSBuilder();

        builder
            .init()
            .alignCenter()
            .doubleSize()
            .line(businessName)
            .normalSize()
            .line('RESUMEN DE PRESTAMO')
            .separator('=')
            .feed(1)
            .alignLeft()
            .bold()
            .line(`Cliente: ${clientName}`)
            .bold(false)
            .leftRight('Teléfono:', clientPhone || 'N/A')
            .separator()
            .leftRight('Capital:', formatMoney(loanAmount))
            .leftRight('Tasa:', `${interestRate}%`)
            .leftRight('Plazo:', `${term} cuotas`)
            .leftRight('Frecuencia:', frequency)
            .leftRight('Inicio:', formatDate(startDate))
            .separator()
            .bold()
            .leftRight('TOTAL A PAGAR:', formatMoney(totalToPay))
            .bold(false)
            .leftRight('Cuota:', formatMoney(installmentAmount))
            .separator('=')
            .feed(1);

        // Mini calendario (primeras 5 cuotas)
        if (schedule.length > 0) {
            builder
                .alignCenter()
                .line('PROXIMAS CUOTAS')
                .alignLeft();

            const showSchedule = schedule.slice(0, 5);
            showSchedule.forEach(inst => {
                builder.leftRight(`#${inst.number} ${formatDate(inst.date)}`, formatMoney(inst.payment));
            });

            if (schedule.length > 5) {
                builder.line(`... y ${schedule.length - 5} cuotas más`);
            }
        }

        return builder
            .feed(1)
            .separator('=')
            .alignCenter()
            .line('¡Gracias por su preferencia!')
            .feed(3)
            .cut();
    },

    /**
     * Cierre de ruta (resumen del día)
     */
    routeClosing: ({
        businessName = 'RenKredit',
        collectorName,
        date = new Date(),
        totalCollected,
        paymentsCount,
        visitCount,
        pendingAmount,
        clients = []
    }) => {
        const builder = new ESCPOSBuilder();

        builder
            .init()
            .alignCenter()
            .doubleSize()
            .line(businessName)
            .normalSize()
            .line('CIERRE DE RUTA')
            .separator('=')
            .feed(1)
            .alignLeft()
            .leftRight('Cobrador:', collectorName)
            .leftRight('Fecha:', formatDate(date))
            .separator()
            .bold()
            .leftRight('RECAUDADO:', formatMoney(totalCollected))
            .bold(false)
            .leftRight('Pagos:', paymentsCount)
            .leftRight('Visitas:', visitCount)
            .leftRight('Pendiente:', formatMoney(pendingAmount))
            .separator('=')
            .feed(1);

        // Lista de clientes visitados
        if (clients.length > 0) {
            builder
                .alignCenter()
                .line('DETALLE')
                .alignLeft();

            clients.forEach(c => {
                builder.leftRight(c.name.substring(0, 16), formatMoney(c.amount));
            });
        }

        return builder
            .feed(2)
            .separator('=')
            .alignCenter()
            .line('Firma: _______________')
            .feed(4)
            .cut();
    }
};

// Helpers
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatMoney(amount) {
    return `$${(parseFloat(amount) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

function generateReceiptNumber() {
    return `R${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Servicio principal de impresión
 */
const PrintingService = {
    /**
     * Verificar si está disponible (Android con Capacitor)
     */
    isAvailable() {
        return typeof window !== 'undefined' &&
            window.Capacitor &&
            window.Capacitor.getPlatform() === 'android';
    },

    /**
     * Imprimir via RawBt
     */
    async print(builder) {
        const url = builder.getRawBtUrl();

        if (this.isAvailable()) {
            // En Android, abrir URL con el esquema rawbt:
            const { App } = await import('@capacitor/app');
            try {
                // Usar Browser para abrir deep link
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url, windowName: '_system' });
            } catch (e) {
                // Fallback: intentar con App.openUrl si disponible
                console.log('Trying alternative method...');
                window.open(url, '_system');
            }
        } else {
            // En web, mostrar preview o copiar datos
            console.log('Printing not available, showing preview');
            console.log('RawBt URL:', url);
            return { success: false, message: 'Impresión solo disponible en Android' };
        }

        return { success: true };
    },

    /**
     * Imprimir recibo de pago
     */
    async printPaymentReceipt(data) {
        const builder = ReceiptTemplates.paymentReceipt(data);
        return this.print(builder);
    },

    /**
     * Imprimir resumen de préstamo
     */
    async printLoanSummary(data) {
        const builder = ReceiptTemplates.loanSummary(data);
        return this.print(builder);
    },

    /**
     * Imprimir cierre de ruta
     */
    async printRouteClosing(data) {
        const builder = ReceiptTemplates.routeClosing(data);
        return this.print(builder);
    },

    /**
     * Test de impresión
     */
    async printTest() {
        const builder = new ESCPOSBuilder();
        builder
            .init()
            .alignCenter()
            .doubleSize()
            .line('RenKredit')
            .normalSize()
            .line('Test de Impresión')
            .separator()
            .alignLeft()
            .line('Este es un test de la')
            .line('impresora térmica.')
            .separator()
            .leftRight('Izquierda', 'Derecha')
            .feed(1)
            .alignCenter()
            .qrCode('https://renkredit.renace.tech', 6)
            .feed(1)
            .line('Escanea el QR')
            .feed(3)
            .cut();

        return this.print(builder);
    },

    // Exponer clases para uso avanzado
    ESCPOSBuilder,
    ReceiptTemplates,
    ESCPOS
};

export default PrintingService;
export { ESCPOSBuilder, ReceiptTemplates, ESCPOS };
