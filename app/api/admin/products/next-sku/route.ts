import { NextRequest } from "next/server";
import { AdminProductSkuController } from "@/controllers/admin-product-sku.controller";

export async function GET(req: NextRequest) {
  return AdminProductSkuController.getNextSku(req);
}
