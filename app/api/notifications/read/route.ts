import { NotificationController } from "@/controllers/notification.controller";

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("id")) {
    return NotificationController.toggleRead(req);
  }
  return NotificationController.markAllAsRead(req);
}
