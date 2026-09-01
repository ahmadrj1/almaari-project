import { NextResponse } from "next/server";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { OrderService } from "@/services/order.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await OrderService.reorder(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "reorder-route");
  }
}
