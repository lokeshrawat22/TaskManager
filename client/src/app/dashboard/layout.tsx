"use client";

import { ReactNode, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { handleBlockedEmployeeLogout } from "@/service/auth.service";
import { useAuth } from "@/context/AuthContext";
import EmployeeSidebar from "@/components/employee/EmployeeSidebar";
import EmployeeHeader from "@/components/employee/EmployeeHeader";

// =====================================================
// TYPES
// =====================================================

type User = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  profilePhoto?: string;
  profileImage?: string;
  avatar?: string;
  image?: string;
  isBlocked?: boolean;
};

// =====================================================
// AUTH LOADING SCREEN
// =====================================================

function AuthCheckingScreen() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#071923]">
      <div className="flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CBD5E1] bg-white text-[#2563EB] shadow-xs dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8]">
          <ShieldCheck size={28} strokeWidth={1.8} />
        </div>

        <div className="mt-6 h-8 w-8 animate-spin rounded-full border-[3px] border-[#E2E8F0] border-t-[#2563EB] dark:border-[#1E3A47] dark:border-t-[#38BDF8]" />

        <h2 className="mt-5 text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
          {t("verifyingEmployeeAccess") || "Verifying Employee Access..."}
        </h2>

        <p className="mt-2 text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
          {t("pleaseWaitWhileWe1") || "Please wait while we verify your workspace authorization."}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// EMPLOYEE DASHBOARD LAYOUT
// =====================================================

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { currentUser, loading: authLoading, refreshCurrentUser } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setCheckingAuth(false);
      window.location.replace("/login");
      return;
    }

    if (currentUser.isBlocked) {
      handleBlockedEmployeeLogout();
      return;
    }

    const role = String(currentUser.role ?? "").toLowerCase();
    if (role !== "employee" && role !== "user") {
      setCheckingAuth(false);
      window.location.replace("/login");
      return;
    }

    setUser(currentUser as User);
    setCheckingAuth(false);
  }, [currentUser, authLoading]);

  // Periodic visibility-aware sync (60s)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          const freshUser = await refreshCurrentUser();
          if (freshUser?.isBlocked) {
            handleBlockedEmployeeLogout();
          }
        } catch {
          // silent sync failure
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser, refreshCurrentUser]);

  if (checkingAuth) {
    return <AuthCheckingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071923] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* SIDEBAR */}
      <EmployeeSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* MAIN CONTAINER */}
      <div className="min-h-screen lg:pl-[248px] flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* HEADER */}
        <EmployeeHeader
          user={user}
          onOpenMobileMenu={() => setSidebarOpen(true)}
        />

        {/* PAGE CONTENT */}
        <main
          id="main-content"
          tabIndex={-1}
          className="relative min-w-0 flex-1 outline-none p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}