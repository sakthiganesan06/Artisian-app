// GET /api/health — Health check to verify database connection and env vars
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.DATABASE_URL = process.env.DATABASE_URL ? 'SET' : 'MISSING';
  checks.JWT_SECRET = process.env.JWT_SECRET
    ? process.env.JWT_SECRET.length >= 32
      ? 'SET (valid)'
      : `SET but too short (${process.env.JWT_SECRET.length} chars, need 32+)`
    : 'MISSING';
  checks.AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'NOT SET (defaults to development)';

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'CONNECTED';
  } catch (error) {
    checks.database = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Check user count
  try {
    const count = await prisma.user.count();
    checks.userCount = String(count);
  } catch (error) {
    checks.userCount = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
  }

  const allOk = checks.database === 'CONNECTED' && checks.JWT_SECRET.includes('valid') && checks.DATABASE_URL === 'SET';

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 500 });
}
