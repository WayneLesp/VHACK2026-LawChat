import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LanguageCode = 'en' | 'ms' | 'id' | 'tl' | 'kel' | 'swk';

type DocumentChatMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY in the server environment.');
  }
  return key;
};

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

const getLanguageName = (code: LanguageCode | string) => {
  const names: Record<string, string> = {
    en: 'English',
    ms: 'Bahasa Malaysia (Standard)',
    id: 'Bahasa Indonesia',
    tl: 'Tagalog',
    kel: 'Dialek Kelantan (Kelantanese Malay)',
    swk: 'Dialek Sarawak (Sarawakian Malay)',
  };

  return names[code] || 'English';
};

const createOralInstructions = (readingMode: boolean, variant: 'law' | 'document') => {
  if (!readingMode) return '';

  if (variant === 'law') {
    return `
      - ORAL-FRIENDLY: Use clear, conversational sentences. Avoid complex nested clauses.
      - STRUCTURE: Use phrases like "First of all," "Regarding your point about...", and "In summary."
      - TONE: Calm, reassuring, and professional.
      - EMPHASIS: When mentioning a specific Section or Act, briefly highlight its importance.
      - NO MARKDOWN OVERLOAD: Use simple bullet points or numbered lists. No complex tables or heavy headers.
    `;
  }

  return `
    - ORAL-FRIENDLY: Use clear, conversational sentences.
    - STRUCTURE: Use phrases like "First of all," "Regarding...", and "In summary."
    - TONE: Calm, reassuring, and professional.
    - NO MARKDOWN OVERLOAD: Use simple lists.
  `;
};

async function explainDocument(base64Image: string, mimeType: string = 'image/jpeg', language: LanguageCode | string = 'en') {
  const langName = getLanguageName(language);
  const response = await getAiClient().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
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
      responseMimeType: 'application/json',
    },
  });

  return JSON.parse(response.text || '{}');
}

async function chatWithDocument(
  query: string,
  base64Image: string,
  mimeType: string = 'image/jpeg',
  history: DocumentChatMessage[] = [],
  language: LanguageCode | string = 'en',
  readingMode: boolean = false,
) {
  const langName = getLanguageName(language);
  const oralInstructions = createOralInstructions(readingMode, 'document');

  const response = await getAiClient().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
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
      ...history.map((entry) => ({ role: entry.role, parts: entry.parts })),
      { role: 'user', parts: [{ text: query }] },
    ],
  });

  return response.text;
}

async function askLaw(query: string, language: LanguageCode | string = 'en', readingMode: boolean = false) {
  const langName = getLanguageName(language);
  const oralInstructions = createOralInstructions(readingMode, 'law');

  const response = await getAiClient().models.generateContent({
    model: 'gemini-3-flash-preview',
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

  return response.text;
}

async function analyzeContract(base64Image: string, mimeType: string = 'image/jpeg', language: LanguageCode | string = 'en') {
  const langName = getLanguageName(language);
  const response = await getAiClient().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
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
      responseMimeType: 'application/json',
    },
  });

  return JSON.parse(response.text || '{}');
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/ai/law-chat', async (req, res) => {
    const { query, language = 'en', readingMode = false } = req.body ?? {};

    if (!isNonEmptyString(query)) {
      return res.status(400).json({ error: 'query is required' });
    }

    try {
      const response = await askLaw(query, language, Boolean(readingMode));
      return res.json({ response: response || '' });
    } catch (error) {
      console.error('law-chat error:', error);
      return res.status(500).json({ error: 'Failed to process law chat request.' });
    }
  });

  app.post('/api/ai/document/explain', async (req, res) => {
    const { base64Image, mimeType = 'image/jpeg', language = 'en' } = req.body ?? {};

    if (!isNonEmptyString(base64Image)) {
      return res.status(400).json({ error: 'base64Image is required' });
    }

    try {
      const response = await explainDocument(base64Image, mimeType, language);
      return res.json(response);
    } catch (error) {
      console.error('document explain error:', error);
      return res.status(500).json({ error: 'Failed to analyze document.' });
    }
  });

  app.post('/api/ai/document/chat', async (req, res) => {
    const {
      query,
      base64Image,
      mimeType = 'image/jpeg',
      history = [],
      language = 'en',
      readingMode = false,
    } = req.body ?? {};

    if (!isNonEmptyString(query) || !isNonEmptyString(base64Image)) {
      return res.status(400).json({ error: 'query and base64Image are required' });
    }

    try {
      const response = await chatWithDocument(
        query,
        base64Image,
        mimeType,
        Array.isArray(history) ? history : [],
        language,
        Boolean(readingMode),
      );
      return res.json({ response: response || '' });
    } catch (error) {
      console.error('document chat error:', error);
      return res.status(500).json({ error: 'Failed to answer document question.' });
    }
  });

  app.post('/api/ai/contract/analyze', async (req, res) => {
    const { base64Image, mimeType = 'image/jpeg', language = 'en' } = req.body ?? {};

    if (!isNonEmptyString(base64Image)) {
      return res.status(400).json({ error: 'base64Image is required' });
    }

    try {
      const response = await analyzeContract(base64Image, mimeType, language);
      return res.json(response);
    } catch (error) {
      console.error('contract analyze error:', error);
      return res.status(500).json({ error: 'Failed to analyze contract.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
