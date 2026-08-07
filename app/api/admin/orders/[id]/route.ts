import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role, OrderStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const isCancelling = status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED;
      const isRestoring = status !== OrderStatus.CANCELLED && order.status === OrderStatus.CANCELLED;

      if (isCancelling) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: { name: item.colorName },
              size: { name: item.sizeName }
            }
          });
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
      } else if (isRestoring) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: { name: item.colorName },
              size: { name: item.sizeName }
            }
          });
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      }

      return await tx.order.update({
        where: { id },
        data: { status },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, "Failed to update order status");
    return NextResponse.json({ success: false, error: "Failed to update order status" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        address: true,
        items: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        }
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch order details");
    return NextResponse.json({ success: false, error: "Failed to fetch order details" }, { status: 500 });
  }
}
