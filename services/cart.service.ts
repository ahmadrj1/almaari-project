import { prisma } from "@/lib/db";
import { CART_ITEM_EXPIRY_MS } from "@/lib/constants";
import { cartItemSchema, patchCartItemSchema, deleteCartItemSchema } from "@/lib/validations/main";
import { AppError } from "@/lib/api-error";
import { z } from "zod";

export class CartService {
  static async purgeExpiredCartItems(userId: string) {
    const expiryThreshold = new Date(Date.now() - CART_ITEM_EXPIRY_MS);
    await prisma.cartItem.deleteMany({
      where: { userId, updatedAt: { lt: expiryThreshold } },
    });
  }

  static async getCart(userId: string) {
    await this.purgeExpiredCartItems(userId);
    let items = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: { include: { color: true, size: true } } },
      orderBy: { createdAt: "desc" },
    });

    const adjustments: Array<{ title: string; oldQty: number; newQty: number }> = [];

    const variantIds = items.map((i) => i.variantId);
    if (variantIds.length > 0) {
      const reservedList = await prisma.cartItem.groupBy({
        by: ["variantId"],
        _sum: { quantity: true },
        where: { variantId: { in: variantIds }, userId: { not: userId } },
      });
      const reservedMap = new Map(reservedList.map((r) => [r.variantId, r._sum.quantity || 0]));
      
      const itemsToKeep: typeof items = [];

      for (const item of items) {
        const reservedByOthers = reservedMap.get(item.variantId) || 0;
        const available = Math.max(0, item.variant.stock - reservedByOthers);

        if (available <= 0) {
          adjustments.push({
            title: item.product.title,
            oldQty: item.quantity,
            newQty: 0,
          });
          await prisma.cartItem.delete({ where: { id: item.id } });
        } else if (item.quantity > available) {
          adjustments.push({
            title: item.product.title,
            oldQty: item.quantity,
            newQty: available,
          });
          const updated = await prisma.cartItem.update({
            where: { id: item.id },
            data: { quantity: available },
            include: { product: true, variant: { include: { color: true, size: true } } },
          });
          updated.variant.stock = available;
          itemsToKeep.push(updated);
        } else {
          item.variant.stock = available;
          itemsToKeep.push(item);
        }
      }
      items = itemsToKeep;
    }

    return { items, adjustments };
  }

  static async getCartCount(userId: string) {
    return prisma.cartItem.count({
      where: { userId },
    });
  }

  static async addToCart(userId: string, body: z.infer<typeof cartItemSchema>) {
    const { productId, variantId, quantity } = cartItemSchema.parse(body);

    return prisma.$transaction(async (tx) => {
      const [variant] = await tx.$queryRaw<Array<{ id: string; stock: number; productId: string }>>`
        SELECT id, stock, "productId" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE
      `;

      if (!variant || variant.productId !== productId) {
        throw new AppError("Variant not found", 404);
      }

      const productCheck = await tx.product.findUnique({
        where: { id: productId },
        select: { deletedAt: true }
      });

      if (!productCheck || productCheck.deletedAt) {
        throw new AppError("Product not found or unavailable", 404);
      }

      const reserved = await tx.cartItem.aggregate({
        where: { variantId },
        _sum: { quantity: true },
      });

      const currentUserItem = await tx.cartItem.findUnique({
        where: { userId_productId_variantId: { userId, productId, variantId } },
      });

      const reservedByOthers = (reserved._sum.quantity ?? 0) - (currentUserItem?.quantity ?? 0);
      const newQuantity = (currentUserItem?.quantity ?? 0) + quantity;

      if (reservedByOthers + newQuantity > variant.stock) {
        const available = variant.stock - reservedByOthers;
        throw new AppError(
          available <= 0 ? "This item is out of stock" : `Only ${available} items available in stock`,
          400
        );
      }

      if (currentUserItem) {
        return tx.cartItem.update({
          where: { id: currentUserItem.id },
          data: { quantity: newQuantity },
          include: { product: true, variant: { include: { color: true, size: true } } },
        });
      }

      return tx.cartItem.create({
        data: { userId, productId, variantId, quantity },
        include: { product: true, variant: { include: { color: true, size: true } } },
      });
    });
  }

  static async updateCartItem(userId: string, body: z.infer<typeof patchCartItemSchema>) {
    const { cartItemId, quantity } = patchCartItemSchema.parse(body);

    const existing = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true, variant: true },
    });

    if (!existing || existing.userId !== userId) {
      throw new AppError("Not found", 404);
    }

    const reserved = await prisma.cartItem.aggregate({
      where: { variantId: existing.variantId },
      _sum: { quantity: true },
    });
    
    const reservedByOthers = (reserved._sum.quantity ?? 0) - existing.quantity;
    const available = existing.variant.stock - reservedByOthers;

    if (quantity > available) {
      throw new AppError(
        available <= 0 ? "This item is out of stock" : `Only ${available} items available in stock`,
        400
      );
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
      return { deleted: true };
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: { product: true, variant: { include: { color: true, size: true } } },
    });
  }

  static async deleteCartItem(userId: string, body: z.infer<typeof deleteCartItemSchema>) {
    const { cartItemId } = deleteCartItemSchema.parse(body);

    const existing = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!existing || existing.userId !== userId) {
      throw new AppError("Not found", 404);
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return { deleted: true };
  }

  static async validateCartItems(userId: string, selectedItemIds: string[]) {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId, id: { in: selectedItemIds } },
      include: { product: true, variant: { include: { color: true, size: true } } },
    });

    const foundIds = new Set(cartItems.map((i) => i.id));
    const deletedItemIds = selectedItemIds.filter((id) => !foundIds.has(id));

    const issues: Array<{
      type: "reduced" | "out_of_stock" | "deleted";
      cartItemId: string;
      title?: string;
      color?: string;
      size?: string;
      requested?: number;
      available?: number;
    }> = deletedItemIds.map((cartItemId) => ({ type: "deleted" as const, cartItemId }));

    if (cartItems.length > 0) {
      const variantIds = cartItems.map((i) => i.variantId);
      const reservedList = await prisma.cartItem.groupBy({
        by: ["variantId"],
        _sum: { quantity: true },
        where: { variantId: { in: variantIds }, userId: { not: userId } },
      });
      const reservedMap = new Map(reservedList.map((r) => [r.variantId, r._sum.quantity || 0]));

      for (const item of cartItems) {
        const reservedByOthers = reservedMap.get(item.variantId) || 0;
        const available = Math.max(0, item.variant.stock - reservedByOthers);
        if (item.quantity > available) {
          issues.push({
            type: available === 0 ? "out_of_stock" : "reduced",
            cartItemId: item.id,
            title: item.product.title,
            color: item.variant.color.name,
            size: item.variant.size.name,
            requested: item.quantity,
            available,
          });
        }
      }
    }

    return issues;
  }
}
