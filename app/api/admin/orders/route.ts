import { AdminOrderController } from "@/controllers/admin-order.controller";

export async function GET(req: Request) {
  return AdminOrderController.getOrders(req);
}
