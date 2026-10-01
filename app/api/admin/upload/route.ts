import { UploadController } from "@/controllers/upload.controller";

export async function GET() {
  return UploadController.getUploadSignature();
}

export async function POST(req: Request) {
  return UploadController.uploadProductImage(req);
}
