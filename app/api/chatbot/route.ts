import { NextRequest } from "next/server";
import { ChatbotController } from "@/controllers/chatbot.controller";

export async function POST(req: NextRequest) {
  return ChatbotController.chat(req);
}

export async function PUT(req: NextRequest) {
  return ChatbotController.addToCart(req);
}
