import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validations/main";

export class CategoryService {
  static async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async addCategory(body: any) {
    const parsed = categorySchema.parse(body);
    return prisma.category.create({
      data: {
        name: parsed.name,
      },
    });
  }
}
