"use client";

import * as React from "react";
import { X } from "lucide-react";
import { ProductCard } from "@/components/ui/product-card";
import type { FullProduct } from "@/types";

interface ViewProductModalProps {
  productId: string | null;
  onClose: () => void;
}

export default function ViewProductModal({ productId, onClose }: ViewProductModalProps) {
  const [product, setProduct] = React.useState<FullProduct | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [prevProductId, setPrevProductId] = React.useState<string | null>(null);

  if (productId !== prevProductId) {
    setPrevProductId(productId);
    setProduct(null);
    setLoading(productId !== null);
  }

  React.useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProduct(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productId]);

  React.useEffect(() => {
    if (!productId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "unset";
    };
  }, [productId, onClose]);

  if (!productId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-50 w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1 text-gray-500 hover:text-gray-900 transition-colors shadow"
        >
          <X size={18} />
          <span className="sr-only">Close</span>
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : product ? (
          <ProductCard product={product} />
        ) : (
          <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
            Failed to load product.
          </div>
        )}
      </div>
    </div>
  );
}
