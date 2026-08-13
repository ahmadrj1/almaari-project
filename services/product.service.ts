import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";

export class ProductService {
  static async getProducts({ search, sort, page, inStock }: { search: string, sort: string, page: number, inStock: boolean }) {
    const limit = PRODUCTS_PER_PAGE_DEFAULT;
    const skip = (page - 1) * limit;

    const orderBy: Record<string, string> =
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      sort === "title_asc" ? { title: "asc" } :
      sort === "title_desc" ? { title: "desc" } :
      { createdAt: "desc" };

    const where: Prisma.ProductWhereInput = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (inStock) {
      where.variants = { some: { stock: { gt: 0 } } };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ 
        where, orderBy, skip, take: limit,
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: {
            include: { color: true, size: true },
            orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }]
          }
        }
      }),
      prisma.product.count({ where }),
    ]);

    return { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getDemoProducts() {
    return prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
    });
  }
}
