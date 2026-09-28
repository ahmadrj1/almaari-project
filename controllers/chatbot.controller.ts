import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import { ChatbotService } from "@/services/chatbot.service";
import { checkRateLimit } from "@/lib/rate-limiter";
import { CHATBOT_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

export class ChatbotController {
  static async chat(req: NextRequest) {
    try {
      const session = await auth();
      if (session?.user?.role === Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }

      const userId = session?.user?.id;
      const isGuest = !userId;

      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "guest";
      const rateLimitKey = userId ? `user:${userId}` : `guest:${clientIp}`;

      const { allowed } = checkRateLimit(
        rateLimitKey,
        CHATBOT_RATE_LIMIT_PER_MINUTE,
        60 * 1000,
      );

      if (!allowed) {
        throw new AppError(
          "You have exceeded the rate limit of 25 requests per minute. Please wait a moment before trying again.",
          429,
        );
      }

      const body = await req.json();
      const { message, sessionId, history } = body as {
        message: string;
        sessionId?: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };

      if (!message?.trim()) throw new AppError("Message is required", 400);

      const result = await ChatbotService.chat({
        message,
        sessionId,
        history,
        userId,
        isGuest,
      });

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error, "ChatbotController.chat");
    }
  }

  static async addToCart(req: NextRequest) {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role === Role.ADMIN) {
        throw new AppError("Please login to add items to your cart.", 401);
      }

      const { productId, variantId, quantity = 1 } = await req.json();
      if (!productId || !variantId) {
        throw new AppError("productId and variantId are required", 400);
      }

      await ChatbotService.addToCart(
        session.user.id,
        productId,
        variantId,
        quantity,
      );
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, "ChatbotController.addToCart");
    }
  }

  static async listSessions() {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role === Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }
      const data = await ChatbotService.listSessions(session.user.id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "ChatbotController.listSessions");
    }
  }

  static async getSession(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    try {
      const session = await auth();
      if (!session?.user?.id || session.user.role === Role.ADMIN) {
        throw new AppError("Unauthorized", 401);
      }
      const { id } = await params;
      const chatSession = await ChatbotService.getSession(session.user.id, id);
      if (!chatSession) throw new AppError("Session not found", 404);
      return NextResponse.json({ success: true, data: chatSession });
    } catch (error) {
      return handleApiError(error, "ChatbotController.getSession");
    }
  }
}
