import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string(),
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
      include: { product: true },
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
    const { productId, quantity } = cartItemSchema.parse(body);

    const existingItem = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
    });

    let item;
    if (existingItem) {
      item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: true },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { userId: session.user.id, productId, quantity },
        include: { product: true },
      });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to add item to cart" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { cartItemId, quantity } = patchCartItemSchema.parse(body);

    const existing = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
      return NextResponse.json({ success: true, data: { deleted: true } });
    }

    const item = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true },
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
