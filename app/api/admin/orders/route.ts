import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";
import { ORDERS_PER_PAGE_DEFAULT } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || String(ORDERS_PER_PAGE_DEFAULT));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { user: { fullName: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const [orders, total, totalOrdersOverall, totalAmountRaw, totalUnitsRaw] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: true, items: true },
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { status: { not: "CANCELLED" } } }), // For summary card
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true }
      }), // For summary card
      prisma.orderItem.aggregate({
        where: { order: { status: { not: "CANCELLED" } } },
        _sum: { quantity: true }
      }) // For summary card
    ]);

    const stats = {
      totalOrders: totalOrdersOverall,
      totalUnits: totalUnitsRaw._sum.quantity || 0,
      totalAmount: totalAmountRaw._sum.total || 0,
    };

    return NextResponse.json({
      success: true,
      data: { orders, stats, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error("Admin Orders API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
