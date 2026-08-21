import { CartController } from "@/controllers/cart.controller";

export async function POST(req: Request) {
  return CartController.validateCartItems(req);
}
