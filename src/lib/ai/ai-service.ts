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

    throw new Error('All Gemini model candidates failed or timed out. Please verify API key.');
  }

  async extractArtisanProfile(transcript: string, language?: string): Promise<ArtisanProfileExtraction> {
    const systemInstruction = `You are an expert multilingual information extraction assistant specializing in Indian handicrafts and artisan profiling.
Your job is to extract structured artisan profile information from a speech transcript in any Indian language (such as Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, etc.).

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY present in the transcript.
2. DO NOT invent, assume, or hallucinate any information.
3. If a field is not mentioned in the transcript, set it to null.
4. Understand regional terms (e.g., in Tamil: "என் பெயர்", "நெசவு", "பட்டுப் புடவை"; in Hindi: "मेरा नाम", "मिट्टी के बर्तन", "हथकरघा").
5. Return ONLY valid JSON with no additional text or markdown.

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

    const prompt = `Language context: ${language || 'Indian regional'}\nExtract artisan profile information from this transcript. Only extract what is explicitly stated:\n\n"${transcript}"`;

    const response = await this.callGemini(prompt, systemInstruction);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return artisanProfileExtractionSchema.parse(parsed);
  }

  async extractProductDetails(transcript: string, additionalText?: string, language?: string): Promise<ProductExtraction> {
    const systemInstruction = `You are an expert multilingual product information extraction assistant for handcrafted products.
Your job is to extract structured product details from an artisan's speech transcript in any Indian language.

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY present in the transcript.
2. DO NOT invent product names, colors, dimensions, or any attribute not mentioned.
3. If a field is not mentioned, set it to null.
4. For quantity, extract the number if mentioned (e.g., in Tamil "பத்து துண்டுகள்" -> 10, in Hindi "पाँच पीस" -> 5).
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
Write compelling, authentic product descriptions that celebrate genuine handmade craftsmanship.

CRITICAL RULES:
1. Base descriptions ONLY on the provided product data and transcript.
2. DO NOT invent certifications, awards, or false attributes not in the data.
3. Highlight the craftsmanship and artisan's skill authentically.
4. If language is specified, craft the title, summary, and highlights appropriately.
5. Return ONLY valid JSON with no additional text or markdown.

Expected JSON format:
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
