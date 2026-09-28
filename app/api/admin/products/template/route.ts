import { AdminProductSkuController } from "@/controllers/admin-product-sku.controller";

export async function GET() {
  return AdminProductSkuController.generateTemplate();
}
