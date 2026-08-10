"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { POLLING_TIME } from "@/lib/constants";
import { Notification } from "@/types";


export function useNotifications() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"unread" | "all">("unread");
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/notifications?filter=all");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications();
      // Poll every 10 seconds
      const intervalId = setInterval(fetchNotifications, POLLING_TIME);
      return () => clearInterval(intervalId);
    }
  }, [status, fetchNotifications]);

  const markAllAsRead = async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/read", { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setLoading(false);
    }
  };

  const displayedNotifications =
    activeTab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications: displayedNotifications,
    unreadCount,
    activeTab,
    setActiveTab,
    markAllAsRead,
    loading,
    refresh: fetchNotifications,
  };
}
