"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants";
import type { OrderDetail } from "@/types";

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        showToast("error", "Order not found");
      }
    } catch {
      showToast("error", "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrder();
    }
  }, [id, fetchOrder]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h1>
        <Link href="/orders" className="text-[#2979FF] hover:underline">Return to Orders</Link>
      </div>
    );
  }

  const statusClass = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700";
  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
  const addressLine = order.address
    ? [order.address.street, order.address.city, order.address.zipCode, order.address.country].filter(Boolean).join(", ")
    : "—";

  return (
    <div className="mx-auto px-4 py-8 max-w-6xl w-full">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="text-[#2979FF] hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-[#2979FF]">Order Detail</h1>
      </div>

      {/* Subheader summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100">
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Date</p>
            <p className="text-base font-semibold text-gray-900">{formattedDate}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Order #</p>
            <p className="text-base font-semibold text-gray-900 font-mono">{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
              {order.status}
            </span>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Subtotal</p>
            <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(order.subTotal))}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tax</p>
            <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(order.tax))}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Total</p>
            <p className="text-base font-bold text-[#2979FF]">{formatCurrency(Number(order.total))}</p>
          </div>
        </div>
        {/* Address row */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-3">Delivery Address</span>
          <span className="text-sm text-gray-700">{addressLine}</span>
        </div>
      </div>

      {/* Product table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Product Information</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Color</th>
                <th className="px-6 py-3">Size</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                        {item.product?.image && (
                          <Image src={item.product.image} alt={item.product.title} fill className="object-cover" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-800 line-clamp-2 max-w-xs">
                        {item.product?.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.colorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.sizeName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(Number(item.price))}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
