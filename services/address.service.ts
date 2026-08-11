import { prisma } from "@/lib/db";
import { addressSchema } from "@/lib/validations/main";

export class AddressService {
  static async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async addAddress(userId: string, body: any) {
    const parsed = addressSchema.parse(body);
    return prisma.address.create({
      data: {
        userId,
        ...parsed,
      },
    });
  }
}
