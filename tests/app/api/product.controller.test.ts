/**
 * @jest-environment node
 */

import { ProductController } from "@/controllers/product.controller";
import { ProductService } from "@/services/product.service";

jest.mock("@/services/product.service", () => ({
  ProductService: {
    getProducts: jest.fn(),
  },
}));

describe("ProductController.getProducts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when page is negative", async () => {
    const req = new Request("http://localhost:3000/api/products?page=-1");
    const res = await ProductController.getProducts(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Page must be greater than or equal to 1");
  });

  it("returns 400 when page is zero", async () => {
    const req = new Request("http://localhost:3000/api/products?page=0");
    const res = await ProductController.getProducts(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Page must be greater than or equal to 1");
  });

  it("returns 400 when page is not a number", async () => {
    const req = new Request("http://localhost:3000/api/products?page=invalid");
    const res = await ProductController.getProducts(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Page must be greater than or equal to 1");
  });

  it("calls ProductService.getProducts with valid page", async () => {
    (ProductService.getProducts as jest.Mock).mockResolvedValue({
      products: [],
      pagination: { page: 2, limit: 8, total: 0, totalPages: 0 },
    });

    const req = new Request("http://localhost:3000/api/products?page=2");
    const res = await ProductController.getProducts(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(ProductService.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});
