import { ProductController } from "@/controllers/product.controller";

export async function GET(req: Request) {
  return ProductController.getDemoProducts(req);
}
