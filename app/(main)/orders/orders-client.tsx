"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageSearch, ArrowUpRight } from "lucide-react";
import { ORDERS_PER_PAGE_DEFAULT } from "@/lib/constants";
import type { Order } from "@/types";
import { useCartCount } from "@/hooks/use-cart-count";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const { showToast } = useToast();
  const { refresh } = useCartCount();

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/orders?page=${page}&limit=${ORDERS_PER_PAGE_DEFAULT}`,
        );
        const data = await res.json();
        if (data.success) {
          setOrders(data.data.orders);
          setPagination({
            page: data.data.pagination.page,
            totalPages: data.data.pagination.totalPages,
          });
        } else {
          showToast("error", "Failed to load orders");
        }
      } catch {
        showToast("error", "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full">
        <h1 className="text-2xl font-semibold text-[#2979FF] mb-8">
          My Orders
        </h1>
        <EmptyState
          icon={<PackageSearch className="w-12 h-12 text-gray-400" />}
          title="No orders yet"
          description="Looks like you haven't placed any orders yet."
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold text-[#2979FF] mb-8">My Orders</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order: Order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <td className="px-6 py-5 text-sm font-semibold text-gray-800 font-mono">
                    {order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === "DELIVERED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : order.status === "SHIPPED"
                              ? "bg-purple-100 text-purple-800"
                              : order.status === "PROCESSING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {order.paymentMethod === "CREDIT_DEBIT_CARD" ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          order.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-800"
                            : order.paymentStatus === "PROCESSING"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.paymentStatus === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-gray-900">
                    {formatCurrency(Number(order.total))}
                  </td>
                  <td className="px-6 py-5 text-center flex items-center justify-center gap-2">
                    {order.status === "CANCELLED" && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/orders/${order.id}/reorder`,
                              { method: "POST" },
                            );
                            const data = await res.json();
                            if (data.success) {
                              if (data.addedCount === 0) {
                                showToast(
                                  "error",
                                  "Sorry, the item is now out of stock.",
                                );
                                return;
                              }
                              data.skippedItems.forEach(
                                (item: { title: string }) => {
                                  showToast(
                                    "info",
                                    `"${item.title}" is currently unavailable and was skipped.`,
                                  );
                                },
                              );
                              data.adjustedItems.forEach(
                                (item: { title: string; addedQty: number }) => {
                                  showToast(
                                    "info",
                                    `"${item.title}" quantity adjusted to ${item.addedQty} (max available).`,
                                  );
                                },
                              );
                              showToast("success", "Items added to cart.");
                              refresh();
                              router.push("/cart");
                            } else {
                              showToast(
                                "error",
                                data.error || "Failed to reorder items",
                              );
                            }
                          } catch {
                            showToast("error", "Failed to reorder items");
                          }
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl transition duration-150"
                      >
                        Order Again
                      </button>
                    )}
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-gray-500 hover:text-blue-500 transition-colors p-1 inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-50"
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center mt-auto pt-6">
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={fetchOrders}
        />
      </div>
    </div>
  );
}
