import { NotificationController } from "@/controllers/notification.controller";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NotificationController.getNotifications(req);
}
