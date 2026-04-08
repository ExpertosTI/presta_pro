/**
 * AI Service - Presta Pro
 * Calls server-side proxy — API key never exposed to the client.
 */

import api from './axiosInstance';

export const sendMessageToAI = async (chatHistory, userMessage, systemInstruction) => {
    const response = await api.post('/ai/chat', {
        history: chatHistory.slice(-20),
        message: userMessage,
        systemInstruction,
    });
    return response.text || 'No pude obtener una respuesta.';
};

export const generateLoanContract = async (loan, client, companyName) => {
    const prompt = `
Genera un contrato de préstamo legal y formal en formato texto plano (sin markdown, sin negritas) para la siguiente transacción:

PRESTAMISTA: ${companyName}
PRESTATARIO: ${client.name} (Cédula/ID: ${client.idNumber || 'N/A'}, Dirección: ${client.address || 'N/A'})

DETALLES DEL PRÉSTAMO:
- Monto Principal: ${loan.amount}
- Tasa de Interés: ${loan.rate}%
- Plazo: ${loan.term} ${loan.frequency}
- Fecha de Inicio: ${loan.startDate}

El contrato debe incluir cláusulas estándar de:
1. Reconocimiento de deuda.
2. Compromiso de pago.
3. Intereses y mora (si aplica).
4. Garantías (si aplica, mencionar pagaré notarial).
5. Jurisdicción legal.

Redacta el contrato de manera profesional, listo para imprimir y firmar.`;

    const response = await api.post('/ai/document', { prompt });
    return response.text || 'Error generando contrato.';
};

export const generateClientDocument = async (docType, client, loan, companyName) => {
    const name = client?.name || 'CLIENTE';
    const idNumber = client?.idNumber || 'N/A';
    const address = client?.address || 'N/A';

    const hasLoan = !!loan;
    const loanAmount = hasLoan ? loan.amount : null;
    const loanRate = hasLoan ? loan.rate : null;
    const loanTerm = hasLoan ? loan.term : null;
    const loanFrequency = hasLoan ? loan.frequency : null;
    const loanStartDate = hasLoan ? loan.startDate : null;

    let tipoDocumento = '';
    let instrucciones = '';

    if (docType === 'PAGARE_SIMPLE') {
        tipoDocumento = 'PAGARÉ SIMPLE';
        instrucciones = `Redacta un pagaré simple en español, en texto plano, donde ${name} reconoce una deuda con ${companyName}. Incluye el monto adeudado (usa ${loanAmount ?? '_____'} si está disponible), plazo y forma de pago (usa ${loanTerm ?? '___'} ${loanFrequency ?? 'cuotas'} si está disponible), Cédula/ID del deudor (${idNumber}), y espacio para lugar, fecha y firmas. No uses formato markdown ni encabezados, solo texto continuo con saltos de línea.`;
    } else if (docType === 'CARTA_COBRO') {
        tipoDocumento = 'CARTA DE COBRO';
        instrucciones = `Redacta una carta de cobro amable pero firme en español para el cliente ${name} (Cédula/ID: ${idNumber}, Dirección: ${address}). Menciona que tiene cuotas pendientes con la financiera ${companyName}. Incluye saludo, cuerpo del mensaje y despedida con el nombre de la empresa. Usa solo texto plano.`;
    } else if (docType === 'OTRO') {
        tipoDocumento = 'DOCUMENTO PERSONALIZADO';
        instrucciones = `Redacta un documento simple en español para uso interno de la financiera ${companyName} sobre el cliente ${name}. Incluye un breve resumen del cliente (Cédula/ID: ${idNumber}, Dirección: ${address}) y espacio para notas o condiciones especiales. Usa texto plano.`;
    } else {
        tipoDocumento = 'CONTRATO DE PRÉSTAMO (SIMPLE)';
        instrucciones = `Redacta un contrato de préstamo SIMPLE en español, en texto plano, entre ${companyName} (prestamista) y ${name} (prestatario, Cédula/ID: ${idNumber}, Dirección: ${address}). Usa como referencia estos datos del préstamo: monto ${loanAmount ?? '_____'}, tasa ${loanRate ?? '___'}%, plazo ${loanTerm ?? '___'} ${loanFrequency ?? 'cuotas'} y fecha de inicio ${loanStartDate ?? '____-__-__'}. Incluye cláusulas básicas de reconocimiento de deuda, forma de pago, mora e intereses, y espacio para firmas de ambas partes. Solo texto plano.`;
    }

    const header = `Eres un asistente legal que redacta documentos simples para una financiera de préstamos.\n\nTipo de documento: ${tipoDocumento}\n\nDatos del cliente:\n- Nombre: ${name}\n- Cédula/ID: ${idNumber}\n- Dirección: ${address}`;

    const loanSection = hasLoan
        ? `\n\nDatos del préstamo:\n- Monto: ${loanAmount}\n- Tasa: ${loanRate}%\n- Plazo: ${loanTerm} ${loanFrequency}\n- Fecha inicio: ${loanStartDate}`
        : '';

    const prompt = `${header}${loanSection}\n\nInstrucciones:\n${instrucciones}\n\nDevuelve únicamente el texto del documento listo para imprimir.`;

    const response = await api.post('/ai/document', { prompt });
    return response.text || 'Error generando documento.';
};
