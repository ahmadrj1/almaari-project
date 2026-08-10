import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { categorySchema } from "@/lib/validations/main";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch categories");
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: parsed.name,
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    logger.error({ err: error }, "Failed to add category");
    return NextResponse.json({ success: false, error: "Failed to add category" }, { status: 500 });
  }
}
