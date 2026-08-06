import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
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
    console.error("Admin Colors/Sizes API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch colors and sizes" }, { status: 500 });
  }
}
