"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bell,
  Building2,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  ClipboardList,
  X,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react";

import { useRouter, usePathname } from "next/navigation";

import AdminSidebar from "@/app/admin/AdminSidebar";
import { useTheme } from "@/components/ThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ProfileDropdown } from "@/components/ProfileDropdown";

// =====================================================
// TYPES
// =====================================================

interface AdminUser {
  _id?: string;
  userId?: string;

  firstName: string;
  lastName: string;

  email: string;

  role: "super_admin" | "administrator" | "admin" | "employee" | "user";

  profilePhoto?: string;
}

// =====================================================
// PROFILE RESPONSE
// =====================================================

interface ProfileResponse {
  success: boolean;
  message?: string;

  data?: AdminUser;
  user?: AdminUser;
}

// =====================================================
// SEARCH TYPES
// =====================================================

interface SearchEmployee {
  _id: string;

  firstName: string;
  lastName: string;

  email: string;

  employeeId?: string;

  department?: string;
  designation?: string;
}

interface SearchTask {
  _id: string;


  title: string;

  description?: string;

  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED";

  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";
}

interface SearchDepartment {
  name: string;
  id: string;
}

interface SearchResponse {
  success: boolean;

  data?: {
    employees: SearchEmployee[];
    tasks: SearchTask[];
    departments?: SearchDepartment[];
  };

  message?: string;
}

// =====================================================
// ADMIN LAYOUT
// =====================================================

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // ===================================================
  // THEME
  // ===================================================

  const { theme, setTheme } = useTheme();

  const [themeMounted, setThemeMounted] = useState(false);

  // ===================================================
  // STATES & AUTH
  // ===================================================

  const isUserAdmin = (user: any) => {
    if (!user?.role) return false;
    const userRole = String(user.role).toLowerCase();
    return (
      userRole === "super_admin" ||
      userRole === "administrator" ||
      userRole === "admin"
    );
  };

  const { currentUser, loading: authLoading, refreshCurrentUser } = useAuth();
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // ===================================================
  // ROLE-BASED HEADER TITLE & SUBTITLE
  // ===================================================

  const getRoleHeaderInfo = () => {
    const role = String(currentUser?.role || "").toLowerCase().trim();

    if (role === "super_admin") {
      return {
        title: language === "hi" ? "सुपर एडमिन पोर्टल" : "Super Admin Portal",
        subtitle:
          language === "hi"
            ? "पूर्ण प्रशासनिक पहुंच के साथ अपने संगठन का प्रबंधन करें।"
            : "Manage your organization with full administrative access.",
      };
    }

    if (role === "admin" || role === "administrator") {
      return {
        title: language === "hi" ? "एडमिन पोर्टल" : "Admin Portal",
        subtitle:
          language === "hi"
            ? "अपने संगठन के कार्यबल और संचालन का प्रबंधन करें।"
            : "Manage your organization's workforce and operations.",
      };
    }

    if (role === "employee" || role === "user") {
      return {
        title: language === "hi" ? "कर्मचारी पोर्टल" : "Employee Portal",
        subtitle:
          language === "hi"
            ? "अपने कार्यों का प्रबंधन करें और उत्पादक बने रहें।"
            : "Manage your tasks and stay productive.",
      };
    }

    // Fallback if role is missing or unknown
    return {
      title: language === "hi" ? "एडमिन पोर्टल" : "Admin Portal",
      subtitle:
        language === "hi"
          ? "अपने संगठन के कार्यबल और संचालन का प्रबंधन करें।"
          : "Manage your organization's workforce and operations.",
    };
  };

  const roleHeaderInfo = getRoleHeaderInfo();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ===================================================
  // GLOBAL SEARCH
  // ===================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse["data"]>({
    employees: [],
    tasks: [],
    departments: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const activeUser = currentUser;

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const hasVerifiedRef = useRef(false);
  const inFlightRef = useRef(false);

  const checkAdminAccess = useCallback(
    async (force = false) => {
      if (inFlightRef.current) return;
      if (hasVerifiedRef.current && !force) return;

      inFlightRef.current = true;

      try {
        setAuthError(null);
        const user = await refreshCurrentUser();

        // ===============================================
        // NO USER
        // ===============================================

        if (!user) {
          hasVerifiedRef.current = false;
          router.replace("/login");
          return;
        }

        // ===============================================
        // ROLE CHECK
        // ===============================================

        const userRole = String(user.role || "").toLowerCase();
        if (
          userRole !== "super_admin" &&
          userRole !== "administrator" &&
          userRole !== "admin"
        ) {
          hasVerifiedRef.current = false;
          router.replace("/login");
          return;
        }

        // ===============================================
        // ADMIN AUTHORIZED
        // ===============================================

        hasVerifiedRef.current = true;
        setCheckingAuth(false);
      } catch (error: any) {
        console.error(
          "[ADMIN AUTH] Authentication verification failed:",
          error
        );

        if (isUserAdmin(currentUserRef.current)) {
          setCheckingAuth(false);
          return;
        }

        const isAuthError =
          error?.status === 401 ||
          error?.response?.status === 401 ||
          error?.message?.includes("401") ||
          error?.message?.includes("unauthorized") ||
          error?.message?.includes("Access token is missing");

        if (isAuthError) {
          hasVerifiedRef.current = false;
          router.replace("/login");
        } else {
          setAuthError(
            error?.message ||
              t("adminAuthFailed") ||
              "Failed to verify administrator access. Please check your connection and try again."
          );
          setCheckingAuth(false);
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [refreshCurrentUser, router, t]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      hasVerifiedRef.current = false;
      router.replace("/login");
      return;
    }

    if (!isUserAdmin(currentUser)) {
      hasVerifiedRef.current = false;
      router.replace("/login");
      return;
    }

    hasVerifiedRef.current = true;
    setCheckingAuth(false);
  }, [currentUser, authLoading, router]);

  // ===================================================
  // GLOBAL SEARCH
  // ===================================================

  useEffect(() => {
    const query = searchQuery.trim();

    // ===============================================
    // EMPTY SEARCH
    // ===============================================


    if (!query) {
      setSearchResults({
        employees: [],
        tasks: [],
      });

      setSearchLoading(false);
      setSearchOpen(false);

      return;
    }

    // ===============================================
    // MINIMUM SEARCH LENGTH
    // ===============================================

    if (query.length < 2) {
      setSearchResults({
        employees: [],
        tasks: [],
      });

      setSearchLoading(false);
      setSearchOpen(true);

      return;
    }

    // ===============================================
    // ABORT PREVIOUS REQUEST
    // ===============================================

    const controller =
      new AbortController();

    // ===============================================
    // DEBOUNCE
    // ===============================================

    const timer = window.setTimeout(
      async () => {
        try {
          setSearchLoading(true);

          const response =
            await apiRequest<SearchResponse>(
              `/api/search?q=${encodeURIComponent(
                query
              )}`,
              {
                method: "GET",
                signal: controller.signal,
              }
            );

          setSearchResults(
            response?.data ?? {
              employees: [],
              tasks: [],
            }
          );

          setSearchOpen(true);
        } catch (error: any) {
          if (
            error?.name === "AbortError" ||
            controller.signal.aborted
          ) {
            return;
          }

          console.error(
            "[SEARCH] Search request failed:",
            error
          );

          setSearchResults({
            employees: [],
            tasks: [],
          });
        } finally {
          if (!controller.signal.aborted) {
            setSearchLoading(false);
          }
        }
      },
      600
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // ===================================================
  // CLOSE SEARCH OUTSIDE CLICK
  // ===================================================

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target as Node
        )
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ===================================================
  // SEARCH NAVIGATION

  const openEmployee = (
    employeeId: string
  ) => {
    setSearchOpen(false);
    setSearchQuery("");

    router.push(
      `/admin/employees/${employeeId}`
    );
  };

  const openTask = (
    taskId: string
  ) => {
    setSearchOpen(false);
    setSearchQuery("");

    router.push(
      `/admin/tasks/${taskId}`
    );
  };

  // ===================================================
  // CLEAR SEARCH
  // ===================================================

  const clearSearch = () => {
    setSearchQuery("");

    setSearchResults({
      employees: [],
      tasks: [],
    });

    setSearchOpen(false);
  };

  // ===================================================
  // THEME TOGGLE
  // ===================================================

  const toggleTheme = () => {
    setTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  };

  // ===================================================
  // AUTH CHECK SCREEN
  // ===================================================

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F9FB] dark:bg-[#081C27]">
        <div className="w-full max-w-sm px-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDECEF] bg-[#EAF7F9] text-[#087D8F] shadow-sm dark:border-[#3A5F71] dark:bg-[#123C46]">
            <ShieldCheck
              size={25}
              strokeWidth={1.8}
            />
          </div>

          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-[3px] border-[#BDCED6] border-t-[#087D8F] dark:border-[#3D6375] dark:border-t-[#12B8C8]" />

          <h2 className="mt-5 text-base font-bold text-[#063D63] dark:text-white">
            {t("verifyingAdministratorAccess")}</h2>

          <p className="mt-1.5 text-xs leading-5 text-[#8A9BA3] dark:text-[#9EB4BE]">
            {t("pleaseWaitWhileWe")}</p>
        </div>
      </div>
    );
  }

  // ===================================================
  // AUTH ERROR SCREEN
  // ===================================================

  if (authError && !isUserAdmin(activeUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F9FB] dark:bg-[#081C27]">
        <div className="w-full max-w-sm px-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle
              size={25}
              strokeWidth={1.8}
            />
          </div>

          <h2 className="mt-5 text-base font-bold text-[#063D63] dark:text-white">
            {t("authVerificationFailed") || "Administrator Access Verification Failed"}
          </h2>

          <p className="mt-1.5 text-xs leading-5 text-[#8A9BA3] dark:text-[#9EB4BE]">
            {authError}
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCheckingAuth(true);
                setAuthError(null);
                checkAdminAccess(true);
              }}
              className="w-full rounded-xl bg-[#087D8F] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#066574]"
            >
              {t("common.retry") || "Retry"}
            </button>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full rounded-xl border border-[#CCD8DF] bg-white py-2.5 text-xs font-bold text-[#718894] transition hover:bg-[#F4F8FB] dark:border-[#3A5F71] dark:bg-[#0C2330] dark:text-[#8FA8B2]"
            >
              {t("common.backToLogin") || "Back to Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // ADMIN UI
  // ===================================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071923]">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={handleCloseMobile}
        role={activeUser?.role}
        user={activeUser as any}
      />

      {/* =================================================
          MAIN
      ================================================= */}

      <div className="min-h-screen lg:pl-[248px] flex flex-col min-w-0 max-w-full overflow-x-hidden">

        {/* =================================================
            HEADER
        ================================================= */}

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
                LEFT
            ================================================= */}

            <div className="flex items-center gap-2 sm:gap-4 min-w-0">

              {/* MOBILE MENU */}

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(true)
                }
                aria-label={t("openMenu")}
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

              {/* TITLE */}

              <div className="min-w-0">
                <h1
                  style={{ fontFamily: "var(--font-jakarta), var(--font-inter), sans-serif" }}
                  className="
                    text-[18px]
                    sm:text-[21px]
                    font-extrabold
                    leading-[26px]
                    tracking-[-0.035em]
                    bg-gradient-to-r
                    from-[#092238]
                    via-[#0E3B5E]
                    to-[#0284C7]
                    bg-clip-text
                    text-transparent
                    dark:from-white
                    dark:via-[#F1F5F9]
                    dark:to-[#38BDF8]
                    truncate
                  "
                >
                  {roleHeaderInfo.title}
                </h1>

                <p
                  style={{ fontFamily: "var(--font-jakarta), var(--font-inter), sans-serif" }}
                  className="
                    hidden
                    sm:block
                    mt-0.5
                    text-[12px]
                    font-medium
                    leading-[17px]
                    tracking-[-0.01em]
                    text-[#557082]
                    dark:text-[#94A3B8]
                    truncate
                  "
                >
                  {roleHeaderInfo.subtitle}
                </p>
              </div>
            </div>

            {/* =================================================
                GLOBAL SEARCH
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

              {/* SEARCH INPUT */}

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
                    if (
                      searchQuery.trim()
                    ) {
                      setSearchOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setSearchQuery(value);
                    setSearchOpen(Boolean(value.trim()));
                  }}
                  placeholder={t("common.searchPlaceholder") || "Search employees, tasks, departments..."}
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
                    aria-label={t("clearSearch")}
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

              {/* =================================================
                  SEARCH RESULTS
              ================================================= */}

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

                  {/* LOADING */}

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

                      <span
                        className="
                          text-[12px]
                          font-medium
                          text-[#64748B]
                          dark:text-[#8EA5B2]
                        "
                      >
                        {t("searching")}</span>
                    </div>
                  )}

                  {/* RESULTS */}

                  {!searchLoading &&
                    searchResults && (
                      <div className="max-h-[420px] overflow-y-auto">

                        {/* EMPLOYEES */}

                        {searchResults.employees
                          .length > 0 && (
                          <div className="p-2">

                            <div
                              className="
                                px-3
                                pb-2
                                pt-1
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-[0.18em]
                                text-[#64748B]
                                dark:text-[#8EA5B2]
                              "
                            >
                              {t("employees_text")}</div>

                            {searchResults.employees.map(
                              (employee) => (
                                <button
                                  key={
                                    employee._id
                                  }
                                  type="button"
                                  onClick={() =>
                                    openEmployee(
                                      employee._id
                                    )
                                  }
                                  className="
                                    flex
                                    w-full
                                    items-center
                                    justify-between
                                    rounded-xl
                                    px-3
                                    py-2.5
                                    text-left
                                    transition
                                    hover:bg-[#F8FAFC]
                                    dark:hover:bg-[#102A36]
                                  "
                                >
                                  <div className="flex items-center gap-3">
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
                                        text-[11px]
                                        font-bold
                                        text-[#2563EB]
                                        dark:bg-[#102A36]
                                        dark:border-[#1E3A47]
                                        dark:text-[#38BDF8]
                                      "
                                    >
                                      {employee.firstName?.[0]}
                                      {employee.lastName?.[0]}
                                    </div>

                                    <div>
                                      <p
                                        className="
                                          text-[13px]
                                          font-bold
                                          text-[#0F172A]
                                          dark:text-[#F8FAFC]
                                        "
                                      >
                                        {
                                          employee.firstName
                                        }{" "}
                                        {
                                          employee.lastName
                                        }
                                      </p>

                                      <p
                                        className="
                                          text-[11px]
                                          text-[#64748B]
                                          dark:text-[#7F96A3]
                                        "
                                      >
                                        {employee.designation ||
                                          employee.department ||
                                          employee.email}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className="
                                        inline-block
                                        rounded-md
                                        bg-[#F8FAFC]
                                        border
                                        border-[#E2E8F0]
                                        px-2
                                        py-0.5
                                        text-[10px]
                                        font-semibold
                                        text-[#64748B]
                                        dark:bg-[#102A36]
                                        dark:border-[#1E3A47]
                                        dark:text-[#B6C5CF]
                                      "
                                    >
                                      {employee.department ||
                                        t("operations")}
                                    </span>

                                    {employee.employeeId && (
                                      <p
                                        className="
                                          mt-1
                                          text-[9px]
                                          text-[#94A3B8]
                                          dark:text-[#718894]
                                        "
                                      >
                                        #
                                        {
                                          employee.employeeId
                                        }
                                      </p>
                                    )}
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {/* TASKS */}

                        {searchResults.tasks
                          .length > 0 && (
                          <div
                            className="
                              border-t
                              border-[#F1F5F9]
                              p-2
                              dark:border-[#18333F]
                            "
                          >
                            <div
                              className="
                                px-3
                                pb-2
                                pt-1
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-[0.18em]
                                text-[#64748B]
                                dark:text-[#8EA5B2]
                              "
                            >
                              {t("tasks_text")}</div>

                            {searchResults.tasks.map(
                              (task) => (
                                <button
                                  key={task._id}
                                  type="button"
                                  onClick={() =>
                                    openTask(
                                      task._id
                                    )
                                  }
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
                                    <ClipboardList
                                      size={17}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="
                                        truncate
                                        text-[13px]
                                        font-bold
                                        text-[#0F172A]
                                        dark:text-[#F8FAFC]
                                      "
                                    >
                                      {task.title}
                                    </p>

                                    <div className="mt-1 flex items-center gap-2">
                                      <span
                                        className="
                                          text-[9px]
                                          font-semibold
                                          text-[#64748B]
                                          dark:text-[#B6C5CF]
                                        "
                                      >
                                        {task.status.replace(
                                          "_",
                                          " "
                                        )}
                                      </span>

                                      <span
                                        className="
                                          text-[9px]
                                          text-[#94A3B8]
                                          dark:text-[#718E9A]
                                        "
                                      >
                                        •
                                      </span>

                                      <span
                                        className="
                                          text-[9px]
                                          font-semibold
                                          text-[#64748B]
                                          dark:text-[#7F96A3]
                                        "
                                      >
                                        {task.priority}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {/* NO RESULTS */}

                        {!searchResults.employees
                          .length &&
                          !searchResults.tasks
                            .length && (
                            <div className="px-5 py-8 text-center">
                              <div
                                className="
                                  mx-auto
                                  flex
                                  h-10
                                  w-10
                                  items-center
                                  justify-center
                                  rounded-xl
                                  bg-[#F8FAFC]
                                  border
                                  border-[#E2E8F0]
                                  text-[#94A3B8]
                                  dark:bg-[#102A36]
                                  dark:border-[#1E3A47]
                                  dark:text-[#718E9A]
                                "
                              >
                                <Search
                                  size={18}
                                />
                              </div>

                              <p
                                className="
                                  mt-3
                                  text-[12px]
                                  font-bold
                                  text-[#0F172A]
                                  dark:text-[#F8FAFC]
                                "
                              >
                                {t("noResultsFound")}</p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  text-[#64748B]
                                  dark:text-[#7F96A3]
                                "
                              >
                                {t("tryAnotherEmployeeTask")}</p>
                            </div>
                          )}
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

              <LanguageSwitcher />

              {/* =================================================
                  SINGLE THEME TOGGLE
              ================================================= */}

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
                    <Sun
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                      strokeWidth={2}
                    />
                  ) : (
                    <Moon
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                      strokeWidth={2}
                    />
                  )}
                </button>
              )}

              {/* =================================================
                  NOTIFICATIONS
              ================================================= */}

              <NotificationDropdown role={activeUser?.role || "admin"} />

              {/* DIVIDER */}

              <div
                className="
                  hidden
                  h-7
                  w-px
                  bg-[#E2E8F0]
                  dark:bg-[#1E3A47]
                  sm:block
                "
              />

              {/* =================================================
                  ADMIN PROFILE
              ================================================= */}

              <ProfileDropdown user={activeUser as any} role={activeUser?.role || "admin"} />
            </div>
          </div>
        </header>

        {/* =================================================
            CHILD PAGE
        ================================================= */}

        <main id="main-content" tabIndex={-1} className="relative z-0 min-w-0 flex-1 outline-none">
          {children}
        </main>

      </div>
    </div>
  );
}

// =====================================================
// FULL NAME
// =====================================================

function getFullName(
  user?: AdminUser | null
): string {
  if (!user) {
    return "Administrator";
  }

  const name = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Administrator";
}

// =====================================================
// ADMIN INITIALS
// =====================================================

function getInitials(
  user?: AdminUser | null
): string {
  const name =
    getFullName(user);

  if (
    !name ||
    name === "Administrator"
  ) {
    return "AD";
  }

  const parts = name
    .split(" ")
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// =====================================================
// EMPLOYEE INITIALS
// =====================================================

function getInitialsFromEmployee(
  employee: SearchEmployee
): string {
  const first =
    employee.firstName
      ?.charAt(0)
      ?.toUpperCase() || "";

  const last =
    employee.lastName
      ?.charAt(0)
      ?.toUpperCase() || "";

  return (
    first + last
  ) || "U";
}