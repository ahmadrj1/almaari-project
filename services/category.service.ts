import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validations/main";
import { z } from "zod";

export class CategoryService {
  static async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async addCategory(body: z.infer<typeof categorySchema>) {
    const parsed = categorySchema.parse(body);
    return prisma.category.create({
      data: {
        name: parsed.name,
      },
    });
  }
}
