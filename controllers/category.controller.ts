import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError, AppError } from "@/lib/api-error";
import { CategoryService } from "@/services/category.service";
import { Role } from "@prisma/client";

export class CategoryController {
  static async getCategories() {
    try {
      const data = await CategoryService.getCategories();
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CategoryController.getCategories");
    }
  }

  static async addCategory(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const body = await req.json();
      const data = await CategoryService.addCategory(body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CategoryController.addCategory");
    }
  }
}
