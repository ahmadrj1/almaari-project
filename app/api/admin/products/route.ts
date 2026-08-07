import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";
import { PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || String(PRODUCTS_PER_PAGE_DEFAULT));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ 
        where, 
        orderBy: { createdAt: "desc" },
        skip, 
        take: limit,
        include: {
          variants: {
            include: {
              color: true
            }
          }
        }
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithStock = products.map(product => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      return { ...product, totalStock };
    });

    return NextResponse.json({
      success: true,
      data: { products: productsWithStock, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error({ err: error }, "Admin Products API Error");
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, price, image, categoryId, variants, images } = body;

    if (!title || !price || !image || !variants || variants.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title,
          description: description || "",
          price,
          image,
          categoryId: categoryId || null,
          variants: {
            create: variants.map((v: { colorId: string; sizeId: string; stock: string | number }) => ({
              colorId: v.colorId,
              sizeId: v.sizeId,
              stock: Number(v.stock)
            }))
          },
          images: images ? {
            create: images.map((img: { url: string; colorId: string | null }, idx: number) => ({
              colorId: img.colorId || null,
              url: img.url,
              sortOrder: idx
            }))
          } : undefined
        },
        include: { variants: true, images: true }
      });
      return product;
    });

    return NextResponse.json({ success: true, data: newProduct });
  } catch (error) {
    logger.error({ err: error }, "Admin Products Create API Error");
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}
