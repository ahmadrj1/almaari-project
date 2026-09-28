import { NextRequest } from "next/server";
import { AdminBulkUploadController } from "@/controllers/admin-bulk-upload.controller";

export async function POST(req: NextRequest) {
  return AdminBulkUploadController.upload(req);
}
