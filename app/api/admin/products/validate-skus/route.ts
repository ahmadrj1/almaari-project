import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseSku } from "@/lib/sku";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const rawSkus: string[] = Array.isArray(body.skus) ? body.skus : [];
    const cleanSkus = Array.from(
      new Set(
        rawSkus
          .map((s) => (s ? String(s).trim().toUpperCase() : ""))
          .filter(Boolean),
      ),
    );

    if (cleanSkus.length === 0) {
      return NextResponse.json({
        success: true,
        data: { matched: {}, notFound: [], unmatched: [] },
      });
    }

    const productSelect = {
      id: true,
      title: true,
      titlePrefix: true,
      code: true,
      image: true,
      description: true,
      price: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      images: {
        select: {
          id: true,
          url: true,
          colorId: true,
          sortOrder: true,
          color: { select: { name: true } },
        },
        orderBy: { sortOrder: "asc" as const },
      },
    };

    const buildMatchedData = (
      prod: {
        id: string;
        title: string;
        titlePrefix: string;
        code: string;
        image: string;
        description: string;
        price: unknown;
        categoryId: string | null;
        category: { id: string; name: string } | null;
        images: Array<{
          id: string;
          url: string;
          colorId: string | null;
          sortOrder: number;
          color: { name: string } | null;
        }>;
      },
      variantSku?: string,
    ) => {
      let images = prod.images.map((img) => ({
        id: img.id,
        url: img.url,
        colorId: img.colorId,
        colorName: img.color?.name || null,
        sortOrder: img.sortOrder,
      }));

      if (images.length === 0 && prod.image) {
        images = [
          {
            id: `main-${prod.id}`,
            url: prod.image,
            colorId: null,
            colorName: null,
            sortOrder: 0,
          },
        ];
      }

      return {
        productId: prod.id,
        productTitle: prod.title,
        baseSku: `${prod.titlePrefix}-${prod.code}`,
        variantSku,
        image: prod.image,
        images,
        categoryId: prod.categoryId,
        categoryName: prod.category?.name || null,
      };
    };

    // 1. Search in ProductVariant by full SKU
    const matchedVariants = await prisma.productVariant.findMany({
      where: { sku: { in: cleanSkus } },
      include: {
        product: {
          select: productSelect,
        },
      },
    });

    const matchedMap: Record<string, ReturnType<typeof buildMatchedData>> = {};

    matchedVariants.forEach((v) => {
      matchedMap[v.sku] = buildMatchedData(v.product, v.sku);
    });

    // 2. For remaining unmatched SKUs, check if they are base SKUs (TITLE-CODE)
    const remaining = cleanSkus.filter((s) => !matchedMap[s]);
    for (const sku of remaining) {
      const parsed = parseSku(sku);
      if (parsed) {
        const prod = await prisma.product.findFirst({
          where: {
            titlePrefix: parsed.titlePrefix,
            code: parsed.code,
            deletedAt: null,
          },
          select: productSelect,
        });

        if (prod) {
          matchedMap[sku] = buildMatchedData(prod);
        }
      }
    }

    const notFound = cleanSkus.filter((s) => !matchedMap[s]);

    return NextResponse.json({
      success: true,
      data: {
        matched: matchedMap,
        notFound,
        unmatched: notFound,
      },
    });
  } catch (error) {
    console.error("[VALIDATE SKUS ERROR]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate SKUs" },
      { status: 500 },
    );
  }
}
