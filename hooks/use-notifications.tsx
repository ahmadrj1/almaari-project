"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { POLLING_TIME, MAX_NOTIFICATIONS_MEMORY } from "@/lib/constants";
import { Notification } from "@/types";

export function useNotifications() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"unread" | "all">("unread");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);

  const stateRef = useRef({ page, activeTab });
  useEffect(() => {
    stateRef.current = { page, activeTab };
  }, [page, activeTab]);

  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const currentLimit = stateRef.current.page * MAX_NOTIFICATIONS_MEMORY;
      const res = await fetch(`/api/notifications?filter=${stateRef.current.activeTab}&limit=${currentLimit}&offset=0`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications);
        setHasMore(json.data.hasMore);
        setUnreadCount(json.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, [status]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === "authenticated") {
      setNotifications([]);
      setPage(1);
      setHasMore(false);
      setLoading(true);
      fetch(`/api/notifications?filter=${activeTab}&limit=${MAX_NOTIFICATIONS_MEMORY}&offset=0`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setNotifications(json.data.notifications);
            setHasMore(json.data.hasMore);
            setUnreadCount(json.data.unreadCount);
          }
        })
        .catch((error) => console.error("Failed to fetch notifications", error))
        .finally(() => setLoading(false));
    }
  }, [status, activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (status === "authenticated") {
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
        if (activeTab === "unread") {
          setNotifications([]);
        } else {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRead = async (notificationId: string) => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch(`/api/notifications/read?id=${notificationId}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (json.success) {
        if (activeTab === "unread") {
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        } else {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            )
          );
        }
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      console.error("Failed to toggle notification read", error);
    }
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || status !== "authenticated") return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const offset = page * MAX_NOTIFICATIONS_MEMORY;
      const res = await fetch(`/api/notifications?filter=${activeTab}&limit=${MAX_NOTIFICATIONS_MEMORY}&offset=${offset}`);
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => [...prev, ...json.data.notifications]);
        setHasMore(json.data.hasMore);
        setUnreadCount(json.data.unreadCount);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more notifications", error);
    } finally {
      setLoading(false);
    }
  }, [status, activeTab, page, hasMore, loading]);

  return {
    notifications,
    unreadCount,
    activeTab,
    setActiveTab,
    markAllAsRead,
    toggleRead,
    loading,
    refresh: fetchNotifications,
    loadMore,
    hasMore,
  };
}
