import { loadStripe } from "@stripe/stripe-js";
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

console.log("Current Key:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
