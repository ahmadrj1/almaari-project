import { prisma } from "@/lib/db";

export class AdminColorsSizesService {
  static async getColorsSizes() {
    const [colors, sizes] = await Promise.all([
      prisma.color.findMany({ orderBy: { name: "asc" } }),
      prisma.size.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    return { colors, sizes };
  }
}
