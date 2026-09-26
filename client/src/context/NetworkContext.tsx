"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import OfflinePage from "@/components/network/OfflinePage";

// =====================================================
// NETWORK CONTEXT TYPES
// =====================================================

export interface NetworkContextType {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  offlineMessage: string | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// =====================================================
// NETWORK PROVIDER COMPONENT
// =====================================================

interface NetworkProviderProps {
  children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  // Start with true for hydration safety so server & client match initial render
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);

  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to show temporary message
  const showOfflineFeedback = useCallback((msg: string) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setOfflineMessage(msg);
    messageTimeoutRef.current = setTimeout(() => {
      setOfflineMessage(null);
    }, 4000);
  }, []);

  // Real connection verification ping
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setLastChecked(new Date());

    // 1. First fast check: browser navigator.onLine
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setIsChecking(false);
      showOfflineFeedback("Still offline. Please check your connection.");
      return false;
    }

    // 2. Secondary check: Ping lightweight endpoint or favicon with a short timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Attempt a no-cache HEAD/GET request to verify actual connectivity
      const pingUrl = `/favicon.ico?_ping=${Date.now()}`;
      await fetch(pingUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we reach here, connectivity is restored
      setIsOnline(true);
      setOfflineMessage(null);
      setIsChecking(false);
      return true;
    } catch (err: any) {
      // If abort error or type error, verify navigator.onLine
      const stillOnline = typeof navigator !== "undefined" ? navigator.onLine : false;
      if (!stillOnline) {
        setIsOnline(false);
        showOfflineFeedback("Still offline. Please check your connection.");
        setIsChecking(false);
        return false;
      }

      // If navigator says online but ping failed, could be local server issue,
      // but device HAS network connectivity.
      setIsOnline(true);
      setOfflineMessage(null);
      setIsChecking(false);
      return true;
    }
  }, [showOfflineFeedback]);

  // Sync event listeners
  useEffect(() => {
    setIsMounted(true);

    // Initial state after mount
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
      setLastChecked(new Date());
    }

    const handleOnline = () => {
      setIsOnline(true);
      setOfflineMessage(null);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // Lock body scrolling when offline screen is displayed
  useEffect(() => {
    if (!isMounted) return;

    if (!isOnline) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOnline, isMounted]);

  const value = {
    isOnline,
    isChecking,
    lastChecked,
    offlineMessage,
    checkConnection,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
      {/* Global Offline Screen: Displayed when device is offline */}
      {isMounted && !isOnline && <OfflinePage />}
    </NetworkContext.Provider>
  );
}

// =====================================================
// CUSTOM HOOK
// =====================================================

export function useNetworkStatus(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used within a NetworkProvider");
  }
  return context;
}
