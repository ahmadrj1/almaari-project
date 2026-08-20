import { prisma } from "@/lib/db";

export class NotificationService {
  static async getNotifications(userId: string, filter: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return [];

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
        createdAt: {
          gte: user.createdAt,
        },
      },
      include: {
        reads: {
          where: { userId },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = notifications.map((n) => {
      let isRead = false;
      if (n.userId === null) {
        isRead = n.reads.length > 0;
      } else {
        isRead = n.isRead;
      }

      const { reads: _reads, ...rest } = n;
      void _reads;
      return { ...rest, isRead };
    });

    if (filter === "unread") {
      return mapped.filter((n) => !n.isRead);
    }
    return mapped;
  }

  static async toggleNotificationRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { reads: { where: { userId }, take: 1 } },
    });
    if (!notification) throw new Error("Notification not found");

    if (notification.userId === null) {
      // Broadcast notification - uses NotificationRead table
      if (notification.reads.length === 0) {
        await prisma.notificationRead.create({ data: { userId, notificationId } });
      }
    } else {
      // Personal notification - uses isRead field
      if (!notification.isRead) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true },
        });
      }
    }
  }

  static async markAllAsRead(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    
    if (!user) return;

    await prisma.$transaction(async (tx) => {
      await tx.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      const unreadBroadcasts = await tx.notification.findMany({
        where: {
          userId: null,
          createdAt: {
            gte: user.createdAt,
          },
          NOT: {
            reads: {
              some: { userId },
            },
          },
        },
        select: { id: true },
      });

      if (unreadBroadcasts.length > 0) {
        await tx.notificationRead.createMany({
          data: unreadBroadcasts.map((n) => ({
            userId,
            notificationId: n.id,
          })),
          skipDuplicates: true,
        });
      }
    });
  }
}
