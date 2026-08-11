import { AdminProductController } from "@/controllers/admin-product.controller";

export async function GET(req: Request) {
  return AdminProductController.getProducts(req);
}

export async function POST(req: Request) {
  return AdminProductController.createProduct(req);
}
