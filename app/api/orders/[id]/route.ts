import { OrderController } from "@/controllers/order.controller";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return OrderController.getOrderById(req, id);
}
