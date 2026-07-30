import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
    })
    return NextResponse.json({ products })
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
