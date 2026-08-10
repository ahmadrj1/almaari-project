"use client";

import { ShoppingBag, Package, Tag, Bell } from "lucide-react";
import type { Notification } from "@/types";
import { timeAgo } from "@/lib/notifications";

export function NotificationPanel({
  notifications,
  activeTab,
  setActiveTab,
  markAllAsRead,
  loading,
}: {
  notifications: Notification[];
  activeTab: "unread" | "all";
  setActiveTab: (tab: "unread" | "all") => void;
  markAllAsRead: () => void;
  loading: boolean;
}) {
  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER_PLACED":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case "ORDER_STATUS_UPDATED":
        return <Package className="h-5 w-5 text-green-500" />;
      case "NEW_PRODUCT":
        return <Tag className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white shadow-xl ring-1 ring-black/5 flex flex-col overflow-hidden z-50">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <button
          onClick={markAllAsRead}
          disabled={loading || notifications.every((n) => n.isRead)}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("unread")}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "unread" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2 text-sm font-medium text-center ${
            activeTab === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="mx-auto h-8 w-8 mb-2 opacity-20" />
            <p>No {activeTab === "unread" ? "unread " : ""}notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="mt-1 flex-shrink-0">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
