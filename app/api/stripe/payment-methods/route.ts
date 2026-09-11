import { StripeController } from "@/controllers/stripe.controller";

export async function GET(req: Request) {
  return StripeController.getPaymentMethods(req);
}

export async function POST(req: Request) {
  return StripeController.addPaymentMethod(req);
}
