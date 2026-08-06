import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: { color: true, size: true }
        }
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    logger.error({ err: error }, "Admin Product Fetch Error");
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, price, image, variants } = body;

    if (!title || !price || !variants || variants.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // First, update the product basic info
      await tx.product.update({
        where: { id },
        data: {
          title,
          description: description || "",
          price,
          ...(image && { image }),
        },
      });

      // Handle variants (naive approach: delete all existing, recreate)
      // A more robust approach would be to update existing ones, but this is simpler for MVP
      await tx.productVariant.deleteMany({
        where: { productId: id }
      });

      await tx.productVariant.createMany({
        data: variants.map((v: { colorId: string; sizeId: string; stock: string | number }) => ({
          productId: id,
          colorId: v.colorId,
          sizeId: v.sizeId,
          stock: Number(v.stock)
        }))
      });

      return await tx.product.findUnique({
        where: { id },
        include: { variants: { include: { color: true, size: true } } }
      });
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    logger.error({ err: error }, "Admin Product Update Error");
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: "Product deleted successfully" });
  } catch (error) {
    logger.error({ err: error }, "Admin Product Delete Error");
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
