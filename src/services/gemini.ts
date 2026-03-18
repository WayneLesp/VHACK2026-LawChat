import { GoogleGenAI, Type, Modality } from "@google/genai";

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is missing. Please check your environment configuration.');
  }
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const getLanguageName = (code: string) => {
  const names: Record<string, string> = {
    en: 'English',
    ms: 'Bahasa Malaysia (Standard)',
    id: 'Bahasa Indonesia',
    tl: 'Tagalog',
    kel: 'Dialek Kelantan (Kelantanese Malay)',
    swk: 'Dialek Sarawak (Sarawakian Malay)'
  };
  return names[code] || 'English';
};

export const explainDocument = async (base64Image: string, mimeType: string = 'image/jpeg', language: string = 'en') => {
  const langName = getLanguageName(language);
  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `You are LawChat's Senior Legal Document Analyst. Your task is to help the user understand complex government letters, policy documents, or legal forms.
            
            Analyze this document deeply, extract key information, and explain it in plain, accessible language.
            
            STRICTLY return the result in the following JSON format (using the target language: ${langName}):
            {
              "detectedLanguage": "string",
              "summary": "【Summary】: 2-3 sentences summarizing the core purpose of this document.",
              "keyPoints": "【Key Points】: List the most important terms, dates, amounts, or requirements (use markdown list).",
              "actionSuggestions": "【Action Suggestions】: Inform the user what they need to do next (e.g., pay by XX date, contact XX department) (use markdown list).",
              "terminology": "【Terminology】: Convert legal or official technical terms from the document into language that ordinary people can understand (use markdown list).",
              "fullMarkdown": "string (A complete markdown text containing all the sections above)"
            }
            
            Guidelines:
            - Maintain a professional, objective, yet empathetic tone.
            - If the document is blurry or information is incomplete, clearly inform the user in the summary.
            - Ensure all explanations are culturally and legally relevant to the Malaysian context.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  return JSON.parse(response.text || '{}');
};

export const chatWithDocument = async (
  query: string, 
  base64Image: string, 
  mimeType: string = 'image/jpeg',
  history: {role: 'user' | 'model', parts: {text: string}[]}[],
  language: string = 'en',
  readingMode: boolean = false
) => {
  const langName = getLanguageName(language);
  const oralInstructions = readingMode ? `
    - ORAL-FRIENDLY: Use clear, conversational sentences.
    - STRUCTURE: Use phrases like "First of all," "Regarding...", and "In summary."
    - TONE: Calm, reassuring, and professional.
    - NO MARKDOWN OVERLOAD: Use simple lists.
  ` : '';

  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `You are LawChat's Senior Legal Document Analyst. The user is asking questions about this document they previously uploaded.
            
            Provide in-depth Q&A support based on the document content and the previous conversation history.
            
            Guidelines:
            - Maintain a professional, objective, yet empathetic tone.
            - Answer ONLY based on the document content. If information is not in the document, state so honestly.
            - Use the target language: ${langName}.
            ${oralInstructions}
            - Always include this disclaimer at the end of your response: "This analysis is for informational purposes only and does not constitute legal advice. Please consult a professional lawyer if needed." (Translated into ${langName})`,
          },
        ],
      },
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: query }] }
    ],
  });

  const response = await model;
  return response.text;
};

export const askLaw = async (query: string, language: string = 'en', readingMode: boolean = false) => {
  const langName = getLanguageName(language);
  
  const oralInstructions = readingMode ? `
    - ORAL-FRIENDLY: Use clear, conversational sentences. Avoid complex nested clauses.
    - STRUCTURE: Use phrases like "First of all," "Regarding your point about...", and "In summary."
    - TONE: Calm, reassuring, and professional.
    - EMPHASIS: When mentioning a specific Section or Act, briefly highlight its importance.
    - NO MARKDOWN OVERLOAD: Use simple bullet points or numbered lists. No complex tables or heavy headers.
  ` : '';

  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      systemInstruction: `You are LawChat, a legal expert assistant specializing in Malaysian law. 
      - Grounding: Source all answers from official national statutes and government documents. 
      - Accuracy: Do not hallucinate. If unsure, say "I cannot find official information on this."
      - Dialect-Aware: You must handle queries in local dialects (e.g., Kelantan, Sarawak, Tagalog dialects, Indonesian regional dialects).
      - Persona: You are helpful, inclusive, and simplify complex laws for the common person.
      - Language Persistence: You MUST respond strictly in the requested language/dialect: ${langName}.
      - Simplification: Use clear, accessible language (plain language).
      - Summarization: Always provide a summary of 3-5 actionable bullet points at the end of your response.
      ${oralInstructions}`,
    },
  });

  const response = await model;
  return response.text;
};

export const analyzeContract = async (base64Image: string, mimeType: string = 'image/jpeg', language: string = 'en') => {
  const langName = getLanguageName(language);
  const model = ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `Analyze this contract for a common person in Malaysia.
            - Flag any unfair or illegal clauses under national law (e.g., Consumer Protection Act, Employment Act).
            - Simplify the legal jargon to a 5th-grade level.
            - Provide a summary of the user's rights in 3-5 bullet points.
            - Respond STRICTLY in the target language: ${langName}.
            
            Respond in JSON format:
            {
              "flags": [{"clause": "string", "reason": "string", "isIllegal": boolean}],
              "rightsSummary": "string (markdown summary, simplified, 3-5 bullet points)"
            }`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const response = await model;
  return JSON.parse(response.text || '{}');
};
