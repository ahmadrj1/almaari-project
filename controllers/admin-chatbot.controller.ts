import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import {
  AdminChatbotService,
  fetchAdminContext,
  buildAdminSystemPrompt,
  runAdminChatCompletion,
} from "@/services/admin-chatbot.service";
import { CHATBOT_CONTEXT_PAIRS_LIMIT } from "@/lib/constants";

export class AdminChatbotController {
  static async chat(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }

      const userId = session.user.id;
      const body = await req.json();
      const { message, sessionId } = body as {
        message: string;
        sessionId?: string;
      };

      if (!message?.trim()) throw new AppError("Message is required", 400);

      const { chatSession, isNewSession } =
        await AdminChatbotService.resolveOrCreateSession(
          userId,
          message,
          sessionId,
        );

      const contextMessages = (chatSession.messages ?? []).slice(
        -CHATBOT_CONTEXT_PAIRS_LIMIT * 2,
      );

      const now = new Date();
      const adminContext = await fetchAdminContext(message, now);
      const systemPrompt = buildAdminSystemPrompt();

      const groqMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [{ role: "system", content: systemPrompt }];

      if (adminContext) {
        groqMessages.push({
          role: "system",
          content: `CURRENT DATABASE ANALYTICS CONTEXT:\n${adminContext}`,
        });
      }

      for (const msg of contextMessages) {
        groqMessages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }

      groqMessages.push({ role: "user", content: message });

      const reply = await runAdminChatCompletion(groqMessages);

      await AdminChatbotService.persistMessages(chatSession.id, message, reply);

      return NextResponse.json({
        success: true,
        data: {
          message: reply,
          sessionId: chatSession.id,
          sessionTitle: chatSession.title,
          isNewSession,
        },
      });
    } catch (error) {
      return handleApiError(error, "AdminChatbotController.chat");
    }
  }

  static async listSessions() {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }
      const data = await AdminChatbotService.listSessions(session.user.id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminChatbotController.listSessions");
    }
  }

  static async getSession(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }
      const { id } = await params;
      const chatSession = await AdminChatbotService.getSession(
        session.user.id,
        id,
      );
      if (!chatSession) throw new AppError("Session not found", 404);
      return NextResponse.json({ success: true, data: chatSession });
    } catch (error) {
      return handleApiError(error, "AdminChatbotController.getSession");
    }
  }
}
