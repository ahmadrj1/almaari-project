"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, ClipboardList, Box, Banknote } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED:    "bg-indigo-100 text-indigo-700",
  DELIVERED:  "bg-green-100 text-green-700",
  CANCELLED:  "bg-red-100 text-red-700",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalUnits: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [page, search]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Orders:", value: stats.totalOrders, Icon: ClipboardList },
          { label: "Total Units:", value: stats.totalUnits, Icon: Box },
          { label: "Total Amount:", value: `Rs. ${Number(stats.totalAmount).toFixed(2)}`, Icon: Banknote },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">{label}</p>
              <p className="text-3xl font-bold text-blue-600">{value}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <Icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-semibold text-blue-500">Orders</h1>
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by user name, email or order ID"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Order #</th>
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Product(s)</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 text-gray-600">{formatDate(order.createdAt)}</td>
                    <td className="py-4 text-gray-800 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                    <td className="py-4">
                      <div className="text-gray-800 font-medium">{order.user?.fullName || "Unknown"}</div>
                      <div className="text-xs text-gray-400">{order.user?.id?.slice(0, 8)}...</div>
                    </td>
                    <td className="py-4 text-gray-600">
                      {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                    </td>
                    <td className="py-4 text-gray-800 font-medium">Rs. {Number(order.total).toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-gray-500 hover:text-blue-500 transition-colors p-1 flex items-center justify-center w-8 h-8 rounded hover:bg-blue-50"
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  page === i + 1 ? "bg-white border-gray-200 text-blue-500 shadow-sm font-medium" : "border-transparent text-blue-500 hover:bg-gray-50"
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
      </div>
    </div>
  );
}
