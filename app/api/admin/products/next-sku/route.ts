import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractTitlePrefix } from "@/lib/sku";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const title = url.searchParams.get("title") || "";
    const titlePrefix = extractTitlePrefix(title);

    const products = await prisma.product.findMany({
      where: { titlePrefix },
      select: { code: true },
    });

    let maxCode = 0;
    for (const p of products) {
      const num = parseInt(p.code, 10);
      if (!isNaN(num) && num > maxCode) {
        maxCode = num;
      }
    }

    const nextCode = String(maxCode + 1).padStart(3, "0");

    return NextResponse.json({
      success: true,
      data: {
        titlePrefix,
        nextCode,
      },
    });
  } catch (error) {
    console.error("[NEXT SKU ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate next SKU code" },
      { status: 500 },
    );
  }
}
