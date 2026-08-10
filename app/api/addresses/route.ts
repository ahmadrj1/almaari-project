import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addressSchema } from "@/lib/validations/main";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch addresses");
    return NextResponse.json({ success: false, error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = addressSchema.parse(body);

    const address = await prisma.address.create({
      data: {
        userId,
        ...parsed,
      },
    });

    return NextResponse.json({ success: true, data: address });
  } catch (error) {
    logger.error({ err: error }, "Failed to add address");
    return NextResponse.json({ success: false, error: "Failed to add address" }, { status: 500 });
  }
}
