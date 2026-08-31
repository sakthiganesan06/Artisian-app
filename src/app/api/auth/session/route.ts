// GET /api/auth/session — Get current user session info
// POST /api/auth/logout — Destroy session
import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth/session';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        artisanProfile: {
          select: {
            id: true,
            artisanId: true,
            name: true,
            isOnboarded: true,
            language: true,
            craftType: true,
            location: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        hasProfile: !!user.artisanProfile?.isOnboarded,
        profile: user.artisanProfile || null,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Logout should always succeed
  }
}
