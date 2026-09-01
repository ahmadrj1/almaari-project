/**
 * @jest-environment node
 */

import { OrderController } from "@/controllers/order.controller";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/order.service", () => ({
  OrderService: {
    createOrder: jest.fn(),
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    retryPayment: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { OrderService } from "@/services/order.service";
import { AppError } from "@/lib/api-error";

const makeReq = (url: string, method = "GET", body?: object) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

describe("OrderController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOrder", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await OrderController.createOrder(
        makeReq("/api/orders", "POST", { addressId: "a1", selectedItemIds: ["i1"] }),
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("creates order successfully for authenticated user", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.createOrder as jest.Mock).mockResolvedValue({
        order: { id: "order-1", total: 200 },
      });

      const res = await OrderController.createOrder(
        makeReq("/api/orders", "POST", {
          addressId: "addr-1",
          selectedItemIds: ["item-1"],
          paymentMethod: "CASH_ON_DELIVERY",
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(OrderService.createOrder).toHaveBeenCalledWith("user-1", {
        addressId: "addr-1",
        selectedItemIds: ["item-1"],
        paymentMethod: "CASH_ON_DELIVERY",
        paymentMethodId: undefined,
      });
    });

    it("returns 400 on AppError from service", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.createOrder as jest.Mock).mockRejectedValue(
        new AppError("No items selected", 400),
      );

      const res = await OrderController.createOrder(
        makeReq("/api/orders", "POST", { addressId: "a1", selectedItemIds: [] }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No items selected");
    });

    it("returns 500 on unexpected error", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.createOrder as jest.Mock).mockRejectedValue(new Error("DB error"));

      const res = await OrderController.createOrder(
        makeReq("/api/orders", "POST", { addressId: "a1", selectedItemIds: ["i1"] }),
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe("getOrders", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await OrderController.getOrders(makeReq("/api/orders?page=1"));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("returns paginated orders for authenticated user", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrders as jest.Mock).mockResolvedValue({
        orders: [{ id: "order-1" }],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      });

      const res = await OrderController.getOrders(makeReq("/api/orders?page=1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.orders).toHaveLength(1);
      expect(OrderService.getOrders).toHaveBeenCalledWith("user-1", 1);
    });

    it("defaults page to 1 if not provided", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrders as jest.Mock).mockResolvedValue({
        orders: [],
        pagination: { page: 1, totalPages: 0, total: 0, limit: 10 },
      });

      await OrderController.getOrders(makeReq("/api/orders"));

      expect(OrderService.getOrders).toHaveBeenCalledWith("user-1", 1);
    });
  });

  describe("getOrderById", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await OrderController.getOrderById(makeReq("/api/orders/order-1"), "order-1");
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("returns order for authenticated user", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrderById as jest.Mock).mockResolvedValue({
        id: "order-1",
        total: 100,
        items: [],
      });

      const res = await OrderController.getOrderById(
        makeReq("/api/orders/order-1"),
        "order-1",
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("order-1");
      expect(OrderService.getOrderById).toHaveBeenCalledWith("user-1", "order-1");
    });

    it("returns 400 when orderId is missing", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

      const res = await OrderController.getOrderById(makeReq("/api/orders/"), "");
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 404 when order not found", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrderById as jest.Mock).mockRejectedValue(
        new AppError("Order not found", 404),
      );

      const res = await OrderController.getOrderById(
        makeReq("/api/orders/nonexistent"),
        "nonexistent",
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Order not found");
    });
  });

  describe("retryPayment", () => {
    it("returns 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await OrderController.retryPayment(
        makeReq("/api/orders/order-1/retry-payment", "POST", {
          addressId: "a1",
          paymentMethod: "CASH_ON_DELIVERY",
        }),
        "order-1",
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("retries payment successfully", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.retryPayment as jest.Mock).mockResolvedValue({
        order: { id: "order-1", paymentStatus: "PENDING" },
      });

      const res = await OrderController.retryPayment(
        makeReq("/api/orders/order-1/retry-payment", "POST", {
          addressId: "addr-1",
          paymentMethod: "CASH_ON_DELIVERY",
        }),
        "order-1",
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(OrderService.retryPayment).toHaveBeenCalledWith("user-1", "order-1", {
        addressId: "addr-1",
        paymentMethod: "CASH_ON_DELIVERY",
        paymentMethodId: undefined,
      });
    });

    it("returns 400 when orderId is missing", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

      const res = await OrderController.retryPayment(
        makeReq("/api/orders//retry-payment", "POST", {}),
        "",
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 400 when order cannot be retried", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.retryPayment as jest.Mock).mockRejectedValue(
        new AppError("Payment cannot be retried for this order", 400),
      );

      const res = await OrderController.retryPayment(
        makeReq("/api/orders/order-1/retry-payment", "POST", {
          addressId: "a1",
          paymentMethod: "CASH_ON_DELIVERY",
        }),
        "order-1",
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/cannot be retried/i);
    });
  });
});
