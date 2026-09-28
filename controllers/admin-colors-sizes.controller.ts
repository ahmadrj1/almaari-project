import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { AdminColorsSizesService } from "@/services/admin-colors-sizes.service";

export class AdminColorsSizesController {
  static async getColorsSizes() {
    try {
      const session = await getServerSessionSnapshot();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }
      const data = await AdminColorsSizesService.getColorsSizes();
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "AdminColorsSizesController.getColorsSizes");
    }
  }
}
