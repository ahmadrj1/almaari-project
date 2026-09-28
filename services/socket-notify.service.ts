import {
  emitNotificationToUser,
  emitBroadcastNotification,
  emitUnreadCountToUser,
} from "@/lib/socket/server";
import type { Notification } from "@/types";

export class SocketNotifyService {
  static dispatch(payload: {
    userId?: string;
    type?: string;
    notification: Notification;
    unreadCount?: number;
  }) {
    const { userId, type, notification, unreadCount } = payload;

    if (type === "broadcast" || !userId) {
      emitBroadcastNotification(notification);
    } else {
      emitNotificationToUser(userId, notification);
      if (typeof unreadCount === "number") {
        emitUnreadCountToUser(userId, unreadCount);
      }
    }
  }
}
