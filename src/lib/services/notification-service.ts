// ============================================
// Notification Service
// Persists in-app notifications to database
// ============================================

import prisma from '@/lib/db';
import twilio from 'twilio';

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
 * Create order notification for artisan with full order context in their selected language and optional SMS
 */
export async function notifyArtisanNewOrder(params: {
  artisanUserId: string;
  orderId: string;
  productName: string;
  quantity: number;
  orderTotal: number;
  orderType: 'RETAIL' | 'B2B';
  buyerPhone?: string;
  buyerName?: string;
}): Promise<void> {
  const isBulk = params.orderType === 'B2B';
  const totalRupees = Math.round(params.orderTotal / 100);

  // Retrieve artisan's selected language
  let lang = 'en';
  try {
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: params.artisanUserId },
      select: { language: true },
    });
    if (profile?.language) {
      lang = profile.language;
    }
  } catch (err) {
    console.warn('[NOTIF] Could not load artisan language preference, defaulting to en:', err);
  }

  let title = '';
  let message = '';

  switch (lang) {
    case 'ta':
      title = isBulk ? '🚨 புதிய மொத்த ஆர்டர் வந்துள்ளது!' : '🛍️ புதிய ஆர்டர் வந்துள்ளது!';
      message = `ஆர்டர் #${params.orderId}: ${params.productName} (${params.quantity} எண்ணிக்கை) - மொத்தம் ₹${totalRupees.toLocaleString('en-IN')}.`;
      break;
    case 'hi':
      title = isBulk ? '🚨 नया थोक ऑर्डर प्राप्त हुआ!' : '🛍️ नया ऑर्डर प्राप्त हुआ!';
      message = `ऑर्डर #${params.orderId}: ${params.productName} (${params.quantity} पीस) - कुल ₹${totalRupees.toLocaleString('en-IN')}।`;
      break;
    case 'te':
      title = isBulk ? '🚨 కొత్త బల్క్ ఆర్డర్ వచ్చింది!' : '🛍️ కొత్త ఆర్డర్ వచ్చింది!';
      message = `ఆర్డర్ #${params.orderId}: ${params.productName} (${params.quantity} యూనిట్లు) - మొత్తం ₹${totalRupees.toLocaleString('en-IN')}.`;
      break;
    case 'kn':
      title = isBulk ? '🚨 ಹೊಸ ಬಲ್ಕ್ ಆರ್ಡರ್ ಬಂದಿದೆ!' : '🛍️ ಹೊಸ ಆರ್ಡರ್ ಬಂದಿದೆ!';
      message = `ಆರ್ಡರ್ #${params.orderId}: ${params.productName} (${params.quantity} ಯೂನಿಟ್) - ಒಟ್ಟು ₹${totalRupees.toLocaleString('en-IN')}.`;
      break;
    case 'ml':
      title = isBulk ? '🚨 പുതിയ ബൾക്ക് ഓർഡർ ലഭിച്ചു!' : '🛍️ പുതിയ ഓർഡർ ലഭിച്ചു!';
      message = `ഓർഡർ #${params.orderId}: ${params.productName} (${params.quantity} എണ്ണം) - ആകെ ₹${totalRupees.toLocaleString('en-IN')}.`;
      break;
    case 'en':
    default:
      title = isBulk ? '🚨 New Bulk Order Received!' : '🛍️ New Order Received!';
      message = `${isBulk ? 'Bulk order' : 'Order'} #${params.orderId} for ${params.productName} (Qty: ${params.quantity}) totaling ₹${totalRupees.toLocaleString('en-IN')}`;
      break;
  }

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
      orderType: params.orderType,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
    }
  );

  // Optional SMS alert via Twilio if configured
  try {
    const artisanUser = await prisma.user.findUnique({
      where: { id: params.artisanUserId },
      select: { phone: true },
    });

    if (artisanUser?.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `[Artisan Marketplace] ${title} #${params.orderId}! ${params.quantity}x ${params.productName} (₹${totalRupees}).`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: artisanUser.phone,
      });
      console.log(`[SMS] Notification sent to artisan at ${artisanUser.phone}`);
    }
  } catch (smsErr) {
    console.warn('[SMS] Could not send SMS alert (non-critical):', smsErr);
  }
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
