// GET /api/notifications — Get artisan's notifications
// PUT /api/notifications — Mark notification as read
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getUserNotifications, markNotificationRead, getUnreadCount } from '@/lib/services/notification-service';

export async function GET() {
  try {
    const session = await requireAuth();

    const [result, unreadCount] = await Promise.all([
      getUserNotifications(session.userId, { limit: 50 }),
      getUnreadCount(session.userId),
    ]);

    return NextResponse.json({
      notifications: result.notifications,
      total: result.total,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await markNotificationRead(notificationId, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
