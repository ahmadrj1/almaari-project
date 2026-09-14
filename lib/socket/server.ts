import type { Server as IOServer } from "socket.io";
import { logger } from "@/lib/logger";

declare global {
  var __io: IOServer | undefined;
}

export function getSocketServer(): IOServer | null {
  return globalThis.__io || null;
}

export function emitNotificationToUser(userId: string, notification: unknown) {
  try {
    const io = getSocketServer();
    if (!io) return;
    io.to(`user:${userId}`).emit("notification:new", notification);
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to emit notification to user");
  }
}

export function emitUnreadCountToUser(userId: string, unreadCount: number) {
  try {
    const io = getSocketServer();
    if (!io) return;
    io.to(`user:${userId}`).emit("notification:unread-count", { unreadCount });
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to emit unread count to user");
  }
}

export function emitBroadcastNotification(notification: unknown) {
  try {
    const io = getSocketServer();
    if (!io) return;
    io.to("broadcast").emit("notification:new", notification);
  } catch (error) {
    logger.error({ err: error }, "Failed to emit broadcast notification");
  }
}
