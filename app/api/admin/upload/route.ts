import { UploadController } from "@/controllers/upload.controller";

export async function POST(req: Request) {
  return UploadController.uploadProductImage(req);
}
