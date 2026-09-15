import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ADMIN_PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createBroadcastNotification } from "@/lib/notifications";
import { extractTitlePrefix, generateVariantSku } from "@/lib/sku";

export class AdminProductService {
  static async getProducts({
    search,
    page,
    limit = ADMIN_PRODUCTS_PER_PAGE_DEFAULT,
  }: {
    search: string;
    page: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;

    const trimmed = search ? search.trim() : "";
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (trimmed) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      const getWordCondition = (w: string): Prisma.ProductWhereInput => ({
        OR: [
          { title: { contains: w, mode: "insensitive" } },
          { titlePrefix: { contains: w, mode: "insensitive" } },
          { code: { contains: w, mode: "insensitive" } },
          { description: { contains: w, mode: "insensitive" } },
          { category: { name: { contains: w, mode: "insensitive" } } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: w, mode: "insensitive" } },
                  { color: { name: { contains: w, mode: "insensitive" } } },
                  { color: { code: { contains: w, mode: "insensitive" } } },
                  { size: { name: { contains: w, mode: "insensitive" } } },
                ],
              },
            },
          },
        ],
      });

      if (words.length === 1) {
        where.OR = [
          ...((getWordCondition(words[0]).OR as Prisma.ProductWhereInput[]) ||
            []),
          {
            variants: {
              some: {
                sku: { contains: trimmed, mode: "insensitive" },
              },
            },
          },
        ];
      } else {
        where.OR = [
          { title: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
          { category: { name: { contains: trimmed, mode: "insensitive" } } },
          {
            variants: {
              some: {
                sku: { contains: trimmed, mode: "insensitive" },
              },
            },
          },
          {
            AND: words.map((w) => getWordCondition(w)),
          },
        ];
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [products, total, totalProducts, addedLast24Hours] =
      await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            variants: {
              include: { color: true, size: true },
            },
          },
        }),
        prisma.product.count({ where }),
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.product.count({
          where: {
            deletedAt: null,
            createdAt: { gte: twentyFourHoursAgo },
          },
        }),
      ]);

    const productsWithStock = products.map((product) => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      return { ...product, totalStock };
    });

    return {
      products: productsWithStock,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        totalProducts,
        addedLast24Hours,
      },
    };
  }

  static async createProduct(body: {
    title: string;
    description?: string;
    price: number;
    image: string;
    categoryId?: string | null;
    variants: { colorId: string; sizeId: string; stock: string | number }[];
    images?: { url: string; colorId: string | null }[];
  }) {
    const { title, description, price, image, categoryId, variants, images } =
      body;

    if (!title || !price || !image || !variants || variants.length === 0) {
      throw new AppError("Missing required fields", 400);
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const titlePrefix = extractTitlePrefix(title);

      // Advisory transaction lock to prevent race condition
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        titlePrefix,
      );

      const existingProducts = await tx.product.findMany({
        where: { titlePrefix },
        select: { code: true },
      });

      let maxCode = 0;
      for (const p of existingProducts) {
        const num = parseInt(p.code, 10);
        if (!isNaN(num) && num > maxCode) {
          maxCode = num;
        }
      }
      const code = String(maxCode + 1).padStart(3, "0");

      const [colors, sizes] = await Promise.all([
        tx.color.findMany(),
        tx.size.findMany(),
      ]);
      const colorMap = new Map(colors.map((c) => [c.id, c.code]));
      const sizeMap = new Map(sizes.map((s) => [s.id, s.name]));

      const product = await tx.product.create({
        data: {
          title,
          titlePrefix,
          code,
          description: description || "",
          price,
          image,
          categoryId: categoryId || null,
          variants: {
            create: variants.map(
              (v: {
                colorId: string;
                sizeId: string;
                stock: string | number;
              }) => {
                const colCode = colorMap.get(v.colorId) || "DEF";
                const sizeCode = sizeMap.get(v.sizeId) || "STD";
                const sku = generateVariantSku(
                  titlePrefix,
                  code,
                  sizeCode,
                  colCode,
                );
                return {
                  colorId: v.colorId,
                  sizeId: v.sizeId,
                  stock: Number(v.stock),
                  sku,
                };
              },
            ),
          },
          images: images
            ? {
                create: images.map(
                  (
                    img: { url: string; colorId: string | null },
                    idx: number,
                  ) => ({
                    colorId: img.colorId || null,
                    url: img.url,
                    sortOrder: idx,
                  }),
                ),
              }
            : undefined,
        },
        include: {
          variants: { include: { color: true, size: true } },
          images: true,
        },
      });
      return product;
    });

    createBroadcastNotification(
      "NEW_PRODUCT",
      "New Product Available!",
      `${title} is now available in our store.`,
      { productId: newProduct.id },
    );

    return newProduct;
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: true,
        variants: {
          include: { color: true, size: true },
        },
      },
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return product;
  }

  static async updateProduct(
    id: string,
    body: {
      title: string;
      description?: string;
      price: number;
      image?: string;
      categoryId?: string | null;
      variants: { colorId: string; sizeId: string; stock: string | number }[];
      images?: { url: string; colorId: string | null }[];
    },
  ) {
    const { title, description, price, image, categoryId, variants, images } =
      body;

    if (!title || !price || !variants || variants.length === 0) {
      throw new AppError("Missing required fields", 400);
    }

    return prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id },
      });
      if (!existingProduct) {
        throw new AppError("Product not found", 404);
      }

      const newTitlePrefix = extractTitlePrefix(title);
      let finalTitlePrefix = existingProduct.titlePrefix;
      let finalCode = existingProduct.code;

      if (newTitlePrefix !== existingProduct.titlePrefix) {
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          newTitlePrefix,
        );
        const samePrefixProducts = await tx.product.findMany({
          where: { titlePrefix: newTitlePrefix },
          select: { code: true },
        });
        let maxCode = 0;
        for (const p of samePrefixProducts) {
          const num = parseInt(p.code, 10);
          if (!isNaN(num) && num > maxCode) maxCode = num;
        }
        finalCode = String(maxCode + 1).padStart(3, "0");
        finalTitlePrefix = newTitlePrefix;
      }

      await tx.product.update({
        where: { id },
        data: {
          title,
          titlePrefix: finalTitlePrefix,
          code: finalCode,
          description: description || "",
          price,
          categoryId: categoryId || null,
          ...(image && { image }),
        },
      });

      const [colors, sizes] = await Promise.all([
        tx.color.findMany(),
        tx.size.findMany(),
      ]);
      const colorMap = new Map(colors.map((c) => [c.id, c.code]));
      const sizeMap = new Map(sizes.map((s) => [s.id, s.name]));

      // Upsert each variant to preserve existing IDs (and cascaded CartItems)
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, colorId: true, sizeId: true },
      });
      const existingMap = new Map(
        existingVariants.map((v) => [`${v.colorId}:${v.sizeId}`, v.id]),
      );

      const incomingKeys = new Set(
        variants.map(
          (v: { colorId: string; sizeId: string; stock: string | number }) =>
            `${v.colorId}:${v.sizeId}`,
        ),
      );

      // Delete variants not present in the incoming list
      const idsToDelete = existingVariants
        .filter((v) => !incomingKeys.has(`${v.colorId}:${v.sizeId}`))
        .map((v) => v.id);
      if (idsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Upsert each incoming variant
      for (const v of variants) {
        const colCode = colorMap.get(v.colorId) || "DEF";
        const sizeCode = sizeMap.get(v.sizeId) || "STD";
        const sku = generateVariantSku(
          finalTitlePrefix,
          finalCode,
          sizeCode,
          colCode,
        );

        const existingId = existingMap.get(`${v.colorId}:${v.sizeId}`);
        if (existingId) {
          await tx.productVariant.update({
            where: { id: existingId },
            data: {
              stock: Number(v.stock),
              sku,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              colorId: v.colorId,
              sizeId: v.sizeId,
              stock: Number(v.stock),
              sku,
            },
          });
        }
      }

      if (images) {
        await tx.productImage.deleteMany({
          where: { productId: id },
        });
        await tx.productImage.createMany({
          data: images.map(
            (img: { url: string; colorId: string | null }, idx: number) => ({
              productId: id,
              colorId: img.colorId || null,
              url: img.url,
              sortOrder: idx,
            }),
          ),
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: true,
          variants: { include: { color: true, size: true } },
        },
      });
    });
  }

  static async deleteProduct(id: string) {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
    return "Product deleted successfully";
  }
}
