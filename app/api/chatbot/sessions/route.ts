import { ChatbotController } from "@/controllers/chatbot.controller";

export async function GET() {
  return ChatbotController.listSessions();
}
