// ============================================
// STT Service Abstraction (OpenAI Whisper)
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
    return code && langMap[code] ? langMap[code] : 'unknown';
  }

  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    
    const langCode = this.mapLanguage(languageHint);
    if (langCode !== 'unknown') {
      formData.append('language_code', langCode);
    }
    formData.append('model', 'saaras:v1');

    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Sarvam AI STT API error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    return {
      transcript: data.transcript || '',
      language: data.language_code || languageHint,
      provider: 'sarvam',
    };
  }
}

// ============================================
// OpenAI Whisper Implementation
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

  // Map our language codes to Whisper language codes
  private mapLanguage(code?: string): string | undefined {
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
// ============================================

class FallbackSTTProvider implements STTProvider {
  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    // 1. Try Sarvam AI first if API key exists
    if (process.env.SARVAM_API_KEY) {
      try {
        const sarvam = new SarvamSTTProvider();
        return await sarvam.transcribe(audioBuffer, languageHint);
      } catch (err) {
        console.warn('[STT] Sarvam AI failed, falling back to OpenAI Whisper:', err);
      }
    }

    // 2. Try OpenAI Whisper if API key exists
    if (process.env.OPENAI_API_KEY) {
      const whisper = new WhisperSTTProvider();
      return await whisper.transcribe(audioBuffer, languageHint);
    }

    throw new Error('No Speech-to-Text API keys configured (SARVAM_API_KEY or OPENAI_API_KEY required).');
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
  return !!(process.env.SARVAM_API_KEY || process.env.OPENAI_API_KEY);
}
