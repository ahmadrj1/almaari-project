import { ChatbotController } from "@/controllers/chatbot.controller";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return ChatbotController.getSession(req, ctx);
}
