import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(pi);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(pi);
        break;
      }
    }
  } catch (err: unknown) {
    console.error("Error handling webhook event:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(pi: Stripe.PaymentIntent) {
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

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return;
  if (order.paymentStatus === "PAID") return; // Don't touch paid orders

  // Stripe fires payment_intent.payment_failed on each attempt.
  // It only cancels the PaymentIntent (status = "canceled") when all retries
  // are exhausted. Until then, keep order PROCESSING.
  const isFinalFailure = pi.status === "canceled";

  if (isFinalFailure) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (!current || current.paymentStatus === "FAILED") return;

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "FAILED", status: "CANCELLED" },
      });

      // Restore stock since the order is definitively cancelled
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
    // Temporary failure — Stripe will retry (up to 2 more times, 3-day gaps)
    // Order stays PENDING, paymentStatus becomes FAILED, stock remains decremented
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
