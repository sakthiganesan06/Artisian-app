// ============================================
// STT Service Abstraction
// Priority: Sarvam AI (Indian languages) → Groq Whisper (fast) → OpenAI Whisper
// ============================================

export interface TranscriptResult {
  transcript: string;
  language?: string;
  confidence?: number;
  duration?: number;
  provider: string;
}

export interface STTProvider {
  transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult>;
}

// ============================================
// Sarvam AI STT Implementation (Indian Languages)
// Model: saaras:v3 — supports 22 Indian languages + English
// ============================================

class SarvamSTTProvider implements STTProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error('SARVAM_API_KEY environment variable is not set.');
    }
    this.apiKey = apiKey;
  }

  private mapLanguage(code?: string): string {
    const langMap: Record<string, string> = {
      'en': 'en-IN',
      'ta': 'ta-IN',
      'hi': 'hi-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'mr': 'mr-IN',
      'bn': 'bn-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'or': 'od-IN',
    };
    return code && langMap[code] ? langMap[code] : 'hi-IN';
  }

  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    
    const langCode = this.mapLanguage(languageHint);
    formData.append('language_code', langCode);
    formData.append('model', 'saaras:v3');
    formData.append('with_timestamps', 'false');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Sarvam STT] API error (${res.status}):`, errText);
        throw new Error(`Sarvam AI STT API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const transcript = data.transcript || '';

      if (!transcript.trim()) {
        throw new Error('Sarvam AI returned empty transcript');
      }

      return {
        transcript,
        language: data.language_code || languageHint,
        provider: 'sarvam',
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

// ============================================
// Groq Whisper STT Implementation (Fast, Multilingual)
// Model: whisper-large-v3 — supports Indian languages
// ============================================

class GroqWhisperSTTProvider implements STTProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set.');
    }
    this.apiKey = apiKey;
  }

  private mapLanguage(code?: string): string | undefined {
    // Whisper uses ISO 639-1 codes
    const langMap: Record<string, string> = {
      'en': 'en',
      'ta': 'ta',
      'hi': 'hi',
      'te': 'te',
      'kn': 'kn',
      'ml': 'ml',
      'mr': 'mr',
      'bn': 'bn',
      'gu': 'gu',
      'pa': 'pa',
      'ur': 'ur',
      'or': 'or',
      'as': 'as',
      'sa': 'sa',
    };
    return code ? langMap[code] : undefined;
  }

  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');

    const whisperLang = this.mapLanguage(languageHint);
    if (whisperLang) {
      formData.append('language', whisperLang);
    }

    // Add prompt to help with Indian language context
    if (languageHint && languageHint !== 'en') {
      formData.append('prompt', 'This is a speech recording of an Indian artisan describing their craft, products, and story.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Groq Whisper] API error (${res.status}):`, errText);
        throw new Error(`Groq Whisper API error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const transcript = data.text || '';

      if (!transcript.trim()) {
        throw new Error('Groq Whisper returned empty transcript');
      }

      return {
        transcript,
        language: data.language || languageHint,
        duration: data.duration,
        provider: 'groq-whisper',
      };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

// ============================================
// OpenAI Whisper Implementation (Fallback)
// ============================================

class WhisperSTTProvider implements STTProvider {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. Speech-to-text requires a valid OpenAI API key for Whisper.'
      );
    }
    this.apiKey = apiKey;
  }

  private mapLanguage(code?: string): string | undefined {
    const langMap: Record<string, string> = {
      'en': 'en', 'ta': 'ta', 'hi': 'hi', 'te': 'te',
      'kn': 'kn', 'ml': 'ml', 'mr': 'mr', 'bn': 'bn',
      'gu': 'gu', 'pa': 'pa', 'ur': 'ur', 'or': 'or',
    };
    return code ? langMap[code] : undefined;
  }

  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: this.apiKey });

    const file = new File([new Uint8Array(audioBuffer)], 'audio.webm', { type: 'audio/webm' });
    const whisperLang = this.mapLanguage(languageHint);

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      ...(whisperLang ? { language: whisperLang } : {}),
      response_format: 'verbose_json',
    });

    return {
      transcript: transcription.text,
      language: transcription.language || languageHint,
      duration: transcription.duration,
      provider: 'whisper',
    };
  }
}

// ============================================
// Factory with Automatic Fallback
// Priority: Sarvam AI → Groq Whisper → OpenAI Whisper
// ============================================

class FallbackSTTProvider implements STTProvider {
  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const isIndianLanguage = languageHint && languageHint !== 'en';
    const errors: string[] = [];

    // 1. For Indian languages, try Sarvam AI first (best for Indian languages)
    if (isIndianLanguage && process.env.SARVAM_API_KEY) {
      try {
        console.log(`[STT] Trying Sarvam AI for language: ${languageHint}`);
        const sarvam = new SarvamSTTProvider();
        const result = await sarvam.transcribe(audioBuffer, languageHint);
        console.log(`[STT] Sarvam AI succeeded: ${result.transcript.substring(0, 50)}...`);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Sarvam: ${msg}`);
        console.warn('[STT] Sarvam AI failed:', msg);
      }
    }

    // 2. Try Groq Whisper (fast, supports all languages including Indian)
    if (process.env.GROQ_API_KEY) {
      try {
        console.log(`[STT] Trying Groq Whisper for language: ${languageHint}`);
        const groq = new GroqWhisperSTTProvider();
        const result = await groq.transcribe(audioBuffer, languageHint);
        console.log(`[STT] Groq Whisper succeeded: ${result.transcript.substring(0, 50)}...`);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Groq Whisper: ${msg}`);
        console.warn('[STT] Groq Whisper failed:', msg);
      }
    }

    // 3. Try OpenAI Whisper (fallback)
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log(`[STT] Trying OpenAI Whisper for language: ${languageHint}`);
        const whisper = new WhisperSTTProvider();
        const result = await whisper.transcribe(audioBuffer, languageHint);
        console.log(`[STT] OpenAI Whisper succeeded: ${result.transcript.substring(0, 50)}...`);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`OpenAI Whisper: ${msg}`);
        console.warn('[STT] OpenAI Whisper failed:', msg);
      }
    }

    throw new Error(
      `All STT providers failed. Errors: ${errors.join(' | ')}. ` +
      'Configure at least one: SARVAM_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.'
    );
  }
}

let sttProviderInstance: STTProvider | null = null;

export function getSTTProvider(): STTProvider {
  if (!sttProviderInstance) {
    sttProviderInstance = new FallbackSTTProvider();
  }
  return sttProviderInstance;
}

export function isSTTConfigured(): boolean {
  return !!(process.env.SARVAM_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
}
