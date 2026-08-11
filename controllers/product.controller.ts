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

  static async getDemoProducts(req: Request) {
    try {
      const data = await ProductService.getDemoProducts();
      return NextResponse.json({ products: data });
    } catch (error) {
      return NextResponse.json({ products: [] }, { status: 500 });
    }
  }
}
