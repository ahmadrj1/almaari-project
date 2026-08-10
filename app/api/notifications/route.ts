import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "unread";

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          { userId: null },
        ],
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

    let filtered = mapped;
    if (filter === "unread") {
      filtered = mapped.filter((n) => !n.isRead);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch notifications");
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}
