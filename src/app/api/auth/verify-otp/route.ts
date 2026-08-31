// POST /api/auth/verify-otp — Verifies OTP with role selection (Artisan vs Customer)
import { NextRequest, NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth/auth-provider';
import { createSession } from '@/lib/auth/session';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, role } = body;

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and OTP code are required' }, { status: 400 });
    }

    const selectedRole = role === 'CUSTOMER' ? 'CUSTOMER' : 'ARTISAN';

    // Verify OTP
    const authProvider = getAuthProvider();
    const result = await authProvider.verifyOTP(phone, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'OTP verification failed' },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
      include: {
        artisanProfile: {
          select: {
            id: true,
            artisanId: true,
            name: true,
            isOnboarded: true,
            language: true,
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, role: selectedRole },
        include: {
          artisanProfile: {
            select: {
              id: true,
              artisanId: true,
              name: true,
              isOnboarded: true,
              language: true,
            },
          },
        },
      });
    } else if (user.role !== selectedRole) {
      // Update role to user's selected role
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: selectedRole },
        include: {
          artisanProfile: {
            select: {
              id: true,
              artisanId: true,
              name: true,
              isOnboarded: true,
              language: true,
            },
          },
        },
      });
    }

    // Create session
    await createSession(user.id, user.phone, user.role);

    const hasCustomerDetails = !!(user.name && user.address);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasProfile: !!user.artisanProfile?.isOnboarded,
        hasCustomerDetails,
        profile: user.artisanProfile
          ? {
              artisanId: user.artisanProfile.artisanId,
              name: user.artisanProfile.name,
              language: user.artisanProfile.language,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[AUTH] Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
