export interface DocumentAnalysisResult {
  detectedLanguage?: string;
  summary?: string;
  keyPoints?: string;
  actionSuggestions?: string;
  terminology?: string;
  fullMarkdown?: string;
}

export interface ContractAnalysisFlag {
  clause: string;
  reason: string;
  isIllegal: boolean;
}

export interface ContractAnalysisResult {
  flags?: ContractAnalysisFlag[];
  rightsSummary?: string;
}

export interface DocumentChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const postJson = async <T>(url: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === 'string') {
        errorMessage = errorBody.error;
      }
    } catch {
      // Ignore JSON parsing issues and use the generic error above.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
};

export const explainDocument = async (
  base64Image: string,
  mimeType: string = 'image/jpeg',
  language: string = 'en',
): Promise<DocumentAnalysisResult> => {
  return postJson<DocumentAnalysisResult>('/api/ai/document/explain', {
    base64Image,
    mimeType,
    language,
  });
};

export const chatWithDocument = async (
  query: string,
  base64Image: string,
  mimeType: string = 'image/jpeg',
  history: DocumentChatMessage[],
  language: string = 'en',
  readingMode: boolean = false,
): Promise<string> => {
  const data = await postJson<{ response: string }>('/api/ai/document/chat', {
    query,
    base64Image,
    mimeType,
    history,
    language,
    readingMode,
  });

  return data.response;
};

export const askLaw = async (
  query: string,
  language: string = 'en',
  readingMode: boolean = false,
): Promise<string> => {
  const data = await postJson<{ response: string }>('/api/ai/law-chat', {
    query,
    language,
    readingMode,
  });

  return data.response;
};

export const analyzeContract = async (
  base64Image: string,
  mimeType: string = 'image/jpeg',
  language: string = 'en',
): Promise<ContractAnalysisResult> => {
  return postJson<ContractAnalysisResult>('/api/ai/contract/analyze', {
    base64Image,
    mimeType,
    language,
  });
};
