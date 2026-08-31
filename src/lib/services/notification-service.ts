// ============================================
// Notification Service
// Persists in-app notifications to database
// ============================================

import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';

export type NotificationType = 'NEW_ORDER' | 'ORDER_STATUS_CHANGE' | 'LOW_STOCK' | 'PROFILE_UPDATE' | 'SYSTEM';

export interface NotificationData {
  orderId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  orderTotal?: number;
  [key: string]: unknown;
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });
}

/**
 * Create order notification for artisan
 */
export async function notifyArtisanNewOrder(params: {
  artisanUserId: string;
  orderId: string;
  productName: string;
  quantity: number;
  orderTotal: number;
  orderType: 'RETAIL' | 'B2B';
}): Promise<void> {
  const title = 'New Order Received';
  const message = `${params.orderType === 'B2B' ? 'Bulk order' : 'Order'} for ${params.productName} (Qty: ${params.quantity}) — Order ID: ${params.orderId}`;

  await createNotification(
    params.artisanUserId,
    'NEW_ORDER',
    title,
    message,
    {
      orderId: params.orderId,
      productName: params.productName,
      quantity: params.quantity,
      orderTotal: params.orderTotal,
    }
  );
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean }
) {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const where: Record<string, unknown> = { userId };
  if (options?.unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
