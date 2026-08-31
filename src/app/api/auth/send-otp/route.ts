// POST /api/auth/send-otp
import { NextRequest, NextResponse } from 'next/server';
import { sendOtpSchema } from '@/lib/validations';
import { getAuthProvider } from '@/lib/auth/auth-provider';

// Simple rate limiting (in-memory, per phone)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max attempts
const RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid phone number', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { phone } = parsed.data;

    // Rate limiting
    const now = Date.now();
    const rateKey = phone;
    const rateData = rateLimitStore.get(rateKey);

    if (rateData && now < rateData.resetAt) {
      if (rateData.count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: 'Too many OTP requests. Please try again later.' },
          { status: 429 }
        );
      }
      rateData.count++;
    } else {
      rateLimitStore.set(rateKey, { count: 1, resetAt: now + RATE_WINDOW });
    }

    // Send OTP
    const authProvider = getAuthProvider();
    const result = await authProvider.sendOTP(phone);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('[AUTH] Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
