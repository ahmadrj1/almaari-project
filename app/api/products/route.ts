import { ProductController } from "@/controllers/product.controller";

export async function GET(req: Request) {
  return ProductController.getProducts(req);
}

export async function QUERY(req: Request) {
  return ProductController.getProducts(req);
}
