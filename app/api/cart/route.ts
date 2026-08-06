import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().min(1),
});

const patchCartItemSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number(),
});

const deleteCartItemSchema = z.object({
  cartItemId: z.string(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const items = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: { product: true, variant: { include: { color: true, size: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { productId, variantId, quantity } = cartItemSchema.parse(body);

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.productId !== productId) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId_variantId: { userId: session.user.id, productId, variantId } },
    });

    const newQuantity = (existingItem?.quantity || 0) + quantity;
    if (newQuantity > variant.stock) {
      return NextResponse.json({ success: false, error: `Only ${variant.stock} items available in stock` }, { status: 400 });
    }

    let item;
    if (existingItem) {
      item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true, variant: { include: { color: true, size: true } } },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { userId: session.user.id, productId, variantId, quantity },
        include: { product: true, variant: { include: { color: true, size: true } } },
      });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Cart API POST error:", error);
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
      include: { product: true, variant: true }
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
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 });
  }
}
