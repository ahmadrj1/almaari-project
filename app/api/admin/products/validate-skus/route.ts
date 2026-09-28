import { NextRequest } from "next/server";
import { AdminProductSkuController } from "@/controllers/admin-product-sku.controller";

export async function POST(req: NextRequest) {
  return AdminProductSkuController.validateSkus(req);
}
