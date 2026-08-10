import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { CART_ITEM_EXPIRY_MS } from "@/lib/constants";
import { cartItemSchema, patchCartItemSchema, deleteCartItemSchema } from "@/lib/validations/main";

async function purgeExpiredCartItems(userId: string) {
  const expiryThreshold = new Date(Date.now() - CART_ITEM_EXPIRY_MS);
  await prisma.cartItem.deleteMany({
    where: { userId, updatedAt: { lt: expiryThreshold } },
  });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await purgeExpiredCartItems(session.user.id);

    const items = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { product: true, variant: { include: { color: true, size: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch cart");
    return NextResponse.json({ success: false, error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { productId, variantId, quantity } = cartItemSchema.parse(body);

    const item = await prisma.$transaction(async (tx) => {
      // Lock the variant row to prevent concurrent stock reads (SELECT ... FOR UPDATE)
      const [variant] = await tx.$queryRaw<Array<{ id: string; stock: number; productId: string }>>`
        SELECT id, stock, "productId" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE
      `;

      if (!variant || variant.productId !== productId) {
        throw Object.assign(new Error("Variant not found"), { statusCode: 404 });
      }

      // Sum all quantities already reserved in carts for this variant (across all users)
      const reserved = await tx.cartItem.aggregate({
        where: { variantId },
        _sum: { quantity: true },
      });

      const currentUserItem = await tx.cartItem.findUnique({
        where: { userId_productId_variantId: { userId: session.user.id, productId, variantId } },
      });

      // Reserved by others (exclude current user's existing reservation to avoid double-counting)
      const reservedByOthers = (reserved._sum.quantity ?? 0) - (currentUserItem?.quantity ?? 0);
      const newQuantity = (currentUserItem?.quantity ?? 0) + quantity;

      if (reservedByOthers + newQuantity > variant.stock) {
        const available = variant.stock - reservedByOthers;
        throw Object.assign(
          new Error(available <= 0 ? "This item is out of stock" : `Only ${available} items available in stock`),
          { statusCode: 400 }
        );
      }

      if (currentUserItem) {
        return tx.cartItem.update({
          where: { id: currentUserItem.id },
          data: { quantity: newQuantity },
          include: { product: true, variant: { include: { color: true, size: true } } },
        });
      }

      return tx.cartItem.create({
        data: { userId: session.user.id, productId, variantId, quantity },
        include: { product: true, variant: { include: { color: true, size: true } } },
      });
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    if (err.statusCode === 404) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    if (err.statusCode === 400) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    logger.error({ err: error }, "Cart API POST error");
    return NextResponse.json({ success: false, error: "Failed to add item to cart" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { cartItemId, quantity } = patchCartItemSchema.parse(body);

    const existing = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true, variant: true },
    });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (quantity > existing.variant.stock) {
      return NextResponse.json({ success: false, error: `Only ${existing.variant.stock} items available in stock` }, { status: 400 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
      return NextResponse.json({ success: true, data: { deleted: true } });
    }

    const item = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true, variant: { include: { color: true, size: true } } },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    logger.error({ err: error }, "Failed to update item");
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { cartItemId } = deleteCartItemSchema.parse(body);

    const existing = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete item");
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
