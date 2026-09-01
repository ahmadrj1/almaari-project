/**
 * @jest-environment node
 */

import { GET as getOrders, POST as createOrder } from "@/app/api/orders/route";
import { GET as getOrderById } from "@/app/api/orders/[id]/route";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/order.service", () => ({
  OrderService: {
    createOrder: jest.fn(),
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { OrderService } from "@/services/order.service";

const makeReq = (url: string, method = "GET", body?: object) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

describe("Orders API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/orders", () => {
    it("returns 401 if not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await createOrder(
        makeReq("/api/orders", "POST", { addressId: "a1", selectedItemIds: ["i1"] }),
      );
      expect(res.status).toBe(401);
    });

    it("creates order and returns 200", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.createOrder as jest.Mock).mockResolvedValue({
        order: { id: "order-1", total: 150 },
      });

      const res = await createOrder(
        makeReq("/api/orders", "POST", {
          addressId: "addr-1",
          selectedItemIds: ["item-1"],
          paymentMethod: "CASH_ON_DELIVERY",
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 400 on AppError", async () => {
      const { AppError } = await import("@/lib/api-error");
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.createOrder as jest.Mock).mockRejectedValue(
        new AppError("Cart is empty", 400),
      );

      const res = await createOrder(
        makeReq("/api/orders", "POST", { addressId: "a1", selectedItemIds: [] }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Cart is empty");
    });
  });

  describe("GET /api/orders", () => {
    it("returns 401 if not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await getOrders(makeReq("/api/orders?page=1"));
      expect(res.status).toBe(401);
    });

    it("returns list of orders", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrders as jest.Mock).mockResolvedValue({
        orders: [{ id: "order-1" }],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      });

      const res = await getOrders(makeReq("/api/orders?page=1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.orders).toHaveLength(1);
    });
  });

  describe("GET /api/orders/[id]", () => {
    it("returns 401 if not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await getOrderById(makeReq("/api/orders/order-1"), {
        params: Promise.resolve({ id: "order-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns order by id", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrderById as jest.Mock).mockResolvedValue({
        id: "order-1",
        items: [],
        address: {},
      });

      const res = await getOrderById(makeReq("/api/orders/order-1"), {
        params: Promise.resolve({ id: "order-1" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.id).toBe("order-1");
    });

    it("returns 404 when order not found", async () => {
      const { AppError } = await import("@/lib/api-error");
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (OrderService.getOrderById as jest.Mock).mockRejectedValue(
        new AppError("Order not found", 404),
      );

      const res = await getOrderById(makeReq("/api/orders/bad-id"), {
        params: Promise.resolve({ id: "bad-id" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Order not found");
    });
  });
});
