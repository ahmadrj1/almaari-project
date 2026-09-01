/**
 * @jest-environment node
 */
import { POST } from "@/app/api/orders/route";

// Mock auth
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock OrderService
jest.mock("@/services/order.service", () => ({
  OrderService: {
    createOrder: jest.fn(),
  },
}));

import { auth } from "@/auth";
import { OrderService } from "@/services/order.service";

const makeRequest = (body: object) =>
  new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const res = await POST(
      makeRequest({ addressId: "addr-1", selectedItemIds: ["item-1"] }),
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("creates order successfully", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (OrderService.createOrder as jest.Mock).mockResolvedValue({
      id: "order-123",
      total: 150.0,
      status: "PENDING",
    });

    const res = await POST(
      makeRequest({
        addressId: "addr-1",
        selectedItemIds: ["item-1", "item-2"],
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("order-123");
    expect(OrderService.createOrder).toHaveBeenCalledWith("user-1", {
      addressId: "addr-1",
      selectedItemIds: ["item-1", "item-2"],
    });
  });

  it("returns 400 if insufficient stock (AppError from service)", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    const { AppError } = await import("@/lib/api-error");
    (OrderService.createOrder as jest.Mock).mockRejectedValue(
      new AppError("Insufficient stock for one or more items", 400),
    );

    const res = await POST(
      makeRequest({ addressId: "addr-1", selectedItemIds: ["item-1"] }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/insufficient stock/i);
  });

  it("returns 500 on unexpected service error", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (OrderService.createOrder as jest.Mock).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const res = await POST(
      makeRequest({ addressId: "addr-1", selectedItemIds: ["item-1"] }),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
