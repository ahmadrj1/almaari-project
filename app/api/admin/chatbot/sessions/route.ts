import { AdminChatbotController } from "@/controllers/admin-chatbot.controller";

export async function GET() {
  return AdminChatbotController.listSessions();
}
