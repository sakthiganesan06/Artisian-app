// ============================================
// JWT Session Management
// ============================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

const SESSION_COOKIE = 'artisan_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  phone: string;
  role: string;
  sessionId: string;
}

// Create a new session for a user
export async function createSession(userId: string, phone: string, role: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  // Create session record in DB
  const session = await prisma.session.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      expiresAt,
    },
  });

  // Create JWT
  const token = await new SignJWT({
    userId,
    phone,
    role,
    sessionId: session.id,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

// Get current session from cookie
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret());
    const sessionPayload = payload as unknown as SessionPayload;

    // Verify session exists in DB and is not expired
    const dbSession = await prisma.session.findUnique({
      where: { id: sessionPayload.sessionId },
    });

    if (!dbSession || dbSession.expiresAt < new Date()) {
      return null;
    }

    return sessionPayload;
  } catch {
    return null;
  }
}

// Require authentication — throws if not authenticated
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

// Require artisan role
export async function requireArtisan(): Promise<SessionPayload & { artisanProfileId?: string }> {
  const session = await requireAuth();

  const profile = await prisma.artisanProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  return {
    ...session,
    artisanProfileId: profile?.id,
  };
}

// Destroy session
export async function destroySession(): Promise<void> {
  const session = await getSession();
  if (session) {
    await prisma.session.delete({
      where: { id: session.sessionId },
    }).catch(() => {}); // Ignore if already deleted
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Clean up expired sessions (can be called periodically)
export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
