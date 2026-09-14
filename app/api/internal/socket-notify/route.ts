import { NextResponse } from "next/server";
import {
  emitNotificationToUser,
  emitBroadcastNotification,
  emitUnreadCountToUser,
} from "@/lib/socket/server";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.JOB_SCHEDULER_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, type, notification, unreadCount } = body;

    if (type === "broadcast" || !userId) {
      emitBroadcastNotification(notification);
    } else {
      emitNotificationToUser(userId, notification);
      if (typeof unreadCount === "number") {
        emitUnreadCountToUser(userId, unreadCount);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
