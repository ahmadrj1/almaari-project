import { OrderController } from "@/controllers/order.controller";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  return OrderController.reorder(req, ctx);
}
