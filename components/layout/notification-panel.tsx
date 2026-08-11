"use client";

import { ShoppingBag, Package, Tag, Bell, Check, RotateCcw } from "lucide-react";
import type { Notification } from "@/types";
import { timeAgo } from "@/lib/notifications";

const TYPE_STYLES: Record<string, { icon: React.ReactNode; bg: string }> = {
  ORDER_PLACED: {
    icon: <ShoppingBag className="h-4 w-4 text-blue-600" />,
    bg: "bg-blue-100",
  },
  ORDER_STATUS_UPDATED: {
    icon: <Package className="h-4 w-4 text-green-600" />,
    bg: "bg-green-100",
  },
  NEW_PRODUCT: {
    icon: <Tag className="h-4 w-4 text-purple-600" />,
    bg: "bg-purple-100",
  },
};

export function NotificationPanel({
  notifications,
  activeTab,
  setActiveTab,
  markAllAsRead,
  toggleRead,
  loading,
}: {
  notifications: Notification[];
  activeTab: "unread" | "all";
  setActiveTab: (tab: "unread" | "all") => void;
  markAllAsRead: () => void;
  toggleRead: (id: string) => void;
  loading: boolean;
}) {
  const getStyle = (type: string) =>
    TYPE_STYLES[type] ?? {
      icon: <Bell className="h-4 w-4 text-gray-500" />,
      bg: "bg-gray-100",
    };

  return (
    <div className="fixed md:absolute right-4 left-4 md:right-0 md:left-auto mt-2 w-auto md:w-96 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={loading || notifications.every((n) => n.isRead)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
        >
          <Check className="h-3 w-3" />
          Mark all read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["unread", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide text-center transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <Bell className="h-8 w-8 opacity-20" />
            <p className="text-sm">No {activeTab === "unread" ? "unread " : ""}notifications</p>
          </div>
        ) : (
          notifications.map((n) => {
            const { icon, bg } = getStyle(n.type);
            return (
              <button
                key={n.id}
                onClick={() => toggleRead(n.id)}
                title={n.isRead ? "Mark as unread" : "Mark as read"}
                className={`w-full text-left p-4 flex gap-3 transition-colors cursor-pointer group ${
                  !n.isRead ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-gray-50"
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${n.isRead ? "text-gray-600" : "text-gray-900"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Status indicator + hover action */}
                <div className="flex flex-col items-center justify-start gap-1 flex-shrink-0 pt-0.5">
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <span className={`text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${n.isRead ? "text-gray-400" : "text-blue-500"}`}>
                    {n.isRead ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
