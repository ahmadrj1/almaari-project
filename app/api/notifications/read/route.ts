import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function PATCH() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark specific user notifications as read
      await tx.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      // 2. Mark broadcast notifications as read by inserting into join table
      const unreadBroadcasts = await tx.notification.findMany({
        where: {
          userId: null,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to mark notifications as read");
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
