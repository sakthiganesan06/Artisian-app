// POST /api/stt/transcribe — Speech-to-Text transcription
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getSTTProvider, isSTTConfigured } from '@/lib/stt/stt-provider';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Check if any STT provider is configured
    if (!isSTTConfigured()) {
      return NextResponse.json(
        { error: 'No speech-to-text service configured. Please set SARVAM_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string | null;
    const purpose = formData.get('purpose') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Check minimum file size (very short recordings may be empty)
    if (audioFile.size < 1000) {
      return NextResponse.json(
        { error: 'Audio recording too short. Please speak for at least 2-3 seconds.' },
        { status: 400 }
      );
    }

    console.log(`[STT] Transcribing audio: ${audioFile.size} bytes, language: ${language}, purpose: ${purpose}`);

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe using STT provider (with automatic fallback)
    const sttProvider = getSTTProvider();
    const result = await sttProvider.transcribe(buffer, language || undefined);

    if (!result.transcript || result.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not transcribe audio. Please try again with clearer audio.' },
        { status: 422 }
      );
    }

    console.log(`[STT] Success via ${result.provider}: "${result.transcript.substring(0, 80)}..." (lang: ${result.language})`);

    // Store transcript record
    try {
      await prisma.audioTranscript.create({
        data: {
          userId: session.userId,
          transcript: result.transcript,
          language: result.language,
          confidence: result.confidence,
          duration: result.duration,
          provider: result.provider,
          purpose: purpose === 'PRODUCT_DESCRIPTION' ? 'PRODUCT_DESCRIPTION' : 'ARTISAN_ONBOARDING',
        },
      });
    } catch (dbErr) {
      // Don't fail the transcription if DB storage fails
      console.warn('[STT] Failed to store transcript in DB:', dbErr);
    }

    return NextResponse.json({
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
      duration: result.duration,
      provider: result.provider,
    });
  } catch (error) {
    console.error('[STT API Error]:', error);
    const message = error instanceof Error ? error.message : 'Speech-to-text failed';
    
    if (message.includes('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: 500 }
    );
  }
}
