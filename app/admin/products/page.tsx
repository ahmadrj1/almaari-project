"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2, Eye } from "lucide-react";
import DeleteProductModal from "@/components/admin/DeleteProductModal";
import ViewProductModal from "@/components/admin/ViewProductModal";
import { Category, ProductSummary } from "@/types";
import { Pagination } from "@/components/ui/pagination";
import { ADMIN_PRODUCTS_PER_PAGE_DEFAULT } from "@/lib/constants";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewProductId, setViewProductId] = useState<string | null>(null);

  const fetchProducts = useCallback(async (p: number, search: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?page=${p}&limit=${ADMIN_PRODUCTS_PER_PAGE_DEFAULT}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts(page, searchQuery);
  }, [page, searchQuery, fetchProducts]);

  const openDeleteModal = (id: string) => {
    setProductToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts(page, searchQuery); // refresh
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-blue-500">Products</h1>
        <div className="flex gap-4 w-full sm:w-auto">
          <Link
            href="/admin/products/new"
            className="flex-1 sm:flex-none border border-blue-500 text-blue-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors text-center"
          >
            + Add a Single Product
          </Link>
          <button className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Add Multiple Products
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bars */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products or categories..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 hover:border-blue-500 focus:ring-blue-500"
          />
        </div>

      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500">
              <th className="pb-3 font-medium">Title</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Stock</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">No products found.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 flex items-center gap-4">
                    <div className="w-12 h-12 relative flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={product.image || "/images/placeholder.png"}
                        alt={product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="font-medium text-gray-800 line-clamp-2 max-w-[300px]">
                      {product.title}
                    </span>
                  </td>
                  <td className="py-4 text-gray-600">Rs. {Number(product.price).toFixed(2)}</td>
                  <td className="py-4 text-gray-600">{categories.find((c) => c.id === product.categoryId)?.name || "N/A"}</td>
                  <td className="py-4 text-gray-600">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-semibold text-gray-800 mr-2">{product.totalStock}</span>
                      <span className="text-gray-500">({product.variants?.length} {product.variants?.length === 1 ? "Variant" : "Variants"})</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setViewProductId(product.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                        title="View product"
                      >
                        <Eye size={18} />
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => openDeleteModal(product.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-6">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <ViewProductModal
        productId={viewProductId}
        onClose={() => setViewProductId(null)}
      />
    </div>
  );
}
