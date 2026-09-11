import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";

function buildProductSearchWhere(
  search: string,
): Prisma.ProductWhereInput | undefined {
  const trimmed = search ? search.trim().replace(/\s+/g, " ") : "";
  if (!trimmed) return undefined;

  const words = trimmed.split(" ").filter(Boolean);

  const getWordCondition = (w: string): Prisma.ProductWhereInput => ({
    OR: [
      { title: { contains: w, mode: "insensitive" } },
      { description: { contains: w, mode: "insensitive" } },
      { category: { name: { contains: w, mode: "insensitive" } } },
      {
        variants: {
          some: {
            OR: [
              { color: { name: { contains: w, mode: "insensitive" } } },
              { size: { name: { contains: w, mode: "insensitive" } } },
            ],
          },
        },
      },
    ],
  });

  if (words.length === 1) {
    return getWordCondition(words[0]);
  }

  return {
    OR: [
      { title: { contains: trimmed, mode: "insensitive" } },
      { description: { contains: trimmed, mode: "insensitive" } },
      { category: { name: { contains: trimmed, mode: "insensitive" } } },
      {
        AND: words.map((w) => getWordCondition(w)),
      },
    ],
  };
}

export class ProductService {
  static async getProducts({
    search,
    sort,
    page,
    inStock,
    categoryId,
  }: {
    search: string;
    sort: string;
    page: number;
    inStock: boolean;
    categoryId?: string;
  }) {
    const limit = PRODUCTS_PER_PAGE_DEFAULT;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === "price_asc"
        ? [{ price: "asc" }, { id: "asc" }]
        : sort === "price_desc"
          ? [{ price: "desc" }, { id: "asc" }]
          : sort === "title_asc"
            ? [{ title: "asc" }, { id: "asc" }]
            : sort === "title_desc"
              ? [{ title: "desc" }, { id: "asc" }]
              : [{ createdAt: "desc" }, { id: "asc" }];

    const searchWhere = buildProductSearchWhere(search);
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(searchWhere ? searchWhere : {}),
    };

    if (inStock) {
      if (where.variants) {
        where.AND = [
          ...(Array.isArray(where.AND)
            ? where.AND
            : where.AND
              ? [where.AND]
              : []),
          { variants: { some: { stock: { gt: 0 } } } },
        ];
      } else {
        where.variants = { some: { stock: { gt: 0 } } };
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
          variants: {
            include: { color: true, size: true },
            orderBy: [
              { color: { name: "asc" } },
              { size: { sortOrder: "asc" } },
            ],
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    if (variantIds.length > 0) {
      const reservedList = await prisma.cartItem.groupBy({
        by: ["variantId"],
        _sum: { quantity: true },
        where: { variantId: { in: variantIds } },
      });
      const reservedMap = new Map(
        reservedList.map((r) => [r.variantId, r._sum.quantity || 0]),
      );
      products.forEach((p) => {
        p.variants.forEach((v) => {
          v.stock = Math.max(0, v.stock - (reservedMap.get(v.id) || 0));
        });
      });
    }

    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getProductsCursor({
    search,
    sort,
    cursor,
    direction = "next",
    limit,
    inStock,
    categoryId,
  }: {
    search: string;
    sort: string;
    cursor?: string;
    direction?: string;
    limit: number;
    inStock: boolean;
    categoryId?: string;
  }) {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === "price_asc"
        ? [{ price: "asc" }, { id: "asc" }]
        : sort === "price_desc"
          ? [{ price: "desc" }, { id: "asc" }]
          : sort === "title_asc"
            ? [{ title: "asc" }, { id: "asc" }]
            : sort === "title_desc"
              ? [{ title: "desc" }, { id: "asc" }]
              : [{ createdAt: "desc" }, { id: "asc" }];

    const searchWhere = buildProductSearchWhere(search);
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(searchWhere ? searchWhere : {}),
    };

    if (inStock) {
      if (where.variants) {
        where.AND = [
          ...(Array.isArray(where.AND)
            ? where.AND
            : where.AND
              ? [where.AND]
              : []),
          { variants: { some: { stock: { gt: 0 } } } },
        ];
      } else {
        where.variants = { some: { stock: { gt: 0 } } };
      }
    }

    const takeAmount = direction === "prev" ? -(limit + 1) : limit + 1;
    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: takeAmount,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: { color: true, size: true },
          orderBy: [{ color: { name: "asc" } }, { size: { sortOrder: "asc" } }],
        },
      },
    });

    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    if (variantIds.length > 0) {
      const reservedList = await prisma.cartItem.groupBy({
        by: ["variantId"],
        _sum: { quantity: true },
        where: { variantId: { in: variantIds } },
      });
      const reservedMap = new Map(
        reservedList.map((r) => [r.variantId, r._sum.quantity || 0]),
      );
      products.forEach((p) => {
        p.variants.forEach((v) => {
          v.stock = Math.max(0, v.stock - (reservedMap.get(v.id) || 0));
        });
      });
    }

    const hasMore = products.length > limit;
    if (hasMore) {
      if (direction === "prev") products.shift();
      else products.pop();
    }

    const nextCursor =
      direction === "prev"
        ? cursor
          ? (products[products.length - 1]?.id ?? null)
          : null
        : hasMore
          ? (products[products.length - 1]?.id ?? null)
          : null;

    const prevCursor =
      direction === "prev"
        ? hasMore
          ? (products[0]?.id ?? null)
          : null
        : cursor
          ? (products[0]?.id ?? null)
          : null;

    return { products, nextCursor, prevCursor };
  }

  static async getDemoProducts() {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: { color: true, size: true },
        },
      },
    });

    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    if (variantIds.length > 0) {
      const reservedList = await prisma.cartItem.groupBy({
        by: ["variantId"],
        _sum: { quantity: true },
        where: { variantId: { in: variantIds } },
      });
      const reservedMap = new Map(
        reservedList.map((r) => [r.variantId, r._sum.quantity || 0]),
      );
      products.forEach((p) => {
        p.variants.forEach((v) => {
          v.stock = Math.max(0, v.stock - (reservedMap.get(v.id) || 0));
        });
      });
    }

    return products;
  }
}
