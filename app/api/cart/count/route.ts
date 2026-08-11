import { CartController } from "@/controllers/cart.controller";

export async function GET(req: Request) {
  return CartController.getCartCount(req);
}
