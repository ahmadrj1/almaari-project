/**
 * @jest-environment node
 */

import { OrderService } from "@/services/order.service";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-error";

jest.mock("@/lib/db", () => ({
  prisma: {
    address: { findFirst: jest.fn() },
    cartItem: { findMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: { findFirst: jest.fn() },
    productVariant: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
  },
  getOrCreateStripeCustomer: jest.fn().mockResolvedValue("cus_123"),
}));

jest.mock("@/lib/notifications", () => ({
  createNotification: jest.fn(),
}));

const USER_ID = "user-1";
const ADDRESS_ID = "addr-1";

const mockAddress = { id: ADDRESS_ID, userId: USER_ID, street: "123 Main St" };
const mockVariant = { id: "var-1", stock: 10, colorId: "c1", sizeId: "s1" };
const mockCartItem = {
  id: "cart-item-1",
  userId: USER_ID,
  productId: "prod-1",
  variantId: "var-1",
  quantity: 2,
  updatedAt: new Date(),
  product: { id: "prod-1", title: "Test Shirt", price: "50.00" },
  variant: {
    id: "var-1",
    stock: 10,
    color: { name: "Red" },
    size: { name: "M" },
  },
};

describe("OrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder - CASH_ON_DELIVERY", () => {
    const body = {
      addressId: ADDRESS_ID,
      selectedItemIds: ["cart-item-1"],
      paymentMethod: "CASH_ON_DELIVERY" as const,
    };

    it("throws 400 if addressId is missing", async () => {
      await expect(
        OrderService.createOrder(USER_ID, { ...body, addressId: "" }),
      ).rejects.toThrow(new AppError("Address is required", 400));
    });

    it("throws 400 if selectedItemIds is empty", async () => {
      await expect(
        OrderService.createOrder(USER_ID, { ...body, selectedItemIds: [] }),
      ).rejects.toThrow(new AppError("No items selected", 400));
    });

    it("throws 400 if address is invalid for user", async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      await expect(OrderService.createOrder(USER_ID, body)).rejects.toThrow(
        new AppError("Invalid address", 400),
      );
    });

    it("throws 400 if cart is empty", async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(mockAddress);
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([]);

      await expect(OrderService.createOrder(USER_ID, body)).rejects.toThrow(
        new AppError("Cart is empty", 400),
      );
    });

    it("creates order and returns it for COD", async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(mockAddress);
      (prisma.cartItem.findMany as jest.Mock).mockResolvedValue([mockCartItem]);

      const mockOrder = {
        id: "order-1",
        userId: USER_ID,
        subTotal: 100,
        tax: 15,
        total: 115,
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "PENDING",
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        // Simulate transaction: call fn with a tx mock
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([{ stock: 10 }]),
          order: { create: jest.fn().mockResolvedValue(mockOrder) },
          productVariant: { update: jest.fn() },
          cartItem: { deleteMany: jest.fn() },
        };
        return fn(tx);
      });

      const result = await OrderService.createOrder(USER_ID, body);

      expect(result).toHaveProperty("order");
      expect(result.order.paymentMethod).toBe("CASH_ON_DELIVERY");
    });
  });

  describe("getOrders", () => {
    it("returns paginated orders", async () => {
      const mockOrders = [{ id: "order-1" }, { id: "order-2" }];
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);
      (prisma.order.count as jest.Mock).mockResolvedValue(2);

      const result = await OrderService.getOrders(USER_ID, 1);

      expect(result.orders).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });

    it("calculates totalPages correctly", async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.order.count as jest.Mock).mockResolvedValue(25);

      const result = await OrderService.getOrders(USER_ID, 1);

      // Default limit from constants
      expect(result.pagination.totalPages).toBeGreaterThan(1);
    });
  });

  describe("getOrderById", () => {
    it("returns order when found", async () => {
      const mockOrder = {
        id: "order-1",
        userId: USER_ID,
        items: [],
        address: mockAddress,
      };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.getOrderById(USER_ID, "order-1");

      expect(result).toEqual(mockOrder);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: "order-1", userId: USER_ID },
        include: expect.any(Object),
      });
    });

    it("throws 404 when order not found", async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.getOrderById(USER_ID, "nonexistent"),
      ).rejects.toThrow(new AppError("Order not found", 404));
    });
  });

  describe("retryPayment", () => {
    const baseOrder = {
      id: "order-1",
      userId: USER_ID,
      addressId: ADDRESS_ID,
      status: "PENDING",
      paymentStatus: "FAILED",
      total: 115,
    };

    it("throws 404 when order not found", async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.retryPayment(USER_ID, "nonexistent", {
          addressId: ADDRESS_ID,
          paymentMethod: "CASH_ON_DELIVERY",
        }),
      ).rejects.toThrow(new AppError("Order not found", 404));
    });

    it("throws 400 when order is not in a retriable state", async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...baseOrder,
        paymentStatus: "PAID",
      });

      await expect(
        OrderService.retryPayment(USER_ID, "order-1", {
          addressId: ADDRESS_ID,
          paymentMethod: "CASH_ON_DELIVERY",
        }),
      ).rejects.toThrow(
        new AppError("Payment cannot be retried for this order", 400),
      );
    });

    it("switches to COD and updates order", async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);
      const updatedOrder = {
        ...baseOrder,
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "PENDING",
      };
      (prisma.order.update as jest.Mock).mockResolvedValue(updatedOrder);

      const result = await OrderService.retryPayment(USER_ID, "order-1", {
        addressId: ADDRESS_ID,
        paymentMethod: "CASH_ON_DELIVERY",
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order-1" },
          data: expect.objectContaining({
            paymentMethod: "CASH_ON_DELIVERY",
            paymentStatus: "PENDING",
            paymentIntentId: null,
            stripePaymentMethodId: null,
          }),
        }),
      );
      expect(result.order.paymentMethod).toBe("CASH_ON_DELIVERY");
    });

    it("updates address if a different addressId is provided", async () => {
      const newAddressId = "addr-2";
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);
      (prisma.address.findFirst as jest.Mock).mockResolvedValue({
        id: newAddressId,
      });
      (prisma.order.update as jest.Mock).mockResolvedValue({
        ...baseOrder,
        addressId: newAddressId,
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "PENDING",
      });

      await OrderService.retryPayment(USER_ID, "order-1", {
        addressId: newAddressId,
        paymentMethod: "CASH_ON_DELIVERY",
      });

      // First update is address change
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ addressId: newAddressId }),
        }),
      );
    });

    it("throws 400 if new address is invalid", async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(baseOrder);
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.retryPayment(USER_ID, "order-1", {
          addressId: "addr-invalid",
          paymentMethod: "CASH_ON_DELIVERY",
        }),
      ).rejects.toThrow(new AppError("Invalid address", 400));
    });
  });

  describe("reorder", () => {
    it("throws 404 when cancelled order not found", async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.reorder(USER_ID, "nonexistent"),
      ).rejects.toThrow(new AppError("Cancelled order not found", 404));
    });

    it("skips deleted products", async () => {
      const cancelledOrder = {
        id: "order-1",
        userId: USER_ID,
        status: "CANCELLED",
        items: [
          {
            productId: "prod-deleted",
            quantity: 1,
            colorName: "Red",
            sizeName: "M",
            product: { title: "Deleted Product" },
          },
        ],
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(cancelledOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await OrderService.reorder(USER_ID, "order-1");

      expect(result.addedCount).toBe(0);
      expect(result.skippedItems).toHaveLength(1);
    });

    it("adds in-stock items to cart", async () => {
      const cancelledOrder = {
        id: "order-1",
        userId: USER_ID,
        status: "CANCELLED",
        items: [
          {
            productId: "prod-1",
            quantity: 2,
            colorName: "Red",
            sizeName: "M",
            product: { title: "Test Shirt" },
          },
        ],
      };
      const mockProduct = {
        id: "prod-1",
        title: "Test Shirt",
        deletedAt: null,
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(cancelledOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.productVariant.findFirst as jest.Mock).mockResolvedValue(
        mockVariant,
      );
      (prisma.cartItem.upsert as jest.Mock).mockResolvedValue({});

      const result = await OrderService.reorder(USER_ID, "order-1");

      expect(result.addedCount).toBe(1);
      expect(result.skippedItems).toHaveLength(0);
      expect(prisma.cartItem.upsert).toHaveBeenCalled();
    });

    it("adjusts quantity if less stock available", async () => {
      const cancelledOrder = {
        id: "order-1",
        userId: USER_ID,
        status: "CANCELLED",
        items: [
          {
            productId: "prod-1",
            quantity: 5,
            colorName: "Red",
            sizeName: "M",
            product: { title: "Test Shirt" },
          },
        ],
      };
      const mockProduct = {
        id: "prod-1",
        title: "Test Shirt",
        deletedAt: null,
      };
      const lowStockVariant = { ...mockVariant, stock: 2 };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(cancelledOrder);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(mockProduct);
      (prisma.productVariant.findFirst as jest.Mock).mockResolvedValue(
        lowStockVariant,
      );
      (prisma.cartItem.upsert as jest.Mock).mockResolvedValue({});

      const result = await OrderService.reorder(USER_ID, "order-1");

      expect(result.adjustedItems).toHaveLength(1);
      expect(result.adjustedItems[0].addedQty).toBe(2);
      expect(result.adjustedItems[0].requestedQty).toBe(5);
    });
  });
});
