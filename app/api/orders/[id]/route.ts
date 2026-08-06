import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id: orderId } = await params;
    if (!orderId) return NextResponse.json({ success: false, error: "Missing order ID" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        items: {
          include: { product: true }
        },
        address: true
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
