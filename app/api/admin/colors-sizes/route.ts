import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getServerSessionSnapshot } from "@/lib/auth-session";

export async function GET() {
  try {
    const session = await getServerSessionSnapshot();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const [colors, sizes] = await Promise.all([
      prisma.color.findMany({ orderBy: { name: 'asc' } }),
      prisma.size.findMany({ orderBy: { sortOrder: 'asc' } })
    ]);

    return NextResponse.json({
      success: true,
      data: { colors, sizes }
    });
  } catch (error) {
    logger.error({ err: error }, "Admin Colors/Sizes API Error");
    return NextResponse.json({ success: false, error: "Failed to fetch colors and sizes" }, { status: 500 });
  }
}
