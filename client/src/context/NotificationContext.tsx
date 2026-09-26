"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// =====================================================
// TYPES
// =====================================================

export interface NotificationContextType {
  unreadCount: number;
  loading: boolean;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadCount: (force?: boolean) => Promise<void>;
  decrementUnreadCount: (amount?: number) => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// PROVIDER
// =====================================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || API_BASE_URL).replace(/\/$/, "");
const POLL_INTERVAL = 60000; // 60s controlled background sync

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const inFlightRef = useRef<boolean>(false);
  const lastFetchedRef = useRef<number>(0);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(
    async (force = false) => {
      // If user is unauthenticated, no notification fetch is needed
      if (!currentUserRef.current) {
        setUnreadCount(0);
        return;
      }

      // Avoid duplicate in-flight requests
      if (inFlightRef.current) return;

      // Avoid rapid repeated requests unless forced (throttle 3s)
      const now = Date.now();
      if (!force && now - lastFetchedRef.current < 3000) {
        return;
      }

      inFlightRef.current = true;
      setLoading(true);

      const controller = new AbortController();
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) return;

        const json = await res.json();
        if (json?.success && typeof json.data?.count === "number") {
          setUnreadCount(json.data.count);
          lastFetchedRef.current = Date.now();
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          // silent failure - never disrupt user experience
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  // Decrement unread count (e.g. after marking an item read or deleting an unread item)
  const decrementUnreadCount = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  // Reset unread count to 0 (e.g. mark all as read)
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const currentUserId = currentUser?.id || currentUser?._id;
  const prevUserIdRef = useRef(currentUserId);
  if (prevUserIdRef.current !== currentUserId) {
    prevUserIdRef.current = currentUserId;
    if (!currentUserId && unreadCount !== 0) {
      setUnreadCount(0);
    }
  }

  // Initial fetch on mount / user change & controlled visibility-aware poll
  useEffect(() => {
    if (!currentUser) return;

    // Fetch on mount or when user changes
    void fetchUnreadCount();

    // Controlled interval sync when tab is active and visible
    const interval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        void fetchUnreadCount();
      }
    }, POLL_INTERVAL);

    // Sync on tab refocus if more than 30s elapsed
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchedRef.current > 30000
      ) {
        void fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser, fetchUnreadCount]);

  const value = {
    unreadCount,
    loading,
    setUnreadCount,
    fetchUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
