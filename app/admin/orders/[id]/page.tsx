"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { STATUS_COLORS, ORDER_STATUSES } from "@/lib/constants";
import { OrderDetail, OrderItem } from "@/types";

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
      <div className="grid grid-cols-2 md:grid-cols-8 gap-4 mb-10 pb-6 border-b border-gray-100 items-start">
        <div>
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className="font-medium text-gray-800">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Order #</p>
          <p className="font-medium text-gray-800 font-mono text-xs">
            {order.id.slice(0, 8)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">User</p>
          <p className="font-medium text-gray-800">
            {order.user?.fullName || "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Products</p>
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
        {/* Status with change control */}
        <div className="relative">
          <p className="text-sm text-gray-500 mb-1">Status</p>
          <div className="relative inline-block w-full">
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`block w-full text-xs font-semibold rounded-full px-3 py-1.5 appearance-none cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-center ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}
              style={{ paddingRight: "1.5rem" }}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-white text-gray-800 font-normal">
                  {s}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="h-3 w-3 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-slate-800 mb-4">
        Product Information
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
              <th className="py-3 px-4 font-medium rounded-tl-lg">Title</th>
              <th className="py-3 px-4 font-medium">Price</th>
              <th className="py-3 px-4 font-medium">Quantity</th>
              <th className="py-3 px-4 font-medium rounded-tr-lg">Stock</th>
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
                        src={item.product?.image || "/images/placeholder.png"}
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
