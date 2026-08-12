import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import { AdminProductService } from "@/services/admin-product.service";

export class AdminProductController {
  static async getProducts(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const url = new URL(req.url);
      const search = url.searchParams.get("search") || "";
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const data = await AdminProductService.getProducts({ search, page, limit });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductController.getProducts");
    }
  }

  static async createProduct(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const body = await req.json();
      const data = await AdminProductService.createProduct(body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductController.createProduct");
    }
  }

  static async getProductById(req: Request, id: string) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const data = await AdminProductService.getProductById(id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductController.getProductById");
    }
  }

  static async updateProduct(req: Request, id: string) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const body = await req.json();
      const data = await AdminProductService.updateProduct(id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductController.updateProduct");
    }
  }

  static async deleteProduct(req: Request, id: string) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const data = await AdminProductService.deleteProduct(id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductController.deleteProduct");
    }
  }
}
