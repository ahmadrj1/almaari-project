import { NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";
import { handleApiError } from "@/lib/api-error";
import { DEFAULT_SORT } from "@/lib/constants";

export class ProductController {
  static async getProducts(req: Request) {
    try {
      const url = new URL(req.url);
      const search = url.searchParams.get("search") || "";
      const sort = url.searchParams.get("sort") || DEFAULT_SORT;
      const page = parseInt(url.searchParams.get("page") || "1");
      const inStock = url.searchParams.get("inStock") === "true";

      const data = await ProductService.getProducts({ search, sort, page, inStock });
      
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "ProductController.getProducts");
    }
  }

  static async getProductsCursor(req: Request) {
    try {
      const url = new URL(req.url);
      const search = url.searchParams.get("search") || "";
      const sort = url.searchParams.get("sort") || DEFAULT_SORT;
      const cursor = url.searchParams.get("cursor") || undefined;
      const direction = url.searchParams.get("direction") || "next";
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "12"), 50);
      const inStock = url.searchParams.get("inStock") === "true";

      const data = await ProductService.getProductsCursor({ search, sort, cursor, direction, limit, inStock });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, "ProductController.getProductsCursor");
    }
  }

  static async getDemoProducts(_req: Request) {
    try {
      const data = await ProductService.getDemoProducts();
      return NextResponse.json({ products: data });
    } catch (_error) {
      return NextResponse.json({ products: [] }, { status: 500 });
    }
  }
}
