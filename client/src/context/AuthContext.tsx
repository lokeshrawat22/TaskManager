"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { apiRequest } from "@/service/api.service";
import { LogoutConfirmationModal } from "@/components/LogoutConfirmationModal";
import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// TYPES
// =====================================================

export type PhotoSource =
  | string
  | { url?: string; path?: string; secure_url?: string }
  | null
  | undefined;

export function resolvePhotoUrl(photo: PhotoSource): string | null {
  if (!photo) return null;
  if (typeof photo === "string") {
    const trimmed = photo.trim();
    return trimmed || null;
  }
  if (typeof photo === "object") {
    const url = photo.secure_url || photo.url || photo.path || "";
    return url.trim() || null;
  }
  return null;
}

export interface CurrentUser {
  _id?: string;
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  profilePhoto?: PhotoSource;
  profileImage?: PhotoSource;
  avatar?: PhotoSource;
  image?: PhotoSource;
  coverImage?: string | null;
  department?: string;
  designation?: string;
  dateOfBirth?: string;
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  updatedAt?: string;
  [key: string]: any;
}

export interface AuthContextType {
  currentUser: CurrentUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
  updateCurrentUser: (updates: Partial<CurrentUser>) => void;
  refreshCurrentUser: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
  confirmLogout: () => void;
  cancelLogout: () => void;
  isLogoutModalOpen: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// AUTH PROVIDER
// =====================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Synchronous, reactive update across all mounted React components
  const updateCurrentUser = useCallback((updates: Partial<CurrentUser>) => {
    setCurrentUser((prev) => {
      const base = prev || {};
      const merged: CurrentUser = { ...base, ...updates };

      // Explicitly clear photo aliases if profilePhoto is set to empty/null/undefined
      if ("profilePhoto" in updates) {
        if (!updates.profilePhoto) {
          merged.profilePhoto = null;
          merged.profileImage = null;
          merged.avatar = null;
          merged.image = null;
        } else {
          merged.profilePhoto = updates.profilePhoto;
        }
      }

      try {
        localStorage.setItem("user", JSON.stringify(merged));
      } catch {
        // Ignore localStorage quota / access issues
      }

      return merged;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("currentUserUpdated", { detail: updates })
      );
    }
  }, []);

  // In-flight request deduplication lock
  const inFlightPromiseRef = React.useRef<Promise<CurrentUser | null> | null>(null);

  // Fetch the latest profile data directly from server
  const refreshCurrentUser = useCallback(async (): Promise<CurrentUser | null> => {
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await apiRequest<any>("/api/auth/me", {
          method: "GET",
        });

        const user =
          response?.data?.user ?? response?.data ?? response?.user ?? null;

        if (user && typeof user === "object") {
          setCurrentUser(user);
          try {
            localStorage.setItem("user", JSON.stringify(user));
          } catch {
            // ignore
          }
          return user;
        } else {
          setCurrentUser(null);
          try {
            localStorage.removeItem("user");
          } catch {
            // ignore
          }
        }
      } catch (error: any) {
        if (error?.status === 401) {
          setCurrentUser(null);
          try {
            localStorage.removeItem("user");
          } catch {
            // ignore
          }
        }
      } finally {
        inFlightPromiseRef.current = null;
      }
      return null;
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  // Centralized logout confirmation modal state & guard
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  // Centralized logout executor
  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    try {
      setCurrentUser(null);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("user");
          sessionStorage.removeItem("mm_pending_verification_challenge");
          sessionStorage.clear();
        } catch {
          // ignore
        }
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
      if (apiUrl) {
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        }).catch(() => {});
      }
    } finally {
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }
  }, []);

  const confirmLogout = useCallback(() => {
    setIsLogoutModalOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    if (!isLoggingOutRef.current) {
      setIsLogoutModalOpen(false);
    }
  }, []);

  // Initial load and sync
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const isPublicAuthPage =
          path === "/login" ||
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/forgot-password") ||
          path.startsWith("/terms-and-conditions") ||
          path.startsWith("/privacy-policy");

        let storedUser = null;
        try {
          storedUser = localStorage.getItem("user");
        } catch {}

        // If already on a public auth page and no user session is cached in localStorage,
        // the visitor is unauthenticated. Skip network check to avoid unnecessary requests.
        if (isPublicAuthPage && !storedUser) {
          if (mounted) {
            setCurrentUser(null);
            setLoading(false);
          }
          return;
        }
      }

      try {
        const freshUser = await refreshCurrentUser();
        if (mounted && freshUser) {
          setCurrentUser(freshUser);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Listen for storage events across browser tabs
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user") {
        if (!event.newValue) {
          setCurrentUser(null);
        } else {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed && typeof parsed === "object") {
              setCurrentUser(parsed);
            }
          } catch {
            // ignore
          }
        }
      }
    };

    // Listen for legacy profilePhotoUpdated custom event
    const handlePhotoUpdated = () => {
      refreshCurrentUser();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("profilePhotoUpdated", handlePhotoUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("profilePhotoUpdated", handlePhotoUpdated);
    };
  }, [refreshCurrentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      updateCurrentUser,
      refreshCurrentUser,
      logout,
      confirmLogout,
      cancelLogout,
      isLogoutModalOpen,
      loading,
    }),
    [
      currentUser,
      updateCurrentUser,
      refreshCurrentUser,
      logout,
      confirmLogout,
      cancelLogout,
      isLogoutModalOpen,
      loading,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        isLoading={isLoggingOut}
        onClose={cancelLogout}
        onConfirm={logout}
      />
    </AuthContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
