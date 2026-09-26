"use client";

import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  X,
  Sun,
  Moon,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/service/api.service";

// =====================================================
// TYPES
// =====================================================

interface SearchTaskResult {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
}

interface EmployeeHeaderProps {
  user?: any;
  onOpenMobileMenu: () => void;
}

// =====================================================
// EMPLOYEE HEADER COMPONENT (MATCHES ADMIN PORTAL EXACTLY)
// =====================================================

export default function EmployeeHeader({
  user,
  onOpenMobileMenu,
}: EmployeeHeaderProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchTaskResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const input = searchRef.current?.querySelector("input");
        input?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search for employee's assigned tasks
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);

        const json = await apiRequest<{ data: { tasks?: SearchTaskResult[]; myTasks?: SearchTaskResult[] } }>(
          "/api/tasks/my",
          { method: "GET" }
        );

        if (controller.signal.aborted) return;

        const tasks: SearchTaskResult[] = json?.data?.tasks || json?.data?.myTasks || [];
        const lower = query.toLowerCase();
        const matched = tasks.filter(
          (item) =>
            item.title.toLowerCase().includes(lower) ||
            (item.description && item.description.toLowerCase().includes(lower))
        );
        setSearchResults(matched.slice(0, 8));
        setSearchOpen(true);
      } catch {
        if (controller.signal.aborted) return;
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Outside click to close search
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const openTask = (taskId: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/dashboard/tasks/${taskId}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Header Title & Subtitle based on route (aligns with Admin typography & hierarchy)
  const getHeaderInfo = () => {
    if (!pathname) {
      return {
        title: language === "hi" ? "कर्मचारी डैशबोर्ड" : "Dashboard",
        subtitle: language === "hi" ? "व्यक्तिगत कार्यक्षेत्र अवलोकन" : "Personal task & workspace overview.",
      };
    }
    if (pathname.startsWith("/dashboard/tasks")) {
      return {
        title: language === "hi" ? "कार्य" : "Tasks",
        subtitle: language === "hi" ? "कार्य प्रबंधन, असाइनमेंट एवं निगरानी" : "Manage, track and monitor your assigned tasks across your organization.",
      };
    }
    if (pathname.startsWith("/dashboard/calendar")) {
      return {
        title: language === "hi" ? "कैलेंडर" : "Calendar",
        subtitle: language === "hi" ? "अनुसूची एवं कार्य समय सीमाएं" : "Personal schedule, milestones & task deadlines.",
      };
    }
    if (pathname.startsWith("/dashboard/reports")) {
      return {
        title: language === "hi" ? "रिपोर्ट्स" : "Reports",
        subtitle: language === "hi" ? "प्रदर्शन मेट्रिक्स एवं विश्लेषण" : "Productivity analytics & performance metrics.",
      };
    }
    if (pathname.startsWith("/dashboard/activity")) {
      return {
        title: language === "hi" ? "गतिविधि" : "Activity",
        subtitle: language === "hi" ? "कार्य और खाते का गतिविधि इतिहास" : "Timeline of your workspace actions and task updates.",
      };
    }
    if (pathname.startsWith("/dashboard/profile")) {
      return {
        title: language === "hi" ? "प्रोफ़ाइल" : "Profile",
        subtitle: language === "hi" ? "व्यक्तिगत और कार्य प्रोफ़ाइल विवरण" : "Personal account credentials and employment details.",
      };
    }
    if (pathname.startsWith("/dashboard/settings")) {
      return {
        title: language === "hi" ? "सेटिंग्स" : "Settings",
        subtitle: language === "hi" ? "सिस्टम प्राथमिकताएं" : "Workspace configuration, notification & security preferences.",
      };
    }
    if (pathname.startsWith("/dashboard/notifications")) {
      return {
        title: language === "hi" ? "सूचनाएं" : "Notifications",
        subtitle: language === "hi" ? "सभी हालिया अलर्ट और अपडेट" : "Stay updated with task alerts, mentions, and updates.",
      };
    }
    return {
      title: language === "hi" ? "डैशबोर्ड" : "Dashboard",
      subtitle: language === "hi" ? "व्यक्तिगत कार्यक्षेत्र अवलोकन" : "Personal task & workspace overview.",
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <header
      className="
        sticky
        top-0
        z-40
        h-[64px]
        border-b
        border-[#E2E8F0]
        bg-white
        dark:border-[#1E3A47]
        dark:bg-[#081A24]
      "
    >
      <div className="flex h-full items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* =================================================
            LEFT: Mobile Toggle & Page Title
        ================================================= */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label={t("openMenu") || "Open Menu"}
            className="
              flex
              h-9
              w-9
              sm:h-10
              sm:w-10
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-[#E2E8F0]
              bg-white
              text-[#64748B]
              transition
              hover:bg-[#F8FAFC]
              hover:text-[#0F172A]
              dark:border-[#1E3A47]
              dark:bg-[#0B202B]
              dark:text-[#B6C5CF]
              dark:hover:bg-[#102A36]
              dark:hover:text-[#38BDF8]
              lg:hidden
            "
          >
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </button>

          <div className="min-w-0">
            <h1
              className="
                text-base
                sm:text-[20px]
                font-bold
                leading-[26px]
                tracking-[-0.02em]
                text-[#0F172A]
                dark:text-white
                truncate
              "
            >
              {headerInfo.title}
            </h1>

            <p
              className="
                hidden
                sm:block
                mt-0.5
                text-[12px]
                font-normal
                leading-[17px]
                text-[#64748B]
                dark:text-[#94A3B8]
                truncate
              "
            >
              {headerInfo.subtitle}
            </p>
          </div>
        </div>

        {/* =================================================
            CENTER: GLOBAL SEARCH (EXACT ADMIN STYLE)
        ================================================= */}
        <div
          ref={searchRef}
          className="
            relative
            hidden
            w-[280px]
            lg:w-[380px]
            md:block
          "
        >
          <div
            className="
              flex
              h-[38px]
              items-center
              rounded-lg
              border
              border-[#CBD5E1]
              bg-[#F8FAFC]
              px-3
              transition
              focus-within:border-[#2563EB]
              focus-within:bg-white
              focus-within:ring-2
              focus-within:ring-[#EFF6FF]
              dark:border-[#1E3A47]
              dark:bg-[#0B202B]
              dark:focus-within:border-[#38BDF8]
              dark:focus-within:bg-[#0B202B]
            "
          >
            <Search
              size={15}
              className="
                shrink-0
                text-[#475569]
                dark:text-[#94A3B8]
              "
            />

            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setSearchOpen(true);
                }
              }}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setSearchOpen(Boolean(val.trim()));
              }}
              placeholder={t("common.searchPlaceholder") || "Search tasks, assignments..."}
              className="
                h-full
                min-w-0
                flex-1
                bg-transparent
                px-2.5
                text-[13px]
                font-normal
                text-[#0F172A]
                outline-none
                placeholder:text-[#64748B]
                placeholder:font-normal
                dark:text-[#F8FAFC]
                dark:placeholder:text-[#94A3B8]
              "
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t("clearSearch") || "Clear search"}
                className="
                  flex
                  h-5
                  w-5
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  text-[#64748B]
                  transition
                  hover:bg-[#EFF6FF]
                  hover:text-[#0F172A]
                  dark:text-[#CBD5E1]
                  dark:hover:bg-[#102A36]
                  dark:hover:text-[#38BDF8]
                "
              >
                <X size={13} />
              </button>
            ) : (
              <span className="hidden sm:inline-flex shrink-0 min-w-fit items-center justify-center whitespace-nowrap rounded-[5px] border border-[#CBD5E1] bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#475569] shadow-none dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#CBD5E1]">
                <span>Ctrl + K</span>
              </span>
            )}
          </div>

          {/* SEARCH RESULTS DROPDOWN */}
          {searchOpen && (
            <div
              className="
                absolute
                left-0
                right-0
                top-[48px]
                z-50
                overflow-hidden
                rounded-xl
                border
                border-[#E2E8F0]
                bg-white
                shadow-lg
                dark:border-[#1E3A47]
                dark:bg-[#0B202B]
                dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]
              "
            >
              {searchLoading && (
                <div className="flex items-center gap-3 px-4 py-4">
                  <div
                    className="
                      h-4
                      w-4
                      animate-spin
                      rounded-full
                      border-2
                      border-[#E2E8F0]
                      border-t-[#2563EB]
                      dark:border-[#1E3A47]
                      dark:border-t-[#38BDF8]
                    "
                  />
                  <span className="text-[12px] font-medium text-[#64748B] dark:text-[#8EA5B2]">
                    {t("searching") || "Searching..."}
                  </span>
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="max-h-[420px] overflow-y-auto p-2">
                  <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#8EA5B2]">
                    {t("tasks_text") || "Tasks"}
                  </div>

                  {searchResults.map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => openTask(task._id)}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-xl
                        px-3
                        py-2.5
                        text-left
                        transition
                        hover:bg-[#F8FAFC]
                        dark:hover:bg-[#102A36]
                      "
                    >
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-[#EFF6FF]
                          border
                          border-[#DBEAFE]
                          text-[#2563EB]
                          dark:bg-[#102A36]
                          dark:border-[#1E3A47]
                          dark:text-[#38BDF8]
                        "
                      >
                        <ClipboardList size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[9px] font-semibold text-[#64748B] dark:text-[#B6C5CF]">
                            {task.status.replace("_", " ")}
                          </span>
                          <span className="text-[9px] text-[#94A3B8] dark:text-[#718E9A]">
                            •
                          </span>
                          <span className="text-[9px] font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searchLoading && searchResults.length === 0 && searchQuery.trim() && (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] dark:border-[#1E3A47] dark:bg-[#081A24] dark:text-[#718E9A]">
                    <Search size={18} />
                  </div>
                  <p className="mt-3 text-[12px] font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                    {t("noResultsFound") || "No tasks found"}
                  </p>
                  <p className="mt-1 text-[10px] text-[#64748B] dark:text-[#7F96A3]">
                    {language === "hi" ? "कोई कार्य नहीं मिला" : "Try different keywords"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            RIGHT: CONTROLS
        ================================================= */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <LanguageSwitcher />

          {/* Theme Toggle */}
          {themeMounted && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              className="
                flex
                h-9
                w-9
                sm:h-10
                sm:w-10
                items-center
                justify-center
                rounded-lg
                border
                border-[#E2E8F0]
                bg-white
                text-[#64748B]
                transition-all
                duration-200
                hover:bg-[#F8FAFC]
                hover:text-[#0F172A]
                dark:border-[#1E3A47]
                dark:bg-[#0B202B]
                dark:text-[#B6C5CF]
                dark:hover:bg-[#102A36]
                dark:hover:text-[#38BDF8]
              "
            >
              {theme === "dark" ? (
                <Sun size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
              ) : (
                <Moon size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2} />
              )}
            </button>
          )}

          {/* Notifications Dropdown */}
          <NotificationDropdown role={user?.role || "employee"} />

          {/* Divider */}
          <div className="hidden h-7 w-px bg-[#E2E8F0] dark:bg-[#1E3A47] sm:block" />

          {/* Profile Dropdown */}
          <ProfileDropdown user={user} role={user?.role || "employee"} />
        </div>
      </div>
    </header>
  );
}
