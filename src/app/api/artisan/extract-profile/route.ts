// POST /api/artisan/extract-profile — Extract profile from transcript using AI + Rule-based fallback
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAIService } from '@/lib/ai/ai-service';
import prisma from '@/lib/db';

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ruleBasedExtractProfile(transcript: string) {
  let name: string | null = null;
  let location: string | null = null;
  let state: string | null = null;
  let craftType: string | null = null;
  let experience: string | null = null;

  // State detection
  const stateMatch = transcript.match(/\b(tamil nadu|kerala|karnataka|andhra pradesh|telangana|maharashtra|gujarat|rajasthan|punjab|west bengal|uttar pradesh|bihar|odisha|assam)\b/i);
  if (stateMatch) {
    state = capitalizeWords(stateMatch[1]);
  }

  // Name extraction (e.g., "my name is shakti", "i am ramesh")
  const nameMatch = transcript.match(/(?:my name is|i am|name is)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    const rawName = nameMatch[1].split(/\s+(?:from|in|i|and|who|living)\b/i)[0];
    name = capitalizeWords(rawName.trim());
  }

  // Location extraction (e.g., "from tirunelveli tamil nadu")
  const locMatch = transcript.match(/(?:from|in|living in|based in)\s+([a-z\s]+)/i);
  if (locMatch) {
    let locText = locMatch[1].split(/\s+(?:i|and|who|make|weave|craft|having)\b/i)[0].trim();
    if (stateMatch && locText.toLowerCase().includes(stateMatch[1].toLowerCase())) {
      locText = locText.replace(new RegExp(stateMatch[1], 'gi'), '').trim();
    }
    if (locText) location = capitalizeWords(locText);
  }

  // Craft extraction (e.g., "i make handloom sarees", "specialized in pottery")
  const craftMatch = transcript.match(/(?:make|weave|craft|create|produce|specialized in|specializing in)\s+([a-z\s]+)/i);
  if (craftMatch) {
    let craftText = craftMatch[1].split(/\s+(?:and|i|with|having|for|\d+)\b/i)[0].trim();
    // Common speech error replacement ("sharif" -> "saree")
    craftText = craftText.replace(/\bsharif\b/gi, 'saree').replace(/\bhandloom saree\b/gi, 'Handloom Saree');
    craftType = capitalizeWords(craftText);
  } else if (/saree|sharif|handloom|pottery|clay|wood|embroidery|silk|cotton|metal|jewellery|painting/i.test(transcript)) {
    const wordMatch = transcript.match(/(?:[a-z]+\s+)?(?:saree|sharif|handloom|pottery|clay|wood|embroidery|silk|cotton|metal|jewellery|painting)(?:\s+[a-z]+)?/i);
    if (wordMatch) {
      craftType = capitalizeWords(wordMatch[0].replace(/\bsharif\b/gi, 'saree'));
    }
  }

  // Experience extraction (e.g., "15 years", "5 yrs", "10 years of experience")
  const expMatch = transcript.match(/(\d+\s*(?:years?|yrs?)(?:\s*of(?:\s*experience)?)?)/i);
  if (expMatch) experience = expMatch[1].trim();

  return {
    name: name || 'Artisan',
    location: location || null,
    district: location || null,
    state: state || null,
    craftType: craftType || 'Handicraft',
    experience: experience || null,
    artisanStory: transcript,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { transcript, language } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    let extracted;
    try {
      // Try AI Service (Google Gemini)
      const aiService = getAIService();
      extracted = await aiService.extractArtisanProfile(transcript, language);
    } catch (aiError) {
      console.warn('[AI Extract Fallback] Gemini API error, using refined rule-based extraction:', aiError);
      extracted = ruleBasedExtractProfile(transcript);
    }

    // Store AI extraction record
    await prisma.aIExtraction.create({
      data: {
        userId: session.userId,
        inputTranscript: transcript,
        extractedData: JSON.stringify(extracted),
        model: 'gemini-2.5-flash-or-fallback',
        purpose: 'ARTISAN_PROFILE',
      },
    });

    return NextResponse.json({ extracted, transcript });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[AI] Extract profile error:', error);
    return NextResponse.json({ error: 'Failed to extract profile information' }, { status: 500 });
  }
}
