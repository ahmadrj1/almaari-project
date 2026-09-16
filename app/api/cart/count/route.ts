import { CartController } from "@/controllers/cart.controller";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return CartController.getCartCount(req);
}
