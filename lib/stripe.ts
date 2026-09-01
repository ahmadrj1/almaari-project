import Stripe from "stripe";
import { prisma } from "./db";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-08-26.dahlia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

// Convenience export used throughout the codebase
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: keyof Stripe) {
    return getStripe()[prop];
  },
});

export async function getOrCreateStripeCustomer(
  userId: string,
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user!.email,
    name: user!.fullName,
    metadata: { userId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
