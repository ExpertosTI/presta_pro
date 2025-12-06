
export const sendMessageToAI = async (chatHistory, userMessage, systemInstruction, apiKey) => {
    const effectiveKey = apiKey;
    if (!effectiveKey) {
        throw new Error('API Key missing');
    }

    // Modelo Gemini 2.5 Flash (Google AI Studio)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;

    // Construir el contenido de la conversación
    let finalContents = [];

    // Estrategia: Prepend instrucciones del sistema al primer mensaje para evitar errores 400 con systemInstruction field
    if (chatHistory.length === 0) {
        finalContents.push({
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nConsulta del usuario: ${userMessage}` }]
        });
    } else {
        // En historial, simplemente añadimos, confiando en el contexto previo.
        finalContents = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        // Añadir el mensaje actual
        finalContents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
    }

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
      PRESTATARIO: ${client.name} (Cédula/ID: ${client.cedula || 'N/A'}, Dirección: ${client.address || 'N/A'})
      
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Error generating contract');

        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Error generando contrato.";
    } catch (e) {
        console.error(e);
        throw e;
    }
};
