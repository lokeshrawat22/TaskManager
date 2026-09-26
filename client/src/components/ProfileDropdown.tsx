"use client";

import {
  ChevronDown,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth, resolvePhotoUrl, type PhotoSource } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";

export interface ProfileDropdownUser {
  _id?: string;
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  profilePhoto?: PhotoSource;
  profileImage?: PhotoSource;
  avatar?: PhotoSource;
  image?: PhotoSource;
}

import { getRoleLabel } from "@/constants/rbac";

interface ProfileDropdownProps {
  user?: ProfileDropdownUser | null;
  role: "super_admin" | "administrator" | "admin" | "employee" | "user" | string;
  onLogout?: () => void;
  logoutLoading?: boolean;
}

function getUserDisplayName(user?: ProfileDropdownUser | null, role: string = "employee"): string {
  if (!user) return getRoleLabel(role);

  if (user.fullName?.trim()) return user.fullName.trim();
  if (user.name?.trim()) return user.name.trim();

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || getRoleLabel(role);
}

function getUserInitials(user?: ProfileDropdownUser | null, role: string = "employee"): string {
  const name = getUserDisplayName(user, role);
  if (!name || name === "Super Administrator") return "SA";
  if (name === "Administrator") return "AD";
  if (name === "Employee") return "EM";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getProfileImage(user?: ProfileDropdownUser | null): string | null {
  return (
    resolvePhotoUrl(user?.profilePhoto) ||
    resolvePhotoUrl(user?.profileImage) ||
    resolvePhotoUrl(user?.avatar) ||
    resolvePhotoUrl(user?.image) ||
    null
  );
}

export function ProfileDropdown({
  user: propUser,
  role,
  onLogout,
  logoutLoading = false,
}: ProfileDropdownProps) {
  const { currentUser, confirmLogout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [internalLogoutLoading, setInternalLogoutLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Single source of truth: reactive currentUser from AuthContext, fallback to propUser
  const user = currentUser ?? propUser;
  const effectiveRole = user?.role || role;
  const roleLabel = getRoleLabel(effectiveRole, t);
  const displayName = getUserDisplayName(user, effectiveRole);
  const initials = getUserInitials(user, effectiveRole);
  const profileImage = getProfileImage(user);
  const isAdmin =
    effectiveRole === "super_admin" ||
    effectiveRole === "administrator" ||
    effectiveRole === "admin";

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const handleSignOut = () => {
    setOpen(false);

    if (onLogout) {
      onLogout();
      return;
    }

    confirmLogout();
  };

  const profilePath = isAdmin ? "/admin/profile" : "/dashboard/profile";
  const settingsPath = isAdmin ? "/admin/settings" : "/dashboard/settings";

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("userProfile") || "User Profile Menu"}
        className="flex items-center gap-2 sm:gap-2.5 rounded-xl p-1 sm:px-1.5 sm:py-1.5 transition hover:bg-[#F4F9FB] dark:hover:bg-[#102A36] focus:outline-none"
      >
        {/* AVATAR */}
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl object-cover shadow-sm border border-transparent dark:border-[#1E3A47]"
          />
        ) : (
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#12B8C8] to-[#087D8F] text-[11px] sm:text-[12px] font-bold text-white shadow-sm">
            {initials}
          </div>
        )}

        {/* NAME + ROLE */}
        <div className="hidden text-left sm:block">
          <p className="max-w-[130px] truncate text-[13px] font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            {displayName}
          </p>
          <p className="mt-0.5 text-[11px] font-normal leading-tight text-[#64748B] dark:text-[#94A3B8]">
            {roleLabel}
          </p>
        </div>

        {/* CHEVRON */}
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`text-[#879CA7] transition-transform duration-200 dark:text-[#8EA5B2] ${
            open ? "rotate-180 text-[#087D8F] dark:text-[#38BDF8]" : ""
          }`}
        />
      </button>

      {/* ATTACHED HEADER DROPDOWN PANEL */}
      {open && (
        <div
          id="profile-dropdown-panel"
          role="menu"
          aria-orientation="vertical"
          className="
            dropdown-fade-in
            absolute
            top-[calc(100%+8px)]
            right-0
            z-[100]
            w-[195px]
            sm:w-[210px]
            max-w-[calc(100vw-24px)]
            rounded-[12px]
            border
            border-[#D9E2E8]
            bg-white
            p-1.5
            shadow-[0_10px_25px_-5px_rgba(6,61,99,0.1),0_4px_10px_-2px_rgba(6,61,99,0.04)]
            dark:border-[#1E3A47]
            dark:bg-[#0B202B]
            dark:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.6)]
          "
        >
          {/* TOP ARROW / CARET */}
          <div
            className="absolute -top-[5px] right-3.5 sm:right-4 h-2.5 w-2.5 rotate-45 border-l border-t border-[#D9E2E8] bg-white dark:border-[#1E3A47] dark:bg-[#0B202B]"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col">
            {/* 1. PROFILE */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate(profilePath)}
              className="group flex h-[44px] min-h-[44px] w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-[13px] font-medium text-[#2D3F4E] transition-colors duration-150 hover:bg-[#F3F7FA] hover:text-[#087D8F] focus:outline-none focus-visible:bg-[#F3F7FA] focus-visible:text-[#087D8F] active:bg-[#EAF2F6] dark:text-[#B6C5CF] dark:hover:bg-[#102A36] dark:hover:text-[#38BDF8] dark:focus-visible:bg-[#102A36] dark:active:bg-[#14323F]"
            >
              <UserCircle
                size={18}
                strokeWidth={1.8}
                className="shrink-0 text-[#627D8C] transition-colors group-hover:text-[#087D8F] group-focus-visible:text-[#087D8F] dark:text-[#8EA5B2] dark:group-hover:text-[#38BDF8]"
              />
              <span>{t("common.profile") || "Profile"}</span>
            </button>

            {/* 2. SETTINGS */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate(settingsPath)}
              className="group flex h-[44px] min-h-[44px] w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-[13px] font-medium text-[#2D3F4E] transition-colors duration-150 hover:bg-[#F3F7FA] hover:text-[#087D8F] focus:outline-none focus-visible:bg-[#F3F7FA] focus-visible:text-[#087D8F] active:bg-[#EAF2F6] dark:text-[#B6C5CF] dark:hover:bg-[#102A36] dark:hover:text-[#38BDF8] dark:focus-visible:bg-[#102A36] dark:active:bg-[#14323F]"
            >
              <Settings
                size={18}
                strokeWidth={1.8}
                className="shrink-0 text-[#627D8C] transition-colors group-hover:text-[#087D8F] group-focus-visible:text-[#087D8F] dark:text-[#8EA5B2] dark:group-hover:text-[#38BDF8]"
              />
              <span>{t("common.settings") || "Settings"}</span>
            </button>

            {/* DIVIDER */}
            <div className="my-1 h-px bg-[#EDF2F6] dark:bg-[#1E3A47]" />

            {/* 3. SIGN OUT */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={logoutLoading || internalLogoutLoading}
              className="group flex h-[44px] min-h-[44px] w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-[13px] font-medium text-[#DC2626] transition-colors duration-150 hover:bg-[#FEF2F2] focus:outline-none focus-visible:bg-[#FEF2F2] active:bg-[#FEE2E2] disabled:opacity-50 dark:text-[#FB7185] dark:hover:bg-[#321820] dark:focus-visible:bg-[#321820] dark:active:bg-[#3B171C]"
            >
              <LogOut
                size={18}
                strokeWidth={1.8}
                className="shrink-0 text-[#DC2626] transition-colors dark:text-[#F87171]"
              />
              <span>
                {logoutLoading || internalLogoutLoading
                  ? t("common.signingOut") || "Signing out..."
                  : t("common.logout") || "Sign out"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
