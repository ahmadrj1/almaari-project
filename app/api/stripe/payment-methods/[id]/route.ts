import { StripeController } from "@/controllers/stripe.controller";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return StripeController.deletePaymentMethod(req, id);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return StripeController.setDefaultPaymentMethod(req, id);
}
