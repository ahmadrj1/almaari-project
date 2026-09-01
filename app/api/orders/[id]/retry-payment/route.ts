import { OrderController } from "@/controllers/order.controller";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return OrderController.retryPayment(req, id);
}
