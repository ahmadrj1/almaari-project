"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  MAX_PRODUCTS_MEMORY,
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
  const [hasMore, setHasMore] = useState(true);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const nextCursorRef = useRef<string | null>(null);
  const prevCursorRef = useRef<string | null>(null);
  const productsRef = useRef<ProductWithVariants[]>([]);
  const isFetchingRef = useRef(false);
  const anchorRef = useRef<{ id: string; top: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (anchorRef.current) {
      const { id, top: prevTop } = anchorRef.current;
      const adjustScroll = () => {
        const el = document.getElementById(`product-${id}`);
        if (el) {
          const newTop = el.getBoundingClientRect().top;
          const diff = newTop - prevTop;
          if (Math.abs(diff) > 1) {
            window.scrollBy({ top: diff, behavior: "instant" });
          }
        }
      };
      adjustScroll();
      requestAnimationFrame(adjustScroll);
      anchorRef.current = null;
    }
  }, [products]);

  const searchParam = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || DEFAULT_SORT;

  const [localSearch, setLocalSearch] = useState(searchParam);
  const debouncedSearch = useDebounce(localSearch);

  // Track current filter key to cancel stale fetches on param change
  const filterKey = useRef(`${searchParam}__${sort}`);

  // Reset filters on page reload
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
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

  const dedup = (arr: ProductWithVariants[]) => {
    const seen = new Set<string>();
    return arr.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  const fetchPage = useCallback(
    async (direction: "next" | "prev" | "initial") => {
      if (isFetchingRef.current && direction !== "initial") return;
      isFetchingRef.current = true;

      const isInitial = direction === "initial";
      const cursor =
        direction === "prev" ? prevCursorRef.current : nextCursorRef.current;

      const currentKey = `${searchParam}__${sort}`;
      if (isInitial) {
        setLoading(true);
        productsRef.current = [];
        setProducts([]);
        nextCursorRef.current = null;
        prevCursorRef.current = null;
        setHasMore(true);
        setHasPrevious(false);
      } else {
        setLoadingMore(true);
        if (direction === "prev") setLoadingPrevious(true);
      }

      try {
        if (!isInitial && process.env.NEXT_PUBLIC_APP_ENV === "dev") {
          await new Promise((r) => setTimeout(r, 1000));
        }

        const params = new URLSearchParams({
          search: searchParam,
          sort,
          limit: String(PRODUCTS_PER_PAGE_DEFAULT),
          ...(cursor
            ? { cursor, direction: direction === "prev" ? "prev" : "next" }
            : {}),
        });

        const res = await fetch(`/api/products/cursor?${params}`);
        if (!res.ok) throw new Error("Failed to fetch products");

        const json = await res.json();
        if (!json.success) return;

        // Discard result if filters changed while request was in-flight
        if (filterKey.current !== currentKey) return;

        const {
          products: newProducts,
          nextCursor: newCursor,
          prevCursor: newPrevCursor,
        } = json.data;
        const currentProducts = productsRef.current;

        let nextList: ProductWithVariants[];
        if (isInitial) {
          nextList = newProducts;
        } else if (direction === "prev") {
          nextList = dedup([...newProducts, ...currentProducts]).slice(
            0,
            MAX_PRODUCTS_MEMORY,
          );
        } else {
          nextList = dedup([...currentProducts, ...newProducts]).slice(
            -MAX_PRODUCTS_MEMORY,
          );
        }

        if (direction === "prev" && currentProducts.length > 0) {
          const firstId = currentProducts[0].id;
          const el = document.getElementById(`product-${firstId}`);
          if (el) {
            anchorRef.current = {
              id: firstId,
              top: el.getBoundingClientRect().top,
            };
          }
        }

        // Sync ref immediately before releasing lock
        productsRef.current = nextList;
        setProducts(nextList);

        if (direction === "next" || isInitial) {
          nextCursorRef.current = newCursor;
          setHasMore(newCursor !== null);
          if (isInitial) {
            prevCursorRef.current = newPrevCursor;
            setHasPrevious(newPrevCursor !== null);
          } else if (
            currentProducts.length + newProducts.length >
            MAX_PRODUCTS_MEMORY
          ) {
            setHasPrevious(true);
            prevCursorRef.current = nextList[0]?.id ?? null;
          }
        }

        if (direction === "prev") {
          prevCursorRef.current = newPrevCursor;
          setHasPrevious(newPrevCursor !== null);
          if (
            currentProducts.length + newProducts.length >
            MAX_PRODUCTS_MEMORY
          ) {
            setHasMore(true);
            nextCursorRef.current = nextList[nextList.length - 1]?.id ?? null;
          }
        }
      } finally {
        isFetchingRef.current = false;
        if (filterKey.current === `${searchParam}__${sort}`) {
          if (isInitial) setLoading(false);
          else {
            setLoadingMore(false);
            setLoadingPrevious(false);
          }
        }
      }
    },
    [searchParam, sort],
  );

  // Initial fetch & refetch on filter change
  useEffect(() => {
    filterKey.current = `${searchParam}__${sort}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, sort]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage("next");
    }
  }, [loadingMore, hasMore, fetchPage]);

  const loadPrevious = useCallback(() => {
    if (!loadingMore && hasPrevious) {
      fetchPage("prev");
    }
  }, [loadingMore, hasPrevious, fetchPage]);

  const { bottomSentinelRef, topSentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    onLoadPrevious: loadPrevious,
    hasMore,
    hasPrevious,
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
            {/* Top Sentinel */}
            <div ref={topSentinelRef} className="h-4" />
            {loadingPrevious && (
              <div className="flex items-center justify-center py-4">
                <Spinner size="md" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} id={`product-${product.id}`}>
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
              {loadingMore &&
                Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={`skeleton-${i}`} />
                ))}
            </div>

            {/* Bottom Sentinel */}
            <div ref={bottomSentinelRef} className="h-4" />

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
