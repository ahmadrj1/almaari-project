import Stripe from "stripe";

const DECLINE_MAP: Record<string, string> = {
  insufficient_funds:
    "Your card has insufficient funds. Please use a different card.",
  card_declined:
    "Your card was declined. Please check your details or use a different card.",
  expired_card: "Your card has expired. Please update your payment method.",
  incorrect_cvc: "The security code (CVC) is incorrect.",
  processing_error: "A processing error occurred. Please try again.",
  do_not_honor:
    "Your card issuer declined this transaction. Please contact your bank.",
  lost_card: "This card has been reported lost. Please use a different card.",
  stolen_card: "This card cannot be used. Please use a different card.",
};

export function getStripeErrorMessage(
  error: Stripe.errors.StripeError | null,
): string {
  if (!error) return "Payment failed. Please try again.";
  const code = error.decline_code || error.code || "";
  return (
    DECLINE_MAP[code] ?? error.message ?? "Payment failed. Please try again."
  );
}
