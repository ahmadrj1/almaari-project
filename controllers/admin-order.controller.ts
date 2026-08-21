import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import { AdminOrderService } from "@/services/admin-order.service";

export class AdminOrderController {
  static async getOrders(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const url = new URL(req.url);
      const search = url.searchParams.get("search") || "";
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const data = await AdminOrderService.getOrders({ search, page, limit });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminOrderController.getOrders");
    }
  }

  static async getOrderById(req: Request, id: string) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const data = await AdminOrderService.getOrderById(id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminOrderController.getOrderById");
    }
  }

  static async updateOrderStatus(req: Request, id: string) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const body = await req.json();
      const { status } = body;

      const data = await AdminOrderService.updateOrderStatus(id, status);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminOrderController.updateOrderStatus");
    }
  }
}
