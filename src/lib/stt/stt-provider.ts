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
      'or': 'or', // Odia not always supported, will fall back to auto
      'as': 'as', // Assamese
      'sa': 'sa', // Sanskrit
    };
    return code ? langMap[code] : undefined;
  }

  async transcribe(audioBuffer: Buffer, languageHint?: string): Promise<TranscriptResult> {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: this.apiKey });

    // Create a File-like object from the buffer
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
// Factory
// ============================================

let sttProviderInstance: STTProvider | null = null;

export function getSTTProvider(): STTProvider {
  if (sttProviderInstance) return sttProviderInstance;

  try {
    sttProviderInstance = new WhisperSTTProvider();
    return sttProviderInstance;
  } catch (error) {
    throw error;
  }
}

export function isSTTConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
