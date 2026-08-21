import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ADMIN_PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";
import { AppError } from "@/lib/api-error";
import { createBroadcastNotification } from "@/lib/notifications";

export class AdminProductService {
  static async getProducts({ search, page, limit = ADMIN_PRODUCTS_PER_PAGE_DEFAULT }: { search: string; page: number; limit?: number }) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ 
        where, 
        orderBy: { createdAt: "desc" },
        skip, 
        take: limit,
        include: {
          variants: {
            include: { color: true }
          }
        }
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithStock = products.map(product => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      return { ...product, totalStock };
    });

    return { products: productsWithStock, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
    const { title, description, price, image, categoryId, variants, images } = body;

    if (!title || !price || !image || !variants || variants.length === 0) {
      throw new AppError("Missing required fields", 400);
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

    createBroadcastNotification(
      "NEW_PRODUCT",
      "New Product Available!",
      `${title} is now available in our store.`,
      { productId: newProduct.id }
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
          include: { color: true, size: true }
        }
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
    }
  ) {
    const { title, description, price, image, categoryId, variants, images } = body;

    if (!title || !price || !variants || variants.length === 0) {
      throw new AppError("Missing required fields", 400);
    }

    return prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          title,
          description: description || "",
          price,
          categoryId: categoryId || null,
          ...(image && { image }),
        },
      });

      // Upsert each variant to preserve existing IDs (and cascaded CartItems)
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, colorId: true, sizeId: true },
      });
      const existingMap = new Map(
        existingVariants.map((v) => [`${v.colorId}:${v.sizeId}`, v.id])
      );

      const incomingKeys = new Set(
        variants.map((v: { colorId: string; sizeId: string; stock: string | number }) => `${v.colorId}:${v.sizeId}`)
      );

      // Delete variants not present in the incoming list
      const idsToDelete = existingVariants
        .filter((v) => !incomingKeys.has(`${v.colorId}:${v.sizeId}`))
        .map((v) => v.id);
      if (idsToDelete.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: idsToDelete } } });
      }

      // Upsert each incoming variant
      for (const v of variants) {
        const existingId = existingMap.get(`${v.colorId}:${v.sizeId}`);
        if (existingId) {
          await tx.productVariant.update({
            where: { id: existingId },
            data: { stock: Number(v.stock) },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              colorId: v.colorId,
              sizeId: v.sizeId,
              stock: Number(v.stock),
            },
          });
        }
      }

      if (images) {
        await tx.productImage.deleteMany({
          where: { productId: id }
        });
        await tx.productImage.createMany({
          data: images.map((img: { url: string; colorId: string | null }, idx: number) => ({
            productId: id,
            colorId: img.colorId || null,
            url: img.url,
            sortOrder: idx
          }))
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: true,
          variants: { include: { color: true, size: true } }
        }
      });
    });
  }

  static async deleteProduct(id: string) {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    });
    return "Product deleted successfully";
  }
}
