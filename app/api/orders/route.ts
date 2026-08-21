import { OrderController } from "@/controllers/order.controller";

export async function POST(req: Request) {
  return OrderController.createOrder(req);
}

export async function GET(req: Request) {
  return OrderController.getOrders(req);
}
