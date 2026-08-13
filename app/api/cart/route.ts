import { CartController } from "@/controllers/cart.controller";

export async function GET(req: Request) {
  return CartController.getCart(req);
}

export async function POST(req: Request) {
  return CartController.addToCart(req);
}

export async function PATCH(req: Request) {
  return CartController.updateCartItem(req);
}

export async function DELETE(req: Request) {
  return CartController.deleteCartItem(req);
}
