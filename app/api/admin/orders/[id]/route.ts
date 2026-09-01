import { AdminOrderController } from "@/controllers/admin-order.controller";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AdminOrderController.updateOrderStatus(req, id);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return AdminOrderController.getOrderById(req, id);
}
