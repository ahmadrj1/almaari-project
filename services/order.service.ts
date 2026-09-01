import { prisma } from "@/lib/db";
import {
  ORDERS_PER_PAGE_DEFAULT,
  TAX_PERCENTAGE,
  CART_ITEM_EXPIRY_MS,
} from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createNotification } from "@/lib/notifications";

export class OrderService {
  static async createOrder(
    userId: string,
    body: {
      addressId: string;
      selectedItemIds: string[];
      paymentMethod: "CASH_ON_DELIVERY" | "CREDIT_DEBIT_CARD";
      paymentMethodId?: string;
    },
  ) {
    const addressId = body.addressId;
    const selectedItemIds = body.selectedItemIds;
    const paymentMethod = body.paymentMethod || "CASH_ON_DELIVERY";

    if (!addressId) throw new AppError("Address is required", 400);
    if (
      !selectedItemIds ||
      !Array.isArray(selectedItemIds) ||
      selectedItemIds.length === 0
    ) {
      throw new AppError("No items selected", 400);
    }

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new AppError("Invalid address", 400);

    const cartItems = await prisma.cartItem.findMany({
      where: { userId, id: { in: selectedItemIds } },
      include: {
        product: true,
        variant: { include: { color: true, size: true } },
      },
    });

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const now = Date.now();
    const hasExpiredItems = cartItems.some(
      (item) => now - new Date(item.updatedAt).getTime() > CART_ITEM_EXPIRY_MS,
    );
    if (hasExpiredItems) {
      throw new AppError(
        "Some items in your cart have expired. Please refresh the page to update your cart.",
        400,
      );
    }

    let subTotal = 0;
    cartItems.forEach((item) => {
      subTotal += Number(item.product.price) * item.quantity;
    });

    const tax = subTotal * TAX_PERCENTAGE;
    const total = subTotal + tax;

    if (paymentMethod === "CREDIT_DEBIT_CARD") {
      // 1. Transaction to reserve stock (pessimistic check) and create order.
      // Do NOT decrement stock or delete cart items yet.
      const order = await prisma.$transaction(async (tx) => {
        for (const item of cartItems) {
          const [variant] = await tx.$queryRaw<Array<{ stock: number }>>`
            SELECT stock FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE
          `;
          if (!variant || variant.stock < item.quantity) {
            throw new AppError(
              `Insufficient stock for "${item.product.title}"`,
              400,
            );
          }
        }

        const newOrder = await tx.order.create({
          data: {
            userId,
            addressId,
            subTotal,
            tax,
            total,
            paymentMethod: "CREDIT_DEBIT_CARD",
            paymentStatus: "PROCESSING",
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

        // Decrement stock immediately so items are reserved
        for (const item of cartItems) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // Clear cart immediately (don't wait for webhook)
        await tx.cartItem.deleteMany({
          where: { userId, id: { in: selectedItemIds } },
        });

        return newOrder;
      });

      // 2. Create Stripe PaymentIntent
      try {
        const { stripe, getOrCreateStripeCustomer } =
          await import("@/lib/stripe");
        const stripeCustomerId = await getOrCreateStripeCustomer(userId);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100), // PKR in paisa
          currency: "pkr",
          customer: stripeCustomerId,
          payment_method: body.paymentMethodId,
          confirm: body.paymentMethodId ? true : false,
          return_url: `${process.env.APP_URL}/payment/success?orderId=${order.id}`,
          metadata: {
            orderId: order.id,
            userId,
            selectedItemIds: JSON.stringify(selectedItemIds),
          },
        });

        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentIntentId: paymentIntent.id,
            stripePaymentMethodId: body.paymentMethodId || null,
          },
        });

        return {
          order: updatedOrder,
          clientSecret: paymentIntent.client_secret,
          requiresRedirect:
            paymentIntent.status === "requires_action" ||
            paymentIntent.status === "requires_source_action",
        };
      } catch (stripeError: unknown) {
        // Card declined — keep order PENDING, and update paymentStatus to FAILED.
        // Save the PI ID if Stripe created it before declining.
        const errObj = stripeError as {
          message?: string;
          raw?: { payment_intent?: { id?: string } };
        };
        const piId: string | undefined = errObj?.raw?.payment_intent?.id;
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            status: "PENDING",
            ...(piId ? { paymentIntentId: piId } : {}),
          },
        });
        // Return declined info — do NOT throw. Client will redirect to /payment/failed.
        return {
          order,
          declined: true,
          declineError: errObj.message || "Your card was declined.",
        };
      }
    } else {
      // CASH_ON_DELIVERY flow (unchanged stock decrement + delete cart)
      const order = await prisma.$transaction(async (tx) => {
        for (const item of cartItems) {
          const [variant] = await tx.$queryRaw<Array<{ stock: number }>>`
            SELECT stock FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE
          `;
          if (!variant || variant.stock < item.quantity) {
            throw new AppError(
              `Insufficient stock for "${item.product.title}"`,
              400,
            );
          }
        }

        const newOrder = await tx.order.create({
          data: {
            userId,
            addressId,
            subTotal,
            tax,
            total,
            paymentMethod: "CASH_ON_DELIVERY",
            paymentStatus: "PENDING",
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

        await tx.cartItem.deleteMany({
          where: { userId, id: { in: selectedItemIds } },
        });

        return newOrder;
      });

      createNotification(
        userId,
        "ORDER_PLACED",
        "Order Placed Successfully",
        `Your order #${order.id.slice(0, 8)} has been placed.`,
        { orderId: order.id },
      );

      return { order };
    }
  }

  static async reorder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, status: "CANCELLED" },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new AppError("Cancelled order not found", 404);
    }

    const skippedItems: Array<{ title: string }> = [];
    const adjustedItems: Array<{
      title: string;
      requestedQty: number;
      addedQty: number;
    }> = [];
    let addedCount = 0;

    for (const item of order.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null },
      });

      if (!product) {
        skippedItems.push({ title: item.product?.title || "Deleted Product" });
        continue;
      }

      // Find variant in DB by color name & size name & productId
      const variant = await prisma.productVariant.findFirst({
        where: {
          productId: item.productId,
          color: { name: item.colorName },
          size: { name: item.sizeName },
        },
      });

      if (!variant || variant.stock === 0) {
        skippedItems.push({ title: product.title });
        continue;
      }

      let quantityToAdd = item.quantity;
      if (variant.stock < item.quantity) {
        quantityToAdd = variant.stock;
        adjustedItems.push({
          title: product.title,
          requestedQty: item.quantity,
          addedQty: variant.stock,
        });
      }

      // Upsert into CartItem
      await prisma.cartItem.upsert({
        where: {
          userId_productId_variantId: {
            userId,
            productId: item.productId,
            variantId: variant.id,
          },
        },
        create: {
          userId,
          productId: item.productId,
          variantId: variant.id,
          quantity: quantityToAdd,
        },
        update: {
          quantity: {
            set: quantityToAdd, // set to max allowed quantity, or update to it
          },
        },
      });

      addedCount++;
    }

    return {
      success: true,
      addedCount,
      skippedItems,
      adjustedItems,
    };
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

    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        address: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }
    return order;
  }

  static async retryPayment(
    userId: string,
    orderId: string,
    body: {
      addressId: string;
      paymentMethod: "CASH_ON_DELIVERY" | "CREDIT_DEBIT_CARD";
      paymentMethodId?: string;
    },
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.status !== "PENDING" || order.paymentStatus === "PAID") {
      throw new AppError("Payment cannot be retried for this order", 400);
    }

    const paymentMethod = body.paymentMethod || "CASH_ON_DELIVERY";

    // Update order address if it changed
    if (body.addressId && body.addressId !== order.addressId) {
      const address = await prisma.address.findFirst({
        where: { id: body.addressId, userId },
      });
      if (!address) throw new AppError("Invalid address", 400);
      await prisma.order.update({
        where: { id: orderId },
        data: { addressId: body.addressId },
      });
    }

    if (paymentMethod === "CREDIT_DEBIT_CARD") {
      try {
        const { stripe, getOrCreateStripeCustomer } =
          await import("@/lib/stripe");
        const stripeCustomerId = await getOrCreateStripeCustomer(userId);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(Number(order.total) * 100),
          currency: "pkr",
          customer: stripeCustomerId,
          payment_method: body.paymentMethodId,
          confirm: body.paymentMethodId ? true : false,
          return_url: `${process.env.APP_URL}/payment/success?orderId=${order.id}`,
          metadata: {
            orderId: order.id,
            userId,
          },
        });

        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentMethod: "CREDIT_DEBIT_CARD",
            paymentStatus: "PROCESSING",
            paymentIntentId: paymentIntent.id,
            stripePaymentMethodId: body.paymentMethodId || null,
          },
        });

        return {
          order: updatedOrder,
          clientSecret: paymentIntent.client_secret,
          requiresRedirect:
            paymentIntent.status === "requires_action" ||
            paymentIntent.status === "requires_source_action",
        };
      } catch (stripeError: unknown) {
        const errObj = stripeError as {
          message?: string;
          raw?: { payment_intent?: { id?: string } };
        };
        const piId: string | undefined = errObj?.raw?.payment_intent?.id;
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentMethod: "CREDIT_DEBIT_CARD",
            paymentStatus: "FAILED",
            status: "PENDING",
            ...(piId ? { paymentIntentId: piId } : {}),
          },
        });
        return {
          order,
          declined: true,
          declineError: errObj.message || "Your card was declined.",
        };
      }
    } else {
      // CASH_ON_DELIVERY
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: "CASH_ON_DELIVERY",
          paymentStatus: "PENDING",
          status: "PENDING",
          paymentIntentId: null,
          stripePaymentMethodId: null,
        },
      });

      return { order: updatedOrder };
    }
  }
}
