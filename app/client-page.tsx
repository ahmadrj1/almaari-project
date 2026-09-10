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
import { Suspense } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [hasMore, setHasMore] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const nextCursorRef = useRef<string | null>(null);
  const prevCursorRef = useRef<string | null>(null);
  const productsRef = useRef<ProductWithVariants[]>([]);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
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

  const wasReloadRef = useRef(() => {
    if (typeof window === "undefined") return false;
    const navEntry = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const legacyNav = (
      performance as unknown as { navigation?: { type?: number } }
    ).navigation;
    return (
      Boolean(window.location.search) &&
      (navEntry?.type === "reload" || legacyNav?.type === 1)
    );
  });
  // eslint-disable-next-line react-hooks/refs
  const [wasReload] = useState(() => wasReloadRef.current());

  const initialSearch = wasReload ? "" : searchParam;
  const initialSort = wasReload ? DEFAULT_SORT : sort;

  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
  const [localSort, setLocalSort] = useState(initialSort);
  const [prevSortParam, setPrevSortParam] = useState(sort);

  useIsomorphicLayoutEffect(() => {
    if (wasReload && window.location.search) {
      setLocalSearch("");
      setLocalSort(DEFAULT_SORT);
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace(window.location.pathname);
    }
  }, [wasReload]);

  if (searchParam !== prevSearchParam) {
    setPrevSearchParam(searchParam);
    setLocalSearch(searchParam);
  }

  if (sort !== prevSortParam) {
    setPrevSortParam(sort);
    setLocalSort(sort);
  }

  const debouncedSearch = useDebounce(localSearch);
  const isUserTypingRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Clear query params and reset state on reload attempt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isReloadKey =
        (e.key === "r" && (e.metaKey || e.ctrlKey)) || e.key === "F5";
      if (isReloadKey) {
        if (
          window.location.search ||
          localSearch ||
          localSort !== DEFAULT_SORT
        ) {
          e.preventDefault();
          setLocalSearch("");
          setLocalSort(DEFAULT_SORT);
          window.history.replaceState(null, "", window.location.pathname);
          window.location.replace(window.location.pathname);
        }
      }
    };

    const handleBeforeUnload = () => {
      setLocalSearch("");
      setLocalSort(DEFAULT_SORT);
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [localSearch, localSort]);

  // Track current filter key to cancel stale fetches on param change
  const filterKey = useRef(`${searchParam}__${sort}`);

  const dedup = (arr: ProductWithVariants[]) => {
    const seen = new Set<string>();
    return arr.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  const fetchPage = useCallback(
    async (
      direction: "next" | "prev" | "initial",
      overrideSearch?: string,
      overrideSort?: string,
    ) => {
      const isInitial = direction === "initial";

      if (isInitial) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        nextCursorRef.current = null;
        prevCursorRef.current = null;
        setHasMore(false);
        setHasPrevious(false);
        setLoadingMore(false);
        setLoadingPrevious(false);
        setLoading(true);
        productsRef.current = [];
        setProducts([]);
      } else {
        if (isFetchingRef.current) return;
        const cursor =
          direction === "prev" ? prevCursorRef.current : nextCursorRef.current;
        if (!cursor) return;
        setLoadingMore(true);
        if (direction === "prev") setLoadingPrevious(true);
      }

      isFetchingRef.current = true;

      const cursor = isInitial
        ? undefined
        : direction === "prev"
          ? prevCursorRef.current
          : nextCursorRef.current;

      const currentSearch =
        overrideSearch !== undefined ? overrideSearch : searchParam;
      const currentSort = overrideSort !== undefined ? overrideSort : sort;
      const currentKey = `${currentSearch}__${currentSort}`;
      const signal = abortControllerRef.current?.signal;

      try {
        const params = new URLSearchParams({
          search: currentSearch,
          sort: currentSort,
          limit: String(PRODUCTS_PER_PAGE_DEFAULT),
          ...(cursor
            ? { cursor, direction: direction === "prev" ? "prev" : "next" }
            : {}),
        });

        const res = await fetch(`/api/products/cursor?${params}`, { signal });
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
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("fetchPage error:", err);
      } finally {
        isFetchingRef.current = false;
        if (filterKey.current === currentKey) {
          if (isInitial) setLoading(false);
          setLoadingMore(false);
          setLoadingPrevious(false);
        }
      }
    },
    [searchParam, sort],
  );

  // Initial fetch & refetch on filter change
  useEffect(() => {
    const s = searchParam;
    const so = sort;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (wasReload && window.location.search) {
        return;
      }
    }

    filterKey.current = `${s}__${so}`;
    fetchPage("initial", s, so);
  }, [searchParam, sort, wasReload, fetchPage]);

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
      const params = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (!isUserTypingRef.current) return;
    if (debouncedSearch !== searchParam) {
      isUserTypingRef.current = false;
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
                onChange={(e) => {
                  isUserTypingRef.current = true;
                  setLocalSearch(e.target.value);
                }}
              />
            </div>
            <div className="shrink-0">
              <SortDropdown
                className="w-40 sm:w-48 shrink-0"
                options={SORT_OPTIONS}
                value={localSort}
                placeholder="Sort by"
                onValueChange={(value) => {
                  setLocalSort(value);
                  updateParams({ sort: value });
                }}
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
              localSearch
                ? `No results for "${localSearch}". Try clearing the search.`
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
