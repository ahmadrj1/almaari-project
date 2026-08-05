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

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A–Z", value: "title_asc" },
  { label: "Name: Z–A", value: "title_desc" },
];

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  color: string | null;
  size: string | null;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
};

type Pagination = { page: number; totalPages: number; total: number };

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { increment } = useCartCount();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, sort, page: String(page), limit: "12" });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setPagination(data.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [search, sort, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    if (!updates.page) params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleAddToCart = async (productId: string, quantity: number) => {
    setAddingToCart(productId);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        const product = products.find((p) => p.id === productId);
        const price = Number(product?.price ?? 0) * quantity;
        showToast("success", `Added to cart! Total: PKR ${price.toLocaleString()}`);
        increment();
      } else {
        showToast("error", data.error || "Failed to add to cart");
      }
    } catch {
      showToast("error", "Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#2979FF]">Our Products</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <SearchBar
            placeholder="Search products..."
            className="w-full sm:w-64"
            defaultValue={search}
            onChange={(e) => updateParams({ search: e.target.value })}
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
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12 text-gray-400" />}
          title="No products found"
          description={search ? `No results for "${search}". Try clearing the search.` : "No products available."}
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
