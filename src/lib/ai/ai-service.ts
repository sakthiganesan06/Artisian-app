// ============================================
// AI Service Abstraction (Groq Llama 3.3 & Google Gemini)
// Used for: profile extraction, product extraction, description generation
// NOT used for: pricing, inventory, orders (those are deterministic)
// ============================================

import { z } from 'zod';

// --- Extracted Profile Schema ---
export const artisanProfileExtractionSchema = z.object({
  name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  craftType: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  artisanStory: z.string().nullable().optional(),
});

export type ArtisanProfileExtraction = z.infer<typeof artisanProfileExtractionSchema>;

// --- Extracted Product Schema ---
export const productExtractionSchema = z.object({
  productName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  productionTime: z.string().nullable().optional(),
  craftTechnique: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  otherAttributes: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ProductExtraction = z.infer<typeof productExtractionSchema>;

// --- Generated Description Schema ---
export const productDescriptionSchema = z.object({
  title: z.string(),
  shortDescription: z.string(),
  longDescription: z.string(),
  highlights: z.array(z.string()),
});

export type ProductDescription = z.infer<typeof productDescriptionSchema>;

// ============================================
// AI Service Interface
// ============================================

export interface AIService {
  extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction>;
  extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction>;
  generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription>;
}

// ============================================
// 1. Groq AI Implementation (Ultra-Fast LPU Inference)
// Models: llama-3.3-70b-versatile, llama-3.1-8b-instant
// ============================================

export class GroqAIService implements AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY environment variable is not set.');
    }
    this.apiKey = key.trim();
  }

  private async callGroq(prompt: string, systemInstruction: string): Promise<string> {
    const modelsToTry = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ];

    for (const modelName of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return content.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Groq model ${modelName} returned ${res.status}]:`, errData);
        }
      } catch (err) {
        console.warn(`[Groq model ${modelName} error]:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error('All Groq model candidates failed or timed out.');
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    const systemInstruction = `You are an expert multilingual information extraction assistant specializing in Indian handicrafts and artisan profiling.
Extract structured artisan profile information from a speech transcript in any Indian language. Return valid JSON only.
Expected JSON:
{
  "name": string or null,
  "location": string or null,
  "district": string or null,
  "state": string or null,
  "craftType": string or null,
  "experience": string or null,
  "artisanStory": string or null
}`;

    const prompt = `Language context: ${language || 'Indian regional'}\nExtract artisan profile from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    const systemInstruction = `You are an expert multilingual product information extraction assistant for handcrafted artisan products across India.
Extract structured product details from a speech transcript in any Indian language. Return valid JSON only.
Expected JSON:
{
  "productName": string or null,
  "category": string or null,
  "material": string or null,
  "quantity": number or null,
  "productionTime": string or null,
  "craftTechnique": string or null,
  "dimensions": string or null,
  "color": string or null,
  "weight": string or null,
  "otherAttributes": object or null
}`;

    let prompt = `Language context: ${language || 'Indian regional'}\nExtract product details from this transcript:\n\n"${transcript}"`;
    if (additionalText) {
      prompt += `\n\nAdditional text:\n"${additionalText}"`;
    }

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productExtractionSchema.parse(parsed);
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    const systemInstruction = `You are a professional product description writer for an authentic Indian artisan marketplace.
Write compelling, authentic product descriptions celebrating handmade craftsmanship. Return valid JSON only.
Expected JSON:
{
  "title": "Compelling product title",
  "shortDescription": "2-3 sentence summary",
  "longDescription": "Detailed 2-3 paragraph description",
  "highlights": ["highlight 1", "highlight 2", ...]
}`;

    const productInfo = JSON.stringify(params.productData, null, 2);
    const prompt = `Language preference: ${params.language || 'en'}
Artisan: ${params.artisanName}${params.artisanCraft ? `, specializing in ${params.artisanCraft}` : ''}${params.artisanLocation ? ` from ${params.artisanLocation}` : ''}
Product data:
${productInfo}
Original transcript: "${params.transcript}"
${params.additionalText ? `Additional info: "${params.additionalText}"` : ''}`;

    const response = await this.callGroq(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productDescriptionSchema.parse(parsed);
  }
}

// ============================================
// 2. Google Gemini Implementation
// ============================================

export class GeminiAIService implements AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.apiKey = key.trim();
  }

  private async callGemini(prompt: string, systemInstruction: string): Promise<string> {
    const apiKey = this.apiKey.trim();
    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-pro-latest'
    ];

    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          }),
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return text.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Gemini model ${modelName} returned ${res.status}]:`, errData);
        }
      } catch (err) {
        console.warn(`[Gemini model ${modelName} failed, trying next candidate]:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error('All Gemini model candidates failed or timed out.');
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    const systemInstruction = `You are an expert multilingual information extraction assistant specializing in Indian handicrafts and artisan profiling.
Your job is to extract structured artisan profile information from a speech transcript in any Indian language. Return valid JSON only.
Expected JSON:
{
  "name": string or null,
  "location": string or null,
  "district": string or null,
  "state": string or null,
  "craftType": string or null,
  "experience": string or null,
  "artisanStory": string or null
}`;

    const prompt = `Language context: ${language || 'Indian regional'}\nExtract artisan profile information from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    const systemInstruction = `You are an expert multilingual product information extraction assistant for handcrafted products.
Your job is to extract structured product details from an artisan's speech transcript in any Indian language. Return valid JSON only.
Expected JSON:
{
  "productName": string or null,
  "category": string or null,
  "material": string or null,
  "quantity": number or null,
  "productionTime": string or null,
  "craftTechnique": string or null,
  "dimensions": string or null,
  "color": string or null,
  "weight": string or null,
  "otherAttributes": object or null
}`;

    let prompt = `Language context: ${language || 'Indian regional'}\nExtract product details from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;
    if (additionalText) {
      prompt += `\n\nAdditional information provided by the artisan:\n"${additionalText}"`;
    }

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productExtractionSchema.parse(parsed);
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    const systemInstruction = `You are a professional product description writer for an authentic Indian artisan marketplace.
Write compelling, authentic product descriptions that celebrate genuine handmade craftsmanship. Return valid JSON only.
Expected JSON:
{
  "title": "A compelling product title",
  "shortDescription": "2-3 sentence summary",
  "longDescription": "Detailed 2-3 paragraph description",
  "highlights": ["highlight 1", "highlight 2", ...]
}`;

    const productInfo = JSON.stringify(params.productData, null, 2);
    const prompt = `Language preference: ${params.language || 'en'}
Generate a product description based on this information:

Artisan: ${params.artisanName}${params.artisanCraft ? `, specializing in ${params.artisanCraft}` : ''}${params.artisanLocation ? ` from ${params.artisanLocation}` : ''}

Product data:
${productInfo}

Original transcript: "${params.transcript}"
${params.additionalText ? `Additional info: "${params.additionalText}"` : ''}

Write a description that is authentic and grounded in the provided data.`;

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return productDescriptionSchema.parse(parsed);
  }
}

// ============================================
// 3. Fallback Multi-Provider AI Service
// Prioritizes Groq if available -> Falls back to Gemini
// ============================================

export class FallbackAIService implements AIService {
  private groqProvider: GroqAIService | null = null;
  private geminiProvider: GeminiAIService | null = null;

  constructor() {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
      try {
        this.groqProvider = new GroqAIService();
      } catch {}
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      try {
        this.geminiProvider = new GeminiAIService();
      } catch {}
    }
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.extractArtisanProfile(transcript, language);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq extraction failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.extractArtisanProfile(transcript, language);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.extractProductDetails(transcript, additionalText, language);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq product extraction failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.extractProductDetails(transcript, additionalText, language);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }

  async generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
    language?: string;
  }): Promise<ProductDescription> {
    if (this.groqProvider) {
      try {
        return await this.groqProvider.generateProductDescription(params);
      } catch (gErr) {
        console.warn('[AI Pipeline] Groq description failed, falling back to Gemini:', gErr);
      }
    }

    if (this.geminiProvider) {
      return await this.geminiProvider.generateProductDescription(params);
    }

    throw new Error('No AI providers configured. Set GROQ_API_KEY or GEMINI_API_KEY.');
  }
}

// ============================================
// Factory
// ============================================

export function getAIService(): AIService {
  return new FallbackAIService();
}

// Check if any AI is configured
export function isAIConfigured(): boolean {
  return !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
}
