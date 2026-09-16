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
      if (!["unread", "all"].includes(filter)) {
        throw new AppError("Filter must be 'unread' or 'all'", 400);
      }

      const limitStr = url.searchParams.get("limit");
      const offsetStr = url.searchParams.get("offset");

      let limit: number | undefined;
      if (limitStr !== null) {
        const parsedLimit = Number(limitStr);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 0) {
          throw new AppError("Limit must be a non-negative integer", 400);
        }
        limit = parsedLimit;
      }

      let offset: number | undefined;
      if (offsetStr !== null) {
        const parsedOffset = Number(offsetStr);
        if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
          throw new AppError("Offset must be a non-negative integer", 400);
        }
        offset = parsedOffset;
      }

      const data = await NotificationService.getNotifications(
        session.user.id,
        filter,
        limit,
        offset,
      );
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "private, no-store, must-revalidate" } },
      );
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

      await NotificationService.toggleNotificationRead(
        session.user.id,
        notificationId,
      );
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
