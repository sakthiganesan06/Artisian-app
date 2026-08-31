// ============================================
// AI Service Abstraction (Google Gemini)
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
  extractArtisanProfile(transcript: string): Promise<ArtisanProfileExtraction>;
  extractProductDetails(transcript: string, additionalText?: string): Promise<ProductExtraction>;
  generateProductDescription(params: {
    artisanName: string;
    artisanCraft?: string;
    artisanLocation?: string;
    productData: ProductExtraction;
    transcript: string;
    additionalText?: string;
  }): Promise<ProductDescription>;
}

// ============================================
// Google Gemini Implementation
// ============================================

class GeminiAIService implements AIService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is not set. AI features require a valid Google Gemini API key.'
      );
    }
    this.apiKey = apiKey;
  }

  private async callGemini(prompt: string, systemInstruction: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = this.apiKey.trim();
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (err) {
        console.warn(`[Gemini model ${modelName} failed, trying next candidate]:`, err instanceof Error ? err.message : err);
      }
    }

    throw new Error('All Gemini model candidates failed. Please verify API key.');
  }

  async extractArtisanProfile(transcript: string): Promise<ArtisanProfileExtraction> {
    const systemInstruction = `You are an information extraction assistant. 
Your job is to extract structured artisan profile information from a speech transcript.

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY present in the transcript.
2. DO NOT invent, assume, or hallucinate any information.
3. If a field is not mentioned in the transcript, set it to null.
4. Return ONLY valid JSON with no additional text or markdown.
5. The transcript may be in any Indian language — extract the information regardless.

Expected JSON format:
{
  "name": string or null,
  "location": string or null,
  "district": string or null,
  "state": string or null,
  "craftType": string or null,
  "experience": string or null,
  "artisanStory": string or null
}`;

    const prompt = `Extract artisan profile information from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string): Promise<ProductExtraction> {
    const systemInstruction = `You are a product information extraction assistant.
Your job is to extract structured product details from an artisan's speech transcript.

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY present in the transcript.
2. DO NOT invent product names, colors, dimensions, or any attribute not mentioned.
3. If a field is not mentioned, set it to null.
4. For quantity, extract the number if mentioned (e.g., "I have five pieces" → 5).
5. Return ONLY valid JSON with no additional text or markdown.

Expected JSON format:
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

    let prompt = `Extract product details from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;
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
  }): Promise<ProductDescription> {
    const systemInstruction = `You are a product description writer for an artisan marketplace.
Write compelling, authentic product descriptions that help sell handcrafted products.

CRITICAL RULES:
1. Base descriptions ONLY on the provided product data and transcript.
2. DO NOT invent certifications, awards, quality claims, sustainability claims, or origin claims unless explicitly provided.
3. DO NOT fabricate dimensions, materials, colors, or any attributes not in the data.
4. Highlight the craftsmanship and artisan's skill authentically.
5. Return ONLY valid JSON with no additional text or markdown.

Expected JSON format:
{
  "title": "A compelling product title",
  "shortDescription": "2-3 sentence summary",
  "longDescription": "Detailed 2-3 paragraph description",
  "highlights": ["highlight 1", "highlight 2", ...]
}`;

    const productInfo = JSON.stringify(params.productData, null, 2);
    const prompt = `Generate a product description based on this information:

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
// Factory
// ============================================

let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (aiServiceInstance) return aiServiceInstance;

  try {
    aiServiceInstance = new GeminiAIService();
    return aiServiceInstance;
  } catch (error) {
    throw error;
  }
}

// Check if AI is configured (useful for UI to show/hide features)
export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
