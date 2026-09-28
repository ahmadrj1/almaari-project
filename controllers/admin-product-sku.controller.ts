import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { AdminProductSkuService } from "@/services/admin-product-sku.service";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { AppError } from "@/lib/api-error";

export class AdminProductSkuController {
  static async getNextSku(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }
      const url = new URL(req.url);
      const title = url.searchParams.get("title") || "";
      const data = await AdminProductSkuService.getNextSku(title);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductSkuController.getNextSku");
    }
  }

  static async validateSkus(req: NextRequest) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }
      const body = await req.json();
      const rawSkus: string[] = Array.isArray(body.skus) ? body.skus : [];
      const data = await AdminProductSkuService.validateSkus(rawSkus);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminProductSkuController.validateSkus");
    }
  }

  static async generateTemplate() {
    try {
      const buffer = await AdminProductSkuService.generateTemplate();
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="products_template.xlsx"',
        },
      });
    } catch (error) {
      return handleApiError(
        error,
        "AdminProductSkuController.generateTemplate",
      );
    }
  }
}
