import { prisma } from "@/lib/db";
import { ORDERS_PER_PAGE_DEFAULT, TAX_PERCENTAGE, CART_ITEM_EXPIRY_MS } from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createNotification } from "@/lib/notifications";

export class OrderService {
  static async createOrder(userId: string, body: any) {
    const addressId = body.addressId;
    const selectedItemIds = body.selectedItemIds;
    if (!addressId) throw new AppError("Address is required", 400);
    if (!selectedItemIds || !Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
      throw new AppError("No items selected", 400);
    }

    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new AppError("Invalid address", 400);

    const cartItems = await prisma.cartItem.findMany({
      where: { userId, id: { in: selectedItemIds } },
      include: { product: true, variant: { include: { color: true, size: true } } },
    });

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const now = Date.now();
    const hasExpiredItems = cartItems.some(
      (item) => now - new Date(item.updatedAt).getTime() > CART_ITEM_EXPIRY_MS
    );
    if (hasExpiredItems) {
      throw new AppError("Some items in your cart have expired. Please refresh the page to update your cart.", 400);
    }

    let subTotal = 0;
    cartItems.forEach((item) => {
      subTotal += Number(item.product.price) * item.quantity;
    });

    const tax = subTotal * TAX_PERCENTAGE;
    const total = subTotal + tax;

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cartItems) {
        const [variant] = await tx.$queryRaw<Array<{ stock: number }>>`
          SELECT stock FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE
        `;
        if (!variant || variant.stock < item.quantity) {
          throw new AppError(`Insufficient stock for "${item.product.title}"`, 400);
        }
      }

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

      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId, id: { in: selectedItemIds } } });

      return newOrder;
    });

    createNotification(
      userId,
      "ORDER_PLACED",
      "Order Placed Successfully",
      `Your order #${order.id.slice(0, 8)} has been placed.`,
      { orderId: order.id }
    );

    return order;
  }

  static async getOrders(userId: string, page: number) {
    const limit = ORDERS_PER_PAGE_DEFAULT;
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

    return { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        address: true
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }
    return order;
  }
}
