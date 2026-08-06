import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ success: true, count: 0 });

    const count = await prisma.cartItem.count({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json({ success: true, count: 0 });
  }
}
