const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || "TU_CLAVE_API_GROQ_AQUI";

const SYSTEM_PROMPT = `Eres el cerebro de AhorrAI, un rastreador financiero. Extrae la información de la siguiente transacción reportada por el usuario (puede ser muy informal).

Reglas obligatorias para el JSON:
1. "type": "income", "expense" o "transfer".
2. "amount": número puro del monto total o de origen (obligatorio).
3. "fromAmount" / "toAmount": (Solo para transfer) Los montos exactos de origen y destino. ¡SIN SÍMBOLOS, SOLO NÚMEROS!
4. "currency": moneda principal (USD, Bs o USDT).
5. "fromCurrency" / "toCurrency": (Solo para transfer) Las monedas involucradas.
6. "category": "Transferencia" o categoría normal.
7. "account" / "toAccount": Nombres de las cuentas.
8. "payment_method": "pago móvil" o "normal".

EJEMPLO DE TRANSFERENCIA/CAMBIO:
Entrada: "Cambié 10 dólares por 600 bolos de mi efectivo a mi cuenta vzla"
Salida: {"type": "transfer", "amount": 10, "fromAmount": 10, "fromCurrency": "USD", "toAmount": 600, "toCurrency": "Bs", "category": "Transferencia", "account": "Efectivo $", "toAccount": "Banco Venezuela", "payment_method": "normal"}

Devuelve el JSON puro. No agregues texto.`;

/**
 * Parsea el texto del usuario usando Llama 3 en Groq
 */
export const parseTransactionText = async (textInput, accountNames = []) => {
  const accountsInfo = accountNames.length > 0 
    ? `\nCuentas disponibles del usuario (ELIGE UNA DE ESTAS SIEMPRE): ${accountNames.join(', ')}.`
    : "";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Modelo actualizado y compatible
        messages: [
          { role: "system", content: SYSTEM_PROMPT + accountsInfo },
          { role: "user", content: `Analiza esto: "${textInput}"` }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`Groq API Error: ${data.error.message || 'Error desconocido'}`);
    }

    if (!data.choices || !data.choices[0]) {
        throw new Error("La IA no devolvió opciones de respuesta. Inténtalo de nuevo.");
    }
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq AI Parsing Error:", error);
    throw new Error(`Error en el cerebro de AhorrAI: ${error.message}`);
  }
};

/**
 * Transcribe el audio usando Whisper en Groq
 */
export const transcribeAudio = async (audioUri) => {
  try {
    const formData = new FormData();
    // En React Native, fetch detecta que es un archivo si el objeto tiene uri, type y name
    formData.append("file", {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    });
    formData.append("model", "whisper-large-v3");
    formData.append("language", "es");
    formData.append("response_format", "text");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "multipart/form-data"
      },
      body: formData
    });

    const text = await response.text();
    return text.trim();
  } catch (error) {
    console.error("Groq Transcription Error:", error);
    return `ERROR: ${error.message || 'Error en Groq Whisper'}`;
  }
};
