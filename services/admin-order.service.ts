import { prisma } from "@/lib/db";
import { OrderStatus, Prisma } from "@prisma/client";
import { ORDERS_PER_PAGE_DEFAULT } from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createNotification } from "@/lib/notifications";

export class AdminOrderService {
  static async getOrders({ search, page }: { search: string; page: number }) {
    const limit = ORDERS_PER_PAGE_DEFAULT;
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
      prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true }
      }),
      prisma.orderItem.aggregate({
        where: { order: { status: { not: "CANCELLED" } } },
        _sum: { quantity: true }
      })
    ]);

    const stats = {
      totalOrders: totalOrdersOverall,
      totalUnits: totalUnitsRaw._sum.quantity || 0,
      totalAmount: totalAmountRaw._sum.total || 0,
    };

    return { orders, stats, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getOrderById(id: string) {
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
      throw new AppError("Order not found", 404);
    }
    return order;
  }

  static async updateOrderStatus(id: string, status: string) {
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new AppError("Invalid status", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        throw new AppError("Order not found", 404);
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
        data: { status: status as OrderStatus },
      });
    });

    createNotification(
      updated.userId,
      "ORDER_STATUS_UPDATED",
      "Order Status Updated",
      `Your order #${id.slice(0, 8)} is now ${status.toLowerCase()}.`,
      { orderId: id, status }
    );

    return updated;
  }
}
