import { AdminChatbotController } from "@/controllers/admin-chatbot.controller";

export async function POST(req: Request) {
  return AdminChatbotController.chat(req);
}
