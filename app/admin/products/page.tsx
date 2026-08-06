"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import DeleteProductModal from "@/components/admin/DeleteProductModal";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  const fetchProducts = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?page=${p}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

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
        fetchProducts(page); // refresh
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
          <button className="flex-1 sm:flex-none bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            + Add Multiple Products
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500">
              <th className="pb-3 font-medium">Title</th>
              <th className="pb-3 font-medium">Price</th>
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
                  <td className="py-4 text-gray-600">{product.totalStock}</td>
                  <td className="py-4">
                    <div className="flex gap-3">
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
      {!loading && totalPages > 1 && (
        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm text-blue-500 disabled:text-gray-400 disabled:border-gray-100 hover:bg-gray-50 disabled:hover:bg-transparent"
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded text-sm ${
                page === i + 1 
                  ? "bg-white border-gray-200 text-blue-500 shadow-sm font-medium" 
                  : "border-transparent text-blue-500 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-transparent rounded text-sm text-blue-500 disabled:text-gray-400 hover:bg-gray-50 disabled:hover:bg-transparent"
          >
            Next
          </button>
        </div>
      )}

      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
