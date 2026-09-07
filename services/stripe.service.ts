import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import Stripe from "stripe";

export class StripeService {
  static async getPaymentMethods(userId: string) {
    const customerId = await getOrCreateStripeCustomer(userId);
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return {
        paymentMethods: [],
        defaultPaymentMethodId: null,
      };
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const defaultPaymentMethodId =
      (customer.invoice_settings?.default_payment_method as string | null) ||
      null;

    return {
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
      defaultPaymentMethodId,
    };
  }

  static async addPaymentMethod(
    userId: string,
    payload: { paymentMethodId: string; setAsDefault?: boolean },
  ) {
    const { paymentMethodId, setAsDefault } = payload;
    if (!paymentMethodId) {
      throw new AppError("Payment method ID is required", 400);
    }

    const customerId = await getOrCreateStripeCustomer(userId);

    const incomingPm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const incomingFingerprint = incomingPm.card?.fingerprint;

    const existingPms = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    if (existingPms.data.length >= 5) {
      throw new AppError("MAX_CARDS_REACHED", 400);
    }

    if (incomingFingerprint) {
      const isDuplicate = existingPms.data.some(
        (pm) => pm.card?.fingerprint === incomingFingerprint,
      );
      if (isDuplicate) {
        throw new AppError("DUPLICATE_CARD", 409);
      }
    }

    const attachedPm = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    return {
      id: attachedPm.id,
      brand: attachedPm.card?.brand,
      last4: attachedPm.card?.last4,
      expMonth: attachedPm.card?.exp_month,
      expYear: attachedPm.card?.exp_year,
    };
  }

  static async deletePaymentMethod(userId: string, paymentMethodId: string) {
    const customerId = await getOrCreateStripeCustomer(userId);

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      throw new AppError("Unauthorized", 401);
    }

    const customer = await stripe.customers.retrieve(customerId);

    if (!customer.deleted) {
      if (
        customer.invoice_settings?.default_payment_method === paymentMethodId
      ) {
        throw new AppError("Cannot delete the default payment method", 400);
      }
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    const customerUpdated = await stripe.customers.retrieve(customerId);
    if (
      !customerUpdated.deleted &&
      customerUpdated.invoice_settings?.default_payment_method ===
        paymentMethodId
    ) {
      const remainingPms = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
      const newDefault = remainingPms.data[0]?.id || undefined;
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: newDefault },
      });
    }

    return { success: true };
  }

  static async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ) {
    const customerId = await getOrCreateStripeCustomer(userId);
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return { success: true };
  }

  static async createSetupIntent(userId: string) {
    const customerId = await getOrCreateStripeCustomer(userId);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    return { clientSecret: setupIntent.client_secret };
  }

  static async handleWebhook(body: string, sig: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", msg);
      throw new AppError("Invalid signature", 400);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await StripeService.handlePaymentSuccess(pi);
          break;
        }
        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await StripeService.handlePaymentFailed(pi);
          break;
        }
      }
    } catch (err: unknown) {
      console.error("Error handling webhook event:", err);
      throw new AppError("Handler failed", 500);
    }

    return { received: true };
  }

  private static async handlePaymentSuccess(pi: Stripe.PaymentIntent) {
    const orderId = pi.metadata.orderId;
    if (!orderId) return;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "PAID") return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "PROCESSING",
      },
    });

    createNotification(
      order.userId,
      "ORDER_PLACED",
      "Payment Confirmed",
      `Payment confirmed for order #${order.id.slice(0, 8)}. Your order is now being processed.`,
      { orderId: order.id },
    );
  }

  private static async handlePaymentFailed(pi: Stripe.PaymentIntent) {
    const orderId = pi.metadata.orderId;
    if (!orderId) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;
    if (order.paymentStatus === "PAID") return;

    const isFinalFailure = pi.status === "canceled";

    if (isFinalFailure) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({ where: { id: orderId } });
        if (!current || current.paymentStatus === "FAILED") return;

        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: "FAILED", status: "CANCELLED" },
        });

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
      });

      createNotification(
        order.userId,
        "ORDER_STATUS_UPDATED",
        "Order Cancelled — Payment Failed",
        `All payment attempts failed for order #${order.id.slice(0, 8)}. Stock has been restored and the order cancelled.`,
        { orderId: order.id },
      );
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "FAILED",
          status: "PENDING",
        },
      });

      createNotification(
        order.userId,
        "ORDER_STATUS_UPDATED",
        "Payment Attempt Failed",
        `Your card payment for order #${order.id.slice(0, 8)} was declined. Stripe will retry automatically up to 2 more times with a 3-day gap. No action needed.`,
        { orderId: order.id },
      );
    }
  }
}
