import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ORDERS_PER_PAGE_DEFAULT, TAX_PERCENTAGE } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const addressId = body.addressId;
    if (!addressId) return NextResponse.json({ success: false, error: "Address is required" }, { status: 400 });

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) return NextResponse.json({ success: false, error: "Invalid address" }, { status: 400 });

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: { include: { color: true, size: true } } },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    let subTotal = 0;
    cartItems.forEach((item) => {
      subTotal += Number(item.product.price) * item.quantity;
    });

    const tax = subTotal * TAX_PERCENTAGE;
    const total = subTotal + tax;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId,
          subTotal,
          tax,
          total,
          items: {
            create: cartItems.map((item) => ({
              quantity: item.quantity,
              price: item.product.price,
              productId: item.productId,
              colorName: item.variant.color.name,
              sizeName: item.variant.size.name,
            })),
          },
        },
      });

      // Update variant stock
      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return newOrder;
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    logger.error({ err: error }, "Failed to place order");
    return NextResponse.json({ success: false, error: "Failed to place order" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || String(ORDERS_PER_PAGE_DEFAULT));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch orders");
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
