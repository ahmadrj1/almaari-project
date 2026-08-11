import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError, AppError } from "@/lib/api-error";
import { OrderService } from "@/services/order.service";

export class OrderController {
  static async createOrder(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const body = await req.json();
      const data = await OrderService.createOrder(session.user.id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "OrderController.createOrder");
    }
  }

  static async getOrders(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1");

      const data = await OrderService.getOrders(session.user.id, page);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "OrderController.getOrders");
    }
  }

  static async getOrderById(req: Request, orderId: string) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      if (!orderId) throw new AppError("Missing order ID", 400);

      const data = await OrderService.getOrderById(session.user.id, orderId);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "OrderController.getOrderById");
    }
  }
}
