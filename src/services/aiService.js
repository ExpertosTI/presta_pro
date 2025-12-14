
export const sendMessageToAI = async (chatHistory, userMessage, systemInstruction, apiKey) => {
    const effectiveKey = apiKey;
    if (!effectiveKey) {
        throw new Error('API Key missing');
    }

    // Modelo Gemini 1.5 Flash (estable, disponible en v1beta)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${effectiveKey}`;

    // Construir el contenido de la conversación: siempre reinyectar instrucciones + resumen de datos
    const historyContents = chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    const finalContents = [
        ...historyContents,
        {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nConsulta del usuario: ${userMessage}` }],
        },
    ];

    const payload = {
        contents: finalContents,
    };

    let responseData = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Gemini API Error Body:', errorBody);

                if (response.status === 429) {
                    const delay = Math.pow(2, attempts) * 1000;
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status} - Details: ${errorBody}`);
            }

            responseData = await response.json();
            break;

        } catch (error) {
            console.error("Error fetching AI response:", error);
            throw error;
        }
    }

    // If we exhausted all retries without success, throw rate limit error
    if (!responseData) {
        throw new Error('RATE_LIMIT: La cuota de IA está agotada. Espera 1 minuto e intenta de nuevo.');
    }

    const candidate = responseData?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || 'Lo siento, no pude obtener una respuesta del modelo.';

    return text;
};

export const generateLoanContract = async (loan, client, companyName, apiKey) => {
    const effectiveKey = apiKey;
    if (!effectiveKey) throw new Error('API Key missing');

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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${effectiveKey}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            console.error('Gemini contract API error:', response.status, body);

            if (response.status === 429) {
                const err = new Error('RATE_LIMIT');
                err.status = 429;
                throw err;
            }

            if (response.status === 401 || response.status === 403) {
                const err = new Error('INVALID_API_KEY');
                err.status = response.status;
                throw err;
            }

            const err = new Error('CONTRACT_HTTP_ERROR');
            err.status = response.status;
            throw err;
        }

        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Error generando contrato.";
    } catch (e) {
        console.error('generateLoanContract error:', e);
        throw e;
    }
};

export const generateClientDocument = async (docType, client, loan, companyName, apiKey) => {
    const effectiveKey = apiKey;
    if (!effectiveKey) throw new Error('API Key missing');

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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${effectiveKey}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Error generating client document');

        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Error generando documento.';
    } catch (e) {
        console.error(e);
        throw e;
    }
};
