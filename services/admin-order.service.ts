import { prisma } from "@/lib/db";
import { OrderStatus, Prisma } from "@prisma/client";
import { ADMIN_ORDERS_PER_PAGE_DEFAULT, STATUS_LEVELS } from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createNotification } from "@/lib/notifications";

export class AdminOrderService {
  static async getOrders({
    search,
    page,
    limit = ADMIN_ORDERS_PER_PAGE_DEFAULT,
  }: {
    search: string;
    page: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;

    const matchingStatuses = Object.values(OrderStatus).filter((status) =>
      status.toLowerCase().includes(search.toLowerCase()),
    );

    const where: Prisma.OrderWhereInput = search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { user: { fullName: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            ...(matchingStatuses.length > 0
              ? [{ status: { in: matchingStatuses } }]
              : []),
          ],
        }
      : {};

    const [orders, total, totalOrdersOverall, totalAmountRaw, totalUnitsRaw] =
      await Promise.all([
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
          _sum: { total: true },
        }),
        prisma.orderItem.aggregate({
          where: { order: { status: { not: "CANCELLED" } } },
          _sum: { quantity: true },
        }),
      ]);

    const stats = {
      totalOrders: totalOrdersOverall,
      totalUnits: totalUnitsRaw._sum.quantity || 0,
      totalAmount: totalAmountRaw._sum.total || 0,
    };

    return {
      orders,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
              include: { variants: true },
            },
          },
        },
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
        include: { items: true },
      });

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      if (order.paymentMethod === "CREDIT_DEBIT_CARD") {
        if (order.paymentStatus === "PROCESSING") {
          throw new AppError(
            `Cannot update order status. Payment is ${order.paymentStatus.toLowerCase()}. Status can only be changed after payment is confirmed.`,
            400,
          );
        }
        if (
          order.paymentStatus === "FAILED" &&
          status !== OrderStatus.CANCELLED
        ) {
          throw new AppError(
            `Cannot update order status to ${status}. Since the payment failed, you can only cancel the order.`,
            400,
          );
        }
        if (
          order.paymentStatus === "PAID" &&
          status === OrderStatus.CANCELLED
        ) {
          throw new AppError(
            "Cannot cancel an order with a paid card payment.",
            400,
          );
        }
      }

      if (status !== order.status) {
        if (
          order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.DELIVERED
        ) {
          throw new AppError(
            `Cannot change status of a ${order.status.toLowerCase()} order`,
            400,
          );
        }
        const isFailedPaymentCancellation =
          order.paymentMethod === "CREDIT_DEBIT_CARD" &&
          order.paymentStatus === "FAILED" &&
          order.status === OrderStatus.PENDING &&
          status === OrderStatus.CANCELLED;

        if (!isFailedPaymentCancellation) {
          const currentLevel = STATUS_LEVELS[order.status] ?? 0;
          const targetLevel = STATUS_LEVELS[status] ?? 0;
          if (targetLevel !== currentLevel + 1) {
            throw new AppError(
              `Cannot change status from ${order.status} to ${status}. Status must advance one step at a time.`,
              400,
            );
          }
        }
      }

      const isCancelling =
        status === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED;
      const isRestoring =
        status !== OrderStatus.CANCELLED &&
        order.status === OrderStatus.CANCELLED;

      if (isCancelling) {
        // Stock is always reserved/decremented upfront for both COD and card payments
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: { name: item.colorName },
              size: { name: item.sizeName },
            },
          });
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      } else if (isRestoring) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: {
              productId: item.productId,
              color: { name: item.colorName },
              size: { name: item.sizeName },
            },
          });
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      }

      return await tx.order.update({
        where: { id },
        data: {
          status: status as OrderStatus,
          ...(status === OrderStatus.CANCELLED
            ? { paymentStatus: "FAILED" }
            : {}),
        },
      });
    });

    if (
      status === OrderStatus.CANCELLED &&
      updated.paymentMethod === "CREDIT_DEBIT_CARD" &&
      updated.paymentIntentId
    ) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.paymentIntents.cancel(updated.paymentIntentId);
      } catch (stripeError) {
        console.error("Failed to cancel payment intent:", stripeError);
      }
    }

    createNotification(
      updated.userId,
      "ORDER_STATUS_UPDATED",
      "Order Status Updated",
      `Your order #${id.slice(0, 8)} is now ${status.toLowerCase()}.`,
      { orderId: id, status },
    );

    return updated;
  }
}
