/**
 * @jest-environment node
 */

import { AdminOrderService } from "@/services/admin-order.service";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-error";

jest.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    orderItem: {
      aggregate: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/notifications", () => ({
  createNotification: jest.fn(),
}));

describe("AdminOrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateOrderStatus - Card + Paid Cancellation Validation", () => {
    it("throws 400 when attempting to cancel an order with card payment and PAID status", async () => {
      const mockOrder = {
        id: "order-paid-card",
        status: "SHIPPED",
        paymentMethod: "CREDIT_DEBIT_CARD",
        paymentStatus: "PAID",
        items: [],
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return fn(tx);
      });

      await expect(
        AdminOrderService.updateOrderStatus("order-paid-card", "CANCELLED"),
      ).rejects.toThrow(
        new AppError("Cannot cancel an order with a paid card payment.", 400),
      );
    });

    it("allows updating status of paid card order to non-cancelled status (e.g. DELIVERED from SHIPPED)", async () => {
      const mockOrder = {
        id: "order-paid-card",
        userId: "user-1",
        status: "SHIPPED",
        paymentMethod: "CREDIT_DEBIT_CARD",
        paymentStatus: "PAID",
        items: [],
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: "DELIVERED",
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
            update: jest.fn().mockResolvedValue(mockUpdatedOrder),
          },
        };
        return fn(tx);
      });

      const result = await AdminOrderService.updateOrderStatus(
        "order-paid-card",
        "DELIVERED",
      );

      expect(result.status).toBe("DELIVERED");
    });

    it("allows cancelling CASH_ON_DELIVERY orders if step progression is valid (e.g., from SHIPPED)", async () => {
      const mockOrder = {
        id: "order-cod",
        userId: "user-1",
        status: "SHIPPED",
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "PENDING",
        items: [],
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: "CANCELLED",
        paymentStatus: "FAILED",
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
            update: jest.fn().mockResolvedValue(mockUpdatedOrder),
          },
        };
        return fn(tx);
      });

      const result = await AdminOrderService.updateOrderStatus(
        "order-cod",
        "CANCELLED",
      );

      expect(result.status).toBe("CANCELLED");
    });
  });
});
