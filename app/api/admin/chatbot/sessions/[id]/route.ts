import { AdminChatbotController } from "@/controllers/admin-chatbot.controller";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return AdminChatbotController.getSession(req, ctx);
}
