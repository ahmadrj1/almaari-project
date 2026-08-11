import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { handleApiError, AppError } from "@/lib/api-error";
import { UploadService } from "@/services/upload.service";

export class UploadController {
  static async uploadProductImage(req: Request) {
    try {
      const session = await auth();
      if (session?.user?.role !== Role.ADMIN) {
        throw new AppError("Unauthorized", 403);
      }

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const title = formData.get("title") as string | null;

      const imagePath = await UploadService.uploadProductImage(file, title);
      
      return NextResponse.json({ success: true, imagePath });
    } catch (error) {
      return handleApiError(error, "UploadController.uploadProductImage");
    }
  }
}
