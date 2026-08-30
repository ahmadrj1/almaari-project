import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { handleApiError, AppError } from "@/lib/api-error";
import { CartService } from "@/services/cart.service";

export class CartController {
  static async getCart(_req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const data = await CartService.getCart(session.user.id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CartController.getCart");
    }
  }

  static async getCartCount(_req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id)
        return NextResponse.json({ success: true, count: 0 });

      const count = await CartService.getCartCount(session.user.id);
      return NextResponse.json({ success: true, count });
    } catch (_error) {
      return NextResponse.json({ success: true, count: 0 });
    }
  }

  static async addToCart(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const body = await req.json();
      const data = await CartService.addToCart(session.user.id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CartController.addToCart");
    }
  }

  static async updateCartItem(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const body = await req.json();
      const data = await CartService.updateCartItem(session.user.id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CartController.updateCartItem");
    }
  }

  static async deleteCartItem(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);

      const body = await req.json();
      const data = await CartService.deleteCartItem(session.user.id, body);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "CartController.deleteCartItem");
    }
  }

  static async validateCartItems(req: Request) {
    try {
      const session = await auth();
      if (!session?.user?.id) throw new AppError("Unauthorized", 401);
      const body = await req.json();
      const issues = await CartService.validateCartItems(
        session.user.id,
        body.selectedItemIds || [],
      );
      return NextResponse.json({ success: true, issues });
    } catch (error) {
      return handleApiError(error, "CartController.validateCartItems");
    }
  }
}
