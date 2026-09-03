"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { STATUS_COLORS, ORDER_STATUSES, STATUS_LEVELS } from "@/lib/constants";
import { OrderDetail, OrderItem } from "@/types";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";
import { SortDropdown } from "@/components/ui/sort-dropdown";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const id = React.use(params).id;

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.data);
    } catch (error) {
      console.error("Failed to fetch order:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => (prev ? { ...prev, status } : prev));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  if (loading)
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!order)
    return <div className="p-8 text-center text-red-500">Order not found.</div>;

  const totalProducts = order.items.reduce(
    (sum: number, item: OrderItem) => sum + item.quantity,
    0,
  );

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
        <Link
          href="/admin/orders"
          className="text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800">Order Detail</h1>
      </div>

      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-10 gap-4 mb-10 pb-6 border-b border-gray-100 items-start">
        <div>
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className="font-medium text-gray-800">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Order #</p>
          <p className="font-medium text-gray-800">{order.id.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">User</p>
          <p className="font-medium text-gray-800">
            {order.user?.fullName || "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Unit(s)</p>
          <p className="font-medium text-gray-800">
            {String(totalProducts).padStart(2, "0")}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Sub Total</p>
          <p className="font-medium text-gray-800">
            Rs. {Number(order.subTotal).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Tax</p>
          <p className="font-medium text-gray-800">
            Rs. {Number(order.tax).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="font-medium text-gray-800">
            Rs. {Number(order.total).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Payment Method</p>
          <p className="font-medium text-gray-800">
            {order.paymentMethod === "CREDIT_DEBIT_CARD" ? "💳 Card" : "🏠 COD"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Payment Status</p>
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
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
        </div>
        {/* Status with change control */}
        <div className="relative">
          <p className="text-sm text-gray-500 mb-1">Status</p>
          {order.paymentMethod === "CREDIT_DEBIT_CARD" &&
          order.paymentStatus === "PROCESSING" ? (
            <div title="Status cannot be changed until payment is confirmed or fails.">
              <button
                disabled
                className="h-9 rounded-full px-3 py-1.5 text-xs font-semibold justify-center border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed w-full flex items-center justify-between"
              >
                <span>{order.status}</span>
                <span className="text-[10px]">🔒</span>
              </button>
            </div>
          ) : (
            <SortDropdown
              className="inline-block w-full"
              buttonClassName={`h-9 rounded-full px-3 py-1.5 text-xs font-semibold justify-center border-0 ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}
              menuClassName="max-h-56"
              value={order.status}
              options={ORDER_STATUSES.map((s) => {
                const currentLevel = STATUS_LEVELS[order.status] ?? 0;
                const targetLevel = STATUS_LEVELS[s] ?? 0;
                let disabled = false;

                if (s === order.status) {
                  // Always keep current status selectable (no-op)
                  disabled = false;
                } else if (
                  order.status === "CANCELLED" ||
                  order.status === "DELIVERED"
                ) {
                  // Terminal states: no changes allowed
                  disabled = true;
                } else if (
                  s === "CANCELLED" &&
                  order.paymentMethod === "CREDIT_DEBIT_CARD" &&
                  order.paymentStatus === "PAID"
                ) {
                  // Paid card payment orders cannot be cancelled
                  disabled = true;
                } else if (
                  order.paymentMethod === "CREDIT_DEBIT_CARD" &&
                  order.paymentStatus === "FAILED" &&
                  order.status === "PENDING"
                ) {
                  // Failed payment on a PENDING order: only CANCELLED is allowed
                  disabled = s !== "CANCELLED";
                } else {
                  // Normal flow: only exactly one step forward is allowed
                  disabled = targetLevel !== currentLevel + 1;
                }

                return { label: s, value: s, disabled };
              })}
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            />
          )}
        </div>
      </div>

      <h2 className="text-xl font-semibold text-slate-800 mb-4">
        Product Information
      </h2>

      <div className="overflow-auto max-h-[420px] custom-scrollbar rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600 shadow-sm">
              <th className="py-3 px-4 font-medium bg-gray-50 rounded-tl-lg">
                Title
              </th>
              <th className="py-3 px-4 font-medium bg-gray-50">Price</th>
              <th className="py-3 px-4 font-medium bg-gray-50">Quantity</th>
              <th className="py-3 px-4 font-medium bg-gray-50 rounded-tr-lg">
                Stock
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {order.items.map((item: OrderItem) => {
              const variant = item.product?.variants?.find(
                (v) =>
                  v.color?.name === item.colorName &&
                  v.size?.name === item.sizeName,
              );
              const stock = variant
                ? variant.stock
                : item.product?.variants?.reduce(
                    (sum: number, v) => sum + v.stock,
                    0,
                  ) || 0;

              return (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="py-4 px-4 flex items-center gap-4">
                    <div className="w-12 h-12 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      <Image
                        src={getOptimizedCloudinaryUrl(
                          item.product?.image || "/images/placeholder.png",
                          160,
                        )}
                        alt={item.product?.title || "Product"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="font-medium text-gray-800 max-w-[400px] line-clamp-2 flex items-center gap-2">
                      {item.product?.title || "Unknown Product"}
                      {item.product?.deletedAt && (
                        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          Deleted
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    Rs. {Number(item.price).toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {String(item.quantity).padStart(2, "0")}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {String(stock).padStart(2, "0")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
