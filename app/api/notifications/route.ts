import { NotificationController } from "@/controllers/notification.controller";

export async function GET(req: Request) {
  return NotificationController.getNotifications(req);
}
