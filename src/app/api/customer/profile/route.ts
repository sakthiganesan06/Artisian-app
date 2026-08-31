// GET / POST /api/customer/profile — Customer details endpoint
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        phone: true,
        role: true,
        name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ customer: user });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch customer profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { name, address, city, state, pincode } = body;

    if (!name || !address) {
      return NextResponse.json({ error: 'Name and Delivery Address are required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name,
        address,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        phone: true,
        role: true,
        name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
      },
    });

    return NextResponse.json({ customer: updatedUser, success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[CUSTOMER] Profile save error:', error);
    return NextResponse.json({ error: 'Failed to save customer profile' }, { status: 500 });
  }
}
