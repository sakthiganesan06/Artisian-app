// POST /api/stt/transcribe — Speech-to-Text transcription
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getSTTProvider } from '@/lib/stt/stt-provider';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

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

    // Validate file size (max 25MB for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe using STT provider
    const sttProvider = getSTTProvider();
    const result = await sttProvider.transcribe(buffer, language || undefined);

    if (!result.transcript || result.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not transcribe audio. Please try again with clearer audio.' },
        { status: 422 }
      );
    }

    // Store transcript record
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

    return NextResponse.json({
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
      duration: result.duration,
    });
  } catch (error) {
    console.error('[STT API Error]:', error);
    const message = error instanceof Error ? error.message : 'Speech-to-text failed';
    
    if (message.includes('OPENAI_API_KEY') || message.includes('apiKey')) {
      return NextResponse.json(
        { error: 'Speech-to-text not configured or invalid API key. Please check your OPENAI_API_KEY in .env file.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `Transcription error: ${message}` },
      { status: 500 }
    );
  }
}
