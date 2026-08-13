import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError, AppError } from "@/lib/api-error";
import { NotificationService } from "@/services/notification.service";

export class NotificationController {
  static async getNotifications(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const url = new URL(req.url);
      const filter = url.searchParams.get("filter") || "unread";

      const data = await NotificationService.getNotifications(session.user.id, filter);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "NotificationController.getNotifications");
    }
  }

  static async toggleRead(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const url = new URL(req.url);
      const notificationId = url.searchParams.get("id");
      if (!notificationId) throw new AppError("Notification ID required", 400);

      await NotificationService.toggleNotificationRead(session.user.id, notificationId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, "NotificationController.toggleRead");
    }
  }

  static async markAllAsRead(_req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      await NotificationService.markAllAsRead(session.user.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, "NotificationController.markAllAsRead");
    }
  }
}
