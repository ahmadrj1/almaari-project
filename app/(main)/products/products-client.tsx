"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/ui/product-card";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { SearchBar } from "@/components/ui/search-bar";
import { SortDropdown } from "@/components/ui/sort-dropdown";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useCartCount } from "@/hooks/use-cart-count";
import { useSession } from "next-auth/react";
import {
  SORT_OPTIONS,
  PRODUCTS_PER_PAGE_DEFAULT,
  DEFAULT_SORT,
} from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import type { Product } from "@prisma/client";

type Pagination = { page: number; totalPages: number; total: number };

import { Suspense } from "react";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const { refresh } = useCartCount();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const searchParam = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || DEFAULT_SORT;
  const categoryId = searchParams.get("categoryId") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [localSearch, setLocalSearch] = useState(searchParam);
  const debouncedSearch = useDebounce(localSearch);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const paramsParams: Record<string, string> = {
        search: searchParam,
        sort,
        page: String(page),
        limit: String(PRODUCTS_PER_PAGE_DEFAULT),
      };
      if (categoryId) {
        paramsParams.categoryId = categoryId;
      }
      const params = new URLSearchParams(paramsParams);
      const res = await fetch(`/api/products?${params}`, { method: "GET" });

      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setPagination(data.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [searchParam, sort, page, categoryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (!updates.page) params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      updateParams({ search: debouncedSearch, page: "1" });
    }
  }, [debouncedSearch, searchParam, updateParams]);

  const handleAddToCart = async (
    productId: string,
    variantId: string,
    quantity: number,
  ) => {
    if (status !== "authenticated") {
      showToast("info", "Please log in to place an order");
      return;
    }

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        const product = products.find((p) => p.id === productId);
        const price = Number(product?.price ?? 0) * quantity;
        showToast(
          "success",
          `Added to cart! Total: PKR ${price.toLocaleString()}`,
        );
        refresh();
      } else {
        showToast("error", data.error || "Failed to add to cart");
      }
    } catch {
      showToast("error", "Failed to add to cart");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">Our Products</h1>
        <div className="flex flex-row items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <SortDropdown
            className="w-40 sm:w-48 shrink-0"
            value={categoryId}
            placeholder="All Categories"
            options={categories.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
            onValueChange={(value) => updateParams({ categoryId: value })}
          />
          <div className="min-w-0 flex-1 sm:w-80 sm:flex-none">
            <SearchBar
              placeholder="Search products..."
              className="w-full"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <div className="shrink-0">
            <SortDropdown
              className="w-40 sm:w-48 shrink-0"
              options={SORT_OPTIONS}
              value={sort}
              placeholder="Sort by"
              onValueChange={(value) => updateParams({ sort: value })}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: PRODUCTS_PER_PAGE_DEFAULT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 min-h-[300px]">
          <div className="col-span-2 md:col-span-3 lg:col-span-4 flex items-center justify-center">
            <EmptyState
              icon={<ShoppingBag className="w-12 h-12 text-gray-400" />}
              title="No products found"
              description={
                searchParam
                  ? `No results for "${searchParam}". Try clearing the search.`
                  : "No products available."
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
          <div className="flex justify-center mt-auto pt-8">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
