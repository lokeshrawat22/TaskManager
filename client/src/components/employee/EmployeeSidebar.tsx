"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Activity,
  Bell,
  User,
  Settings,
  ShieldCheck,
  ChevronsLeft,
  LogOut,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth, resolvePhotoUrl, type PhotoSource } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { apiRequest } from "@/service/api.service";

// =====================================================
// TYPES
// =====================================================

interface EmployeeSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  user?: any;
}

interface ProfileUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  profilePhoto?: PhotoSource;
  profileImage?: PhotoSource;
  avatar?: PhotoSource;
}

// =====================================================
// MINDMATRIX VECTOR LOGO ICON (CLEAN ENTERPRISE BLUE)
// =====================================================

function MindMatrixLogoMark({ className = "h-7 w-7 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mmEmpBlueGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Outer Hexagon Matrix Lines */}
      <path
        d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Lattice Lines to Center */}
      <path
        d="M24 24L24 4M24 24L41.32 14M24 24L41.32 34M24 24L24 44M24 24L6.68 34M24 24L6.68 14"
        stroke="#2563EB"
        strokeWidth="1.4"
        strokeOpacity="0.75"
        strokeLinejoin="round"
      />

      {/* Hexagon Vertex Nodes */}
      <circle cx="24" cy="4" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="41.32" cy="14" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="41.32" cy="34" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="24" cy="44" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="6.68" cy="34" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="6.68" cy="14" r="2.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />

      {/* 3D 'M' Structure inside Center */}
      <polygon points="15,15 19,15 19,33 15,33" fill="#2563EB" />
      <polygon points="29,15 33,15 33,33 29,33" fill="#2563EB" />
      <polygon points="19,15 24,24 24,28 19,19" fill="#1D4ED8" />
      <polygon points="29,15 24,24 24,28 29,19" fill="#3B82F6" />
    </svg>
  );
}

// =====================================================
// NAVIGATION CONFIGURATION
// =====================================================

const getNavigation = (t: any, unreadNotificationsCount: number = 0) => {
  return [
    {
      section: t("navigation.workspace") || t("common.workspace") || "WORKSPACE",
      items: [
        {
          name: t("navigation.dashboard") || t("common.dashboard") || "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: t("navigation.tasks") || t("common.tasks") || "Tasks",
          href: "/dashboard/tasks",
          icon: ClipboardCheck,
        },
        {
          name: t("navigation.calendar") || t("common.calendar") || "Calendar",
          href: "/dashboard/calendar",
          icon: CalendarDays,
        },
        {
          name: t("navigation.reports") || t("common.reports") || "Reports",
          href: "/dashboard/reports",
          icon: BarChart3,
        },
        {
          name: t("recentActivity") || "Activity",
          href: "/dashboard/activity",
          icon: Activity,
        },
        {
          name: t("navigation.notifications") || t("common.notifications") || "Notifications",
          href: "/dashboard/notifications",
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
        },
      ],
    },
    {
      section: t("navigation.account") || t("common.account") || "ACCOUNT",
      items: [
        {
          name: t("navigation.profile") || t("common.profile") || "Profile",
          href: "/dashboard/profile",
          icon: User,
        },
        {
          name: t("navigation.settings") || t("common.settings") || "Settings",
          href: "/dashboard/settings",
          icon: Settings,
        },
      ],
    },
  ];
};

// =====================================================
// EMPLOYEE SIDEBAR COMPONENT (MATCHES ADMIN SIDEBAR EXACTLY)
// =====================================================

export default function EmployeeSidebar({
  mobileOpen = false,
  onClose,
  user: initialUser,
}: EmployeeSidebarProps) {
  const { currentUser, confirmLogout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const pathname = usePathname();

  const [signingOut, setSigningOut] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(initialUser || null);

  // Sync initial user
  useEffect(() => {
    if (initialUser) {
      setProfileUser(initialUser);
    }
  }, [initialUser]);

  // Fetch dynamic user profile if not provided
  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const response = await apiRequest<any>("/api/auth/me", {
          method: "GET",
        });
        if (!mounted) return;
        const user = response?.data ?? response?.user;
        if (user) {
          setProfileUser(user);
        }
      } catch {
        // keep fallback
      }
    };

    if (!initialUser && !currentUser) {
      fetchProfile();
    }

    return () => {
      mounted = false;
    };
  }, [initialUser, currentUser]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [mobileOpen]);

  // Auto close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen && onClose) {
      onClose();
    }
  }, [pathname]);

  // Auto close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onClose]);

  const navigation = getNavigation(t, unreadCount);

  // Sign out handler
  const handleSignOut = () => {
    confirmLogout();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // Single source of truth: reactive currentUser from AuthContext, fallback to initialUser or profileUser
  const activeUser = currentUser ?? initialUser ?? profileUser;

  const displayName = activeUser?.firstName
    ? `${activeUser.firstName} ${activeUser.lastName || ""}`.trim()
    : "Team Member";

  const userInitials = activeUser?.firstName
    ? `${activeUser.firstName[0] || ""}${activeUser.lastName?.[0] || ""}`.toUpperCase() || "EM"
    : "EM";

  const avatarUrl =
    resolvePhotoUrl(activeUser?.profilePhoto) ||
    resolvePhotoUrl(activeUser?.profileImage) ||
    resolvePhotoUrl(activeUser?.avatar);

  return (
    <>
      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-xs lg:hidden touch-none"
        />
      )}

      {/* =================================================
          SIDEBAR CONTAINER (PREMIUM MINIMAL ENTERPRISE SAAS)
      ================================================= */}
      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          h-[100vh]
          h-[100dvh]
          max-h-[100dvh]
          w-[248px]
          flex-col
          overflow-hidden
          border-r
          border-[#CBD5E1]
          dark:border-[#1E3A47]
          bg-[#FFFFFF]
          dark:bg-[#081A24]
          transition-transform
          duration-300
          ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none lg:pointer-events-auto"}
        `}
      >
        {/* =================================================
            HEADER: LOGO & EMPLOYEE WORKSPACE CARD
        ================================================= */}
        <div className="shrink-0 pt-4 px-3.5 pb-2 sidebar-safe-top">
          {/* Top Logo & Mobile Close */}
          <div className="flex items-center justify-between px-1 mb-3">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <MindMatrixLogoMark className="h-7 w-7 shrink-0" />
              <div className="flex items-center text-[19px] font-bold leading-none tracking-tight">
                <span className="text-[#0F172A] dark:text-[#F8FAFC]">{t("mind") || "Mind"}</span>
                <span className="text-[#1D4ED8] dark:text-[#38BDF8]">{t("matrix") || "Matrix"}</span>
              </div>
            </Link>

            {/* Collapse / Close Button on Mobile & Desktop */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("closeMenu") || "Collapse sidebar"}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] text-[#475569] dark:text-[#B6C5CF] hover:bg-[#F8FAFC] dark:hover:bg-[#102A36] hover:text-[#0F172A] dark:hover:text-[#38BDF8] transition-colors cursor-pointer"
            >
              <ChevronsLeft size={14} />
            </button>
          </div>

          {/* EMPLOYEE WORKSPACE CARD (Clean, White, 10px radius) */}
          <div className="rounded-[10px] border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] p-2.5 transition-colors">
            <div className="flex items-center gap-2.5">
              {/* Subtle icon container */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#F1F5F9] dark:bg-[#102A36] border border-[#CBD5E1] dark:border-[#1E3A47] text-[#1D4ED8] dark:text-[#38BDF8]">
                <ShieldCheck size={16} strokeWidth={2.4} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold leading-tight text-[#0F172A] dark:text-white">
                  {t("employeePortal") || "Employee Workspace"}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-normal leading-tight text-[#64748B] dark:text-[#CBD5E1]">
                  {t("teamMemberAccess") || "Personal task & schedule"}
                </p>
              </div>

              {/* Small subtle green status dot */}
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#10B981]"
                title="Workspace Active"
              />
            </div>
          </div>
        </div>

        {/* =================================================
            NAVIGATION ITEMS (Scrollable, Clean Spacing)
        ================================================= */}
        <nav className="flex-1 sidebar-scroll-container px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-4">
          {navigation.map((group) => (
            <div key={group.section}>
              {/* Section Header */}
              <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#CBD5E1]">
                {group.section}
              </p>

              {/* Items List */}
              <div className="space-y-0.5">
                {group.items.map((item: any) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group
                        relative
                        flex
                        h-[40px]
                        items-center
                        gap-3
                        rounded-[8px]
                        px-3
                        text-[14px]
                        leading-[20px]
                        transition-colors
                        duration-150
                        ${
                          active
                            ? "bg-[#EFF6FF] dark:bg-[#0C3345] font-semibold text-[#1D4ED8] dark:text-[#38BDF8]"
                            : "font-medium text-[#1E293B] dark:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#102A36] hover:text-[#090D14] dark:hover:text-white"
                        }
                      `}
                    >
                      {/* Subtle 2.5px blue indicator on the left for active item */}
                      {active && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-[#1D4ED8] dark:bg-[#38BDF8]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Icon (18px) */}
                      <span
                        className={`
                          flex
                          h-[18px]
                          w-[18px]
                          shrink-0
                          items-center
                          justify-center
                          transition-colors
                          ${
                            active
                              ? "text-[#1D4ED8] dark:text-[#38BDF8]"
                              : "text-[#475569] dark:text-[#94A3B8] group-hover:text-[#090D14] dark:group-hover:text-white"
                          }
                        `}
                      >
                        <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                      </span>

                      {/* Label */}
                      <span className="flex-1 truncate">
                        {item.name}
                      </span>

                      {/* Badge if present */}
                      {item.badge !== undefined && (
                        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-[11px] font-semibold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* =================================================
            FOOTER: USER PROFILE (Compact, Subtle Top Border)
        ================================================= */}
        <div className="shrink-0 border-t border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#081A24] p-3 sidebar-safe-bottom transition-colors">
          <div className="flex items-center justify-between gap-2.5">
            {/* Clickable Profile Info */}
            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
            >
              {/* Circular Avatar (36px, clean border) */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-[36px] w-[36px] rounded-full object-cover border border-[#CBD5E1] dark:border-[#1E3A47]"
                  />
                ) : (
                  <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F1F5F9] dark:bg-[#102A36] border border-[#CBD5E1] dark:border-[#1E3A47] text-xs font-bold text-[#090D14] dark:text-white">
                    {userInitials}
                  </div>
                )}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-white dark:ring-[#081A24]"
                  title="Online"
                />
              </div>

              {/* Name & Role */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white group-hover:text-[#1D4ED8] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                  {displayName}
                </p>
                <p className="truncate text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8] leading-tight mt-0.5">
                  {t("employee") || "Employee"}
                </p>
              </div>
            </Link>

            {/* Quick Logout Action Icon */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              title={t("common.logout") || "Sign out"}
              aria-label={t("common.logout") || "Sign out"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] text-[#64748B] dark:text-[#B6C5CF] hover:border-[#FECACA] dark:hover:border-[#6B2937] hover:bg-[#FEF2F2] dark:hover:bg-[#321820] hover:text-[#EF4444] dark:hover:text-[#FB7185] transition-colors cursor-pointer"
            >
              <LogOut size={15} className={signingOut ? "animate-pulse text-[#EF4444] dark:text-[#FB7185]" : ""} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
