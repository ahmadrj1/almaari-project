"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

const ProductCard = dynamic(
  () => import("@/components/ui/product-card").then((mod) => mod.ProductCard),
  { ssr: false, loading: () => <ProductCardSkeleton /> },
);

import { SearchBar } from "@/components/ui/search-bar";
import { SortDropdown } from "@/components/ui/sort-dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useCartCount } from "@/hooks/use-cart-count";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSession } from "next-auth/react";
import {
  SORT_OPTIONS,
  PRODUCTS_PER_PAGE_DEFAULT,
  DEFAULT_SORT,
} from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Product } from "@prisma/client";
import type { ProductVariant } from "@/types";

type ProductWithVariants = Product & {
  variants?: ProductVariant[];
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const { refresh } = useCartCount();

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const searchParam = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || DEFAULT_SORT;

  const [localSearch, setLocalSearch] = useState(searchParam);
  const debouncedSearch = useDebounce(localSearch);

  // Track current filter key to cancel stale fetches on param change
  const filterKey = useRef(`${searchParam}__${sort}`);

  // Reset filters on page reload
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = nav?.type === "reload";
    if (isReload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalSearch("");
      if (searchParams.get("search") || searchParams.get("sort")) {
        router.replace("/");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPage = useCallback(
    async (cursor: string | null, isInitial: boolean) => {
      const currentKey = `${searchParam}__${sort}`;
      if (isInitial) {
        setLoading(true);
        setProducts([]);
        setNextCursor(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      try {
        // Pseudo network delay
        if (!isInitial) {
          await new Promise((r) => setTimeout(r, 100));
        }

        const params = new URLSearchParams({
          search: searchParam,
          sort,
          limit: String(PRODUCTS_PER_PAGE_DEFAULT),
          ...(cursor ? { cursor } : {}),
        });

        const res = await fetch(`/api/products/cursor?${params}`);
        if (!res.ok) throw new Error("Failed to fetch products");

        const json = await res.json();
        if (!json.success) return;

        // Discard result if filters changed while request was in-flight
        if (filterKey.current !== currentKey) return;

        const { products: newProducts, nextCursor: newCursor } = json.data;

        setProducts((prev) =>
          isInitial ? newProducts : [...prev, ...newProducts],
        );
        setNextCursor(newCursor);
        setHasMore(newCursor !== null);
      } finally {
        if (filterKey.current === `${searchParam}__${sort}`) {
          if (isInitial) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [searchParam, sort],
  );

  // Initial fetch & refetch on filter change
  useEffect(() => {
    filterKey.current = `${searchParam}__${sort}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, sort]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) {
      fetchPage(nextCursor, false);
    }
  }, [loadingMore, hasMore, nextCursor, fetchPage]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loading || loadingMore,
  });

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      updateParams({ search: debouncedSearch });
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
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === productId) {
              return {
                ...p,
                variants: p.variants?.map((v) =>
                  v.id === variantId
                    ? { ...v, stock: Math.max(0, v.stock - quantity) }
                    : v,
                ),
              };
            }
            return p;
          }),
        );
        const product = products.find((p) => p.id === productId);
        showToast(
          "success",
          `Added ${quantity} x ${product?.title || "product"} to cart!`,
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
    <>
      <Navbar />
      <main className="container mx-auto flex-1 px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-primary">Our Products</h1>
          <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-80 sm:flex-none">
              <SearchBar
                placeholder="Search products or categories..."
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: PRODUCTS_PER_PAGE_DEFAULT }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12 text-gray-400" />}
            title="No products found"
            description={
              searchParam
                ? `No results for "${searchParam}". Try clearing the search.`
                : "No products available."
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
              {loadingMore &&
                Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={`skeleton-${i}`} />
                ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {!hasMore && (
              <p className="mt-6 text-center text-sm text-gray-400">
                You&apos;ve seen all products
              </p>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
