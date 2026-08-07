import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PRODUCTS_PER_PAGE_DEFAULT, DEFAULT_SORT } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const sort = url.searchParams.get("sort") || DEFAULT_SORT;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || String(PRODUCTS_PER_PAGE_DEFAULT));
    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> =
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      sort === "title_asc" ? { title: "asc" } :
      sort === "title_desc" ? { title: "desc" } :
      { createdAt: "desc" };

    const inStock = url.searchParams.get("inStock") === "true";
    const categoryId = url.searchParams.get("categoryId");

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (inStock) {
      where.variants = { some: { stock: { gt: 0 } } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ 
        where, 
        orderBy, 
        skip, 
        take: limit,
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: 'asc' }
          },
          variants: {
            include: { color: true, size: true },
            orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }]
          }
        }
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error("Products API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function QUERY(req: Request) {
  return GET(req);
}
