import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { AdminBulkUploadService } from "@/services/admin-bulk-upload.service";

export class AdminBulkUploadController {
  static async upload(req: NextRequest) {
    try {
      const products = await AdminBulkUploadService.parseRequest(req);
      AdminBulkUploadService.validateDescriptions(products);
      const result = await AdminBulkUploadService.queueAndNotify(products);
      return NextResponse.json({
        success: true,
        message:
          "Bulk upload tasks successfully queued in Background Job Server",
        ...result,
      });
    } catch (error) {
      return handleApiError(error, "AdminBulkUploadController.upload");
    }
  }
}
