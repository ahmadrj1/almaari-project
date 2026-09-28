import { AdminColorsSizesController } from "@/controllers/admin-colors-sizes.controller";

export async function GET() {
  return AdminColorsSizesController.getColorsSizes();
}
