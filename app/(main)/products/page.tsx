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
import { SORT_OPTIONS, PRODUCTS_PER_PAGE_DEFAULT, DEFAULT_SORT } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  variants: import("@/components/ui/product-card").Variant[];
};

type Pagination = { page: number; totalPages: number; total: number };

import { Suspense } from "react";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const { refresh } = useCartCount();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const searchParam = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || DEFAULT_SORT;
  const page = parseInt(searchParams.get("page") || "1");

  const [localSearch, setLocalSearch] = useState(searchParam);
  const debouncedSearch = useDebounce(localSearch);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const params = new URLSearchParams({ search: searchParam, sort, page: String(page), limit: String(PRODUCTS_PER_PAGE_DEFAULT) });
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
  }, [searchParam, sort, page]);

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts(); 
  }, [fetchProducts]);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    if (!updates.page) params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      updateParams({ search: debouncedSearch, page: "1" });
    }
  }, [debouncedSearch, searchParam, updateParams]);

  const handleAddToCart = async (productId: string, variantId: string, quantity: number) => {
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
        showToast("success", `Added to cart! Total: PKR ${price.toLocaleString()}`);
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
        <h1 className="text-2xl font-bold text-[#2979FF]">Our Products</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <SearchBar
            placeholder="Search products..."
            className="w-full sm:w-80"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <SortDropdown
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: PRODUCTS_PER_PAGE_DEFAULT }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12 text-gray-400" />}
          title="No products found"
          description={searchParam ? `No results for "${searchParam}". Try clearing the search.` : "No products available."}
        />
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
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-7xl flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2979FF]"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
