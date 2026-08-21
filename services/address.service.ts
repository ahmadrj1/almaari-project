import { prisma } from "@/lib/db";
import { addressSchema } from "@/lib/validations/main";
import { z } from "zod";

export class AddressService {
  static async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async addAddress(userId: string, body: z.infer<typeof addressSchema>) {
    const parsed = addressSchema.parse(body);
    return prisma.address.create({
      data: {
        userId,
        ...parsed,
      },
    });
  }
}
