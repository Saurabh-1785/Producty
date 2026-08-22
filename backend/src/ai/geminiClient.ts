/**
 * ApeAI — Gemini AI Client
 *
 * Centralized client for interacting with Google Gemini API.
 * Mirrors Python ai/gemini_client.py.
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import settings from '../config';

const MODEL_MAPPING: Record<string, string> = {
  flash: 'gemini-2.5-flash-lite',
  pro: 'gemini-2.5-flash-lite',
  embedding: 'text-embedding-004',
};

class GeminiClient {
  private static _instance: GeminiClient;
  private _genAI: GoogleGenerativeAI | null = null;

  static getInstance(): GeminiClient {
    if (!GeminiClient._instance) {
      GeminiClient._instance = new GeminiClient();
    }
    return GeminiClient._instance;
  }

  private configure(): GoogleGenerativeAI {
    if (this._genAI) return this._genAI;

    if (!settings.googleApiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment');
    }

    this._genAI = new GoogleGenerativeAI(settings.googleApiKey);
    console.info('✅ Gemini AI SDK configured');
    return this._genAI;
  }

  getModel(modelType: 'flash' | 'pro' = 'flash', jsonMode = false): GenerativeModel {
    const genAI = this.configure();
    const modelName = MODEL_MAPPING[modelType] ?? MODEL_MAPPING['flash'];

    const generationConfig: GenerationConfig | undefined = jsonMode
      ? { responseMimeType: 'application/json' }
      : undefined;

    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
    });
  }

  async embedText(text: string): Promise<number[]> {
    const genAI = this.configure();
    const model = genAI.getGenerativeModel({ model: MODEL_MAPPING['embedding'] });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}

export const geminiClient = GeminiClient.getInstance();
