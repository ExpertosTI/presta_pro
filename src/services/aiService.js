/**
 * AI Service - Presta Pro
 * Uses official @google/genai SDK per Google documentation
 * Model: gemini-2.5-flash
 */

import { GoogleGenAI } from "@google/genai";

// Cache del cliente para evitar recrearlo
let aiClient = null;
const MODEL = "gemini-2.5-flash";

const getClient = (apiKey) => {
    if (!apiKey) {
        throw new Error('API Key missing');
    }
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
};

export const sendMessageToAI = async (chatHistory, userMessage, systemInstruction, apiKey) => {
    const client = getClient(apiKey);

    // Construir historial de conversación
    const history = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    // Agregar instrucciones del sistema al mensaje
    const fullMessage = `${systemInstruction}\n\nConsulta del usuario: ${userMessage}`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await client.models.generateContent({
                model: MODEL,
                contents: [
                    ...history,
                    { role: 'user', parts: [{ text: fullMessage }] }
                ],
            });

            return response.text || 'Lo siento, no pude obtener una respuesta del modelo.';

        } catch (error) {
            console.error('Gemini API Error:', error);

            // Check for rate limit
            if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                const delay = Math.pow(2, attempts) * 1000;
                console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempts++;
                continue;
            }

            throw error;
        }
    }

    throw new Error('QUOTA_EXCEEDED: El asistente IA está ocupado. Por favor espera 1-2 minutos y vuelve a intentar. 💡 Tip: escribe mensajes más cortos para ahorrar cuota.');
};

export const generateLoanContract = async (loan, client, companyName, apiKey) => {
    console.log('[generateContract] Starting with:', { loan: loan?.id, client: client?.name, company: companyName });

    const ai = getClient(apiKey);

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
      
      Redacta el contrato de manera profesional, listo para imprimir y firmar.
    `;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            console.log(`[generateContract] Attempt ${attempts + 1}/${maxAttempts}`);

            const response = await ai.models.generateContent({
                model: MODEL,
                contents: prompt,
            });

            const text = response.text;
            console.log('[generateContract] Success, length:', text?.length || 0);
            return text || "Error generando contrato.";

        } catch (e) {
            console.error('[generateContract] Error:', e.message || e);

            // Check for rate limit
            if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED')) {
                const delay = Math.pow(2, attempts) * 1000;
                console.warn(`[generateContract] Rate limit hit. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempts++;
                continue;
            }

            const err = new Error('CONTRACT_GENERATION_ERROR: ' + (e.message || 'Error desconocido'));
            err.status = e.status || 500;
            throw err;
        }
    }

    // All retries exhausted
    const err = new Error('RATE_LIMIT: El servicio de IA está ocupado. Intenta de nuevo en 1-2 minutos.');
    err.status = 429;
    throw err;
};

export const generateClientDocument = async (docType, client, loan, companyName, apiKey) => {
    const ai = getClient(apiKey);

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
        instrucciones = `Redacta un pagaré simple en español, en texto plano, donde ${name} reconoce una deuda con ${companyName}.
Incluye el monto adeudado (usa ${loanAmount ?? '_____'} si está disponible), plazo y forma de pago (usa ${loanTerm ?? '___'} ${loanFrequency ?? 'cuotas'} si está disponible), Cédula/ID del deudor (${idNumber}), y espacio para lugar, fecha y firmas.
No uses formato markdown ni encabezados, solo texto continuo con saltos de línea.`;
    } else if (docType === 'CARTA_COBRO') {
        tipoDocumento = 'CARTA DE COBRO';
        instrucciones = `Redacta una carta de cobro amable pero firme en español para el cliente ${name} (Cédula/ID: ${idNumber}, Dirección: ${address}).
Menciona que tiene cuotas pendientes con la financiera ${companyName}. Si hay datos de préstamo, puedes mencionar un monto aproximado (usa ${loanAmount ?? '_____'}), sin inventar detalles que no estén en los datos.
Incluye saludo, cuerpo del mensaje y despedida con el nombre de la empresa. Usa solo texto plano.`;
    } else if (docType === 'OTRO') {
        tipoDocumento = 'DOCUMENTO PERSONALIZADO';
        instrucciones = `Redacta un documento simple en español para uso interno de la financiera ${companyName} sobre el cliente ${name}.
Incluye un breve resumen del cliente (Cédula/ID: ${idNumber}, Dirección: ${address}) y espacio para notas o condiciones especiales.
Usa texto plano, frases cortas y deja líneas en blanco donde se puedan escribir datos a mano.`;
    } else {
        tipoDocumento = 'CONTRATO DE PRÉSTAMO (SIMPLE)';
        instrucciones = `Redacta un contrato de préstamo SIMPLE en español, en texto plano, entre ${companyName} (prestamista) y ${name} (prestatario, Cédula/ID: ${idNumber}, Dirección: ${address}).
Usa como referencia, si existe, estos datos del préstamo: monto ${loanAmount ?? '_____'}, tasa ${loanRate ?? '___'}%, plazo ${loanTerm ?? '___'} ${loanFrequency ?? 'cuotas'} y fecha de inicio ${loanStartDate ?? '____-__-__'}.
Incluye cláusulas básicas de reconocimiento de deuda, forma de pago, mora e intereses, y espacio para firmas de ambas partes. Solo texto plano con saltos de línea.`;
    }

    const header = `Eres un asistente legal que redacta documentos simples para una financiera de préstamos.

Tipo de documento a generar: ${tipoDocumento}

Datos del cliente:
- Nombre: ${name}
- Cédula/ID: ${idNumber}
- Dirección: ${address}`;

    const loanSection = hasLoan
        ? `

Datos del préstamo relacionados (si aplican):
- Monto: ${loanAmount}
- Tasa: ${loanRate}%
- Plazo: ${loanTerm} ${loanFrequency}
- Fecha inicio: ${loanStartDate}`
        : '';

    const prompt = `${header}${loanSection}

Instrucciones específicas:
${instrucciones}

Devuelve únicamente el texto del documento listo para imprimir.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
        });

        return response.text || 'Error generando documento.';
    } catch (e) {
        console.error(e);
        throw e;
    }
};
