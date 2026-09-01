import { prisma } from "@/lib/db";
import { addressSchema, patchAddressSchema } from "@/lib/validations/main";
import { z } from "zod";
import { AppError } from "@/lib/api-error";

export class AddressService {
  static async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  static async addAddress(userId: string, body: z.infer<typeof addressSchema>) {
    const parsed = addressSchema.parse(body);

    // Check if this is the first address
    const count = await prisma.address.count({ where: { userId } });
    const isFirst = count === 0;

    // If setting as default, or if it's the first address, we might need a transaction
    const shouldBeDefault = parsed.isDefault || isFirst;

    return prisma.$transaction(async (tx) => {
      if (shouldBeDefault && !isFirst) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          ...parsed,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  static async updateAddress(
    userId: string,
    addressId: string,
    body: z.infer<typeof patchAddressSchema>,
  ) {
    const parsed = patchAddressSchema.parse(body);

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new AppError("Address not found", 404);
    }

    return prisma.$transaction(async (tx) => {
      if (parsed.isDefault) {
        await tx.address.updateMany({
          where: { userId, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: parsed,
      });
    });
  }

  static async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({
      where: { id: addressId },
      include: { orders: true },
    });

    if (!address || address.userId !== userId) {
      throw new AppError("Address not found", 404);
    }

    // Instead of completely preventing deletion if used in orders, Prisma might restrict if we have restrict set.
    // However, our schema says Order has no onDelete action defined on address.
    // Wait, Address -> Order relation:
    // `address Address @relation(fields: [addressId], references: [id])`
    // This is Restrict by default. So we can't delete if orders are attached.
    // We should just let prisma throw if it's in use, or we can soft-delete if we implement it, but for now let's just delete.

    return prisma.address.delete({
      where: { id: addressId },
    });
  }
}
