"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ShieldCheck,
  Lock,
  Mail,
  Monitor,
  Moon,
  Sun,
  ChevronRight,
  Check,
  AlertCircle,
  Globe,
  UserRound,
  Settings2,
  Eye,
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import AccessibilitySettingsCard from "@/components/settings/AccessibilitySettingsCard";

// =====================================================
// TYPES
// =====================================================

type SettingSection =
  | "general"
  | "notifications"
  | "security"
  | "appearance"
  | "accessibility";

interface NotificationSettings {
  taskAssigned: boolean;
  taskUpdated: boolean;
  leaveRequests: boolean;
  employeeActivity: boolean;
  systemAlerts: boolean;
  emailNotifications: boolean;
}

interface SecuritySettings {
  twoFactor: boolean;
  loginAlerts: boolean;
}

interface GeneralSettings {
  timezone: string;
}

// =====================================================
// PAGE
// =====================================================

export default function AdminSettingsPage() {
  const { t } = useLanguage();

  const [activeSection, setActiveSection] =
    useState<SettingSection>("general");

  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ===================================================
  // THEME
  // ===================================================

  const { theme, setTheme } = useTheme();

  // ===================================================
  // NOTIFICATIONS
  // ===================================================

  const [notifications, setNotifications] =
    useState<NotificationSettings>({
      taskAssigned: true,
      taskUpdated: true,
      leaveRequests: true,
      employeeActivity: false,
      systemAlerts: true,
      emailNotifications: true,
    });

  // ===================================================
  // SECURITY
  // ===================================================

  const [security, setSecurity] =
    useState<SecuritySettings>({
      twoFactor: false,
      loginAlerts: true,
    });

  // ===================================================
  // GENERAL
  // ===================================================

  const [general, setGeneral] =
    useState<GeneralSettings>({
      timezone: "Asia/Kolkata",
    });

  // ===================================================
  // PASSWORD
  // ===================================================

  // ===================================================
  // MOUNT
  // ===================================================

  useEffect(() => {
    setMounted(true);
  }, []);

  // ===================================================
  // LOAD LOCAL SETTINGS
  // ===================================================

  useEffect(() => {
    if (!mounted) return;

    try {
      const stored = localStorage.getItem(
        "mindmatrix-admin-settings"
      );

      if (!stored) return;

      const parsed = JSON.parse(stored);

      if (parsed.notifications) {
        setNotifications(parsed.notifications);
      }

      if (parsed.security) {
        setSecurity(parsed.security);
      }

      if (parsed.general) {
        setGeneral(parsed.general);
      }
    } catch (error) {
      console.error(
        "Unable to load settings:",
        error
      );
    }
  }, [mounted]);

  // ===================================================
  // APPLY THEME
  // ===================================================

  const applyTheme = (
    newTheme: "light" | "dark"
  ) => {
    if (!mounted) return;

    setTheme(newTheme);
  };

  // ===================================================
  // SAVE SETTINGS
  // ===================================================

  const handleSave = () => {
    try {
      localStorage.setItem(
        "mindmatrix-admin-settings",
        JSON.stringify({
          notifications,
          security,
          general,
        })
      );

      setSaved(true);
      showToast.success(t("settingsSaved") || "Settings saved successfully!");

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Unable to save settings:",
        error
      );
      showToast.error(t("common.unableToSaveSettings") || t("unableToSaveSettings") || "Unable to save settings.");
    }
  };

  // ===================================================
  // TOGGLE
  // ===================================================

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) => {
    return (
      <button
        type="button"
        onClick={onChange}
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-[#087D8F]"
            : "bg-[#C9D7DC] dark:bg-[#49636F]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white dark:bg-[#102A38] shadow-sm transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    );
  };

  // ===================================================
  // SIDEBAR ITEM
  // ===================================================

  const SettingNav = ({
    id,
    icon: Icon,
    title,
    description,
  }: {
    id: SettingSection;
    icon: React.ElementType;
    title: string;
    description: string;
  }) => {
    const active = activeSection === id;

    return (
      <button
        type="button"
        onClick={() => setActiveSection(id)}
        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors cursor-pointer ${
          active
            ? "bg-[#EAF7F9] dark:bg-[#123C46] text-[#0F172A] dark:text-white border border-[#BCE4EA] dark:border-[#1E5260]"
            : "text-[#334155] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A38] border border-transparent"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active
              ? "bg-[#087D8F] text-white"
              : "bg-[#F1F5F9] text-[#475569] dark:bg-[#18333F] dark:text-[#94A3B8]"
          }`}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[14px] leading-[20px] ${
              active
                ? "font-semibold text-[#0F172A] dark:text-white"
                : "font-medium text-[#1E293B] dark:text-[#F1F5F9]"
            }`}
          >
            {title}
          </p>

          <p className="mt-0.5 truncate text-[12px] font-normal leading-[16px] text-[#64748B] dark:text-[#94A3B8]">
            {description}
          </p>
        </div>

        <ChevronRight
          size={16}
          className={
            active
              ? "text-[#087D8F] dark:text-[#38BDF8]"
              : "text-[#94A3B8] dark:text-[#64748B]"
          }
        />
      </button>
    );
  };

  // ===================================================
  // SETTING ROW
  // ===================================================

  const SettingRow = ({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5 border-b border-[#E2E8F0] dark:border-[#1E3A47] py-4 sm:py-4.5 last:border-b-0">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] dark:bg-[#123C46] text-[#2563EB] dark:text-[#38BDF8]">
            <Icon size={17} />
          </div>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
              {title}
            </p>

            <p className="mt-0.5 max-w-[520px] text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center pl-12 sm:pl-0">{children}</div>
      </div>
    );
  };

  // ===================================================
  // SELECT
  // ===================================================

  const selectClass =
    "h-[38px] w-full sm:w-auto min-w-0 sm:min-w-[180px] rounded-lg border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] px-3 text-[13px] font-medium leading-[18px] text-[#0F172A] dark:text-white outline-none transition-colors hover:border-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 dark:focus:border-[#38BDF8] cursor-pointer";

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#F8FAFC] dark:bg-[#071923] transition-colors duration-200">
      {/* BACKGROUND GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#D7E7EC 1px, transparent 1px), linear-gradient(90deg, #D7E7EC 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] px-3 py-1 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#087D8F] dark:bg-[#38BDF8]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
                {t("administration")}
              </span>
            </div>

            <h1 className="mt-2.5 text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("settings")}
            </h1>

            <p className="mt-1 text-[13px] font-normal leading-[20px] text-[#64748B] dark:text-[#94A3B8]">
              {t("configureYourAdministratorWorkspace")}
            </p>
          </div>

          {/* SAVE */}
          <button
            type="button"
            onClick={handleSave}
            className={`flex h-[38px] sm:h-[40px] items-center justify-center gap-2 rounded-[9px] px-4.5 text-[13px] font-semibold leading-[18px] text-white shadow-xs border transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              saved
                ? "bg-[#16A34A] border-[#15803D] hover:bg-[#15803D]"
                : "bg-[#063B61] border-[#12456B] hover:bg-[#032F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B5]"
            }`}
          >
            <Check size={16} strokeWidth={2.2} />
            <span>{saved ? (t("common.saved") || t("saved") || "Saved") : (t("common.saveChanges") || "Save Changes")}</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[285px_minmax(0,1fr)]">
          {/* SETTINGS NAVIGATION */}
          <aside className="h-fit rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] p-3 shadow-2xs">
            <div className="px-3 pb-2.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
                {t("preferences")}
              </p>
            </div>

            <div className="space-y-1">
              <SettingNav
                id="general"
                icon={Settings2}
                title={t("general")}
                description={t("workspacePreferences")}
              />

              <SettingNav
                id="notifications"
                icon={Bell}
                title={t("navigation.notifications") || t("notifications.notificationsTitle") || "Notifications"}
                description={t("alertsAndCommunication")}
              />

              <SettingNav
                id="security"
                icon={ShieldCheck}
                title={t("security")}
                description={t("passwordAndProtection")}
              />

              <SettingNav
                id="appearance"
                icon={Monitor}
                title={t("appearance")}
                description={t("themeAndDisplay")}
              />

              <SettingNav
                id="accessibility"
                icon={Eye}
                title="Accessibility"
                description="Font size, scale & contrast"
              />
            </div>

            {/* SECURITY STATUS */}
            <div className="mt-4 rounded-xl bg-[#063D63] dark:bg-[#071926] p-4 border border-[#0A4B75] dark:border-[#1E435E]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-[#38BDF8]">
                  <ShieldCheck
                    size={16}
                    strokeWidth={2.2}
                  />
                </div>

                <div>
                  <p className="text-[13px] font-semibold leading-[18px] text-white">
                    {t("workspaceProtected") || "Workspace Protected"}
                  </p>

                  <p className="mt-0.5 text-[12px] font-normal leading-[16px] text-[#CBD5E1]">
                    {t("administratorAccess") || "Administrator access"}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-full rounded-full bg-[#38BDF8]" />
              </div>

              <p className="mt-2 text-[11px] font-semibold leading-[16px] text-[#38BDF8]">
                {t("securityStatusGood") || "Security status: Good"}
              </p>
            </div>
          </aside>

          {/* MAIN SETTINGS */}
          <section className="min-w-0">
            {/* =================================================
                GENERAL
            ================================================= */}
            {activeSection === "general" && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] shadow-2xs">
                  <div className="border-b border-[#E2E8F0] dark:border-[#1E3A47] px-6 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
                      {t("workspace")}
                    </p>

                    <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
                      {t("generalPreferences")}
                    </h2>

                    <p className="mt-1 text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
                      {t("configureHowMindmatrixBehaves")}
                    </p>
                  </div>

                  <div className="px-6">
                    <SettingRow
                      icon={Globe}
                      title={t("timezone")}
                      description={t("usedForCalendarsTask")}
                    >
                      <select
                        value={general.timezone}
                        onChange={(e) =>
                          setGeneral({
                            ...general,
                            timezone: e.target.value,
                          })
                        }
                        className={selectClass}
                      >
                        <option value="Asia/Kolkata">
                          {t("indiaIst")}
                        </option>
                        <option value="UTC">{t("utc")}</option>
                        <option value="America/New_York">
                          {t("easternTime")}
                        </option>
                        <option value="Europe/London">
                          {t("london")}
                        </option>
                      </select>
                    </SettingRow>

                    <SettingRow
                      icon={UserRound}
                      title={t("administratorAccount")}
                      description={t("yourAccountHasFull")}
                    >
                      <span className="inline-flex items-center rounded-md bg-[#F0FDF4] dark:bg-[#064E3B]/30 px-2.5 py-1 text-[11px] font-semibold leading-[16px] text-[#16A34A] dark:text-[#34D399] border border-[#DCFCE7] dark:border-[#065F46]">
                        {t("admin") || "ADMIN"}
                      </span>
                    </SettingRow>
                  </div>
                </section>
              </div>
            )}

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}
            {activeSection === "notifications" && (
              <section className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] shadow-2xs">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E3A47] px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
                    {t("communication")}
                  </p>

                  <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
                    {t("notificationPreferences")}
                  </h2>

                  <p className="mt-1 text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
                    {t("chooseWhichEventsShould")}
                  </p>
                </div>

                <div className="px-6">
                  <SettingRow
                    icon={Mail}
                    title={t("emailNotifications")}
                    description={t("receiveImportantOrganizationUpdates")}
                  >
                    <Toggle
                      enabled={notifications.emailNotifications}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          emailNotifications:
                            !notifications.emailNotifications,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    icon={Bell}
                    title={t("taskAssigned")}
                    description={t("notifyYouWhenA")}
                  >
                    <Toggle
                      enabled={notifications.taskAssigned}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          taskAssigned:
                            !notifications.taskAssigned,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    icon={Bell}
                    title={t("taskUpdates")}
                    description={t("receiveNotificationsWhenImportant")}
                  >
                    <Toggle
                      enabled={notifications.taskUpdated}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          taskUpdated:
                            !notifications.taskUpdated,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    icon={UserRound}
                    title={t("employeeActivity")}
                    description={t("getUpdatesAboutRelevant")}
                  >
                    <Toggle
                      enabled={notifications.employeeActivity}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          employeeActivity:
                            !notifications.employeeActivity,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    icon={Bell}
                    title={t("leaveRequests")}
                    description={t("notifyYouWhenEmployees")}
                  >
                    <Toggle
                      enabled={notifications.leaveRequests}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          leaveRequests:
                            !notifications.leaveRequests,
                        })
                      }
                    />
                  </SettingRow>

                  <SettingRow
                    icon={AlertCircle}
                    title={t("systemAlerts")}
                    description={t("receiveImportantSecurityAnd")}
                  >
                    <Toggle
                      enabled={notifications.systemAlerts}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          systemAlerts:
                            !notifications.systemAlerts,
                        })
                      }
                    />
                  </SettingRow>
                </div>
              </section>
            )}

            {/* =================================================
                SECURITY
            ================================================= */}
            {activeSection === "security" && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] shadow-2xs">
                  <div className="border-b border-[#E2E8F0] dark:border-[#1E3A47] px-6 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
                      {t("protection")}
                    </p>

                    <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
                      {t("securitySettings")}
                    </h2>

                    <p className="mt-1 text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
                      {t("protectYourAdministratorAccount")}
                    </p>
                  </div>

                  <div className="px-6">
                    <SettingRow
                      icon={ShieldCheck}
                      title={t("twofactorAuthentication")}
                      description={t("addAnAdditionalVerification")}
                    >
                      <Toggle
                        enabled={security.twoFactor}
                        onChange={() =>
                          setSecurity({
                            ...security,
                            twoFactor: !security.twoFactor,
                          })
                        }
                      />
                    </SettingRow>

                    <SettingRow
                      icon={Bell}
                      title={t("loginAlerts")}
                      description={t("getNotifiedWhenA")}
                    >
                      <Toggle
                        enabled={security.loginAlerts}
                        onChange={() =>
                          setSecurity({
                            ...security,
                            loginAlerts: !security.loginAlerts,
                          })
                        }
                      />
                    </SettingRow>
                  </div>
                </section>
              </div>
            )}

            {/* =================================================
                APPEARANCE
            ================================================= */}
            {activeSection === "appearance" && (
              <section className="rounded-2xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] shadow-2xs">
                <div className="border-b border-[#E2E8F0] dark:border-[#1E3A47] px-6 py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
                    {t("interface")}
                  </p>

                  <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
                    {t("appearance")}
                  </h2>

                  <p className="mt-1 text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
                    {t("customizeTheAppearanceOf")}
                  </p>
                </div>

                {/* THEME */}
                <div className="px-6 py-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                    {t("theme")}
                  </p>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* LIGHT */}
                    <button
                      type="button"
                      onClick={() => applyTheme("light")}
                      className={`
                        group relative w-full cursor-pointer rounded-xl border p-4
                        text-left transition-all duration-150
                        focus:outline-none focus:ring-2 focus:ring-[#087D8F]/30
                        ${
                          mounted && theme === "light"
                            ? "border-[#087D8F] bg-[#F0FAFB] ring-1 ring-[#087D8F]/20 dark:bg-[#123C46]"
                            : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                        }
                      `}
                    >
                      <div className="flex h-24 items-center justify-center rounded-lg bg-[#F1F5F9] dark:bg-[#071926]">
                        <div className="flex h-14 w-20 overflow-hidden rounded border border-[#CBD5E1] bg-white shadow-2xs dark:border-[#1E3A47] dark:bg-[#0B202B]">
                          <div className="w-5 bg-[#063B61]" />
                          <div className="flex flex-1 flex-col gap-2 p-2">
                            <div className="h-2 rounded-full bg-[#E2E8F0] dark:bg-[#1E3A47]" />
                            <div className="h-4 rounded bg-[#F8FAFC] dark:bg-[#102A38]" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sun
                            size={16}
                            className="text-[#087D8F] dark:text-[#38BDF8]"
                          />
                          <span className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                            {t("light")}
                          </span>
                        </div>

                        {mounted && theme === "light" && (
                          <Check
                            size={16}
                            strokeWidth={2.5}
                            className="text-[#087D8F] dark:text-[#38BDF8]"
                          />
                        )}
                      </div>
                    </button>

                    {/* DARK */}
                    <button
                      type="button"
                      onClick={() => applyTheme("dark")}
                      className={`
                        group relative w-full cursor-pointer rounded-xl border p-4
                        text-left transition-all duration-150
                        focus:outline-none focus:ring-2 focus:ring-[#087D8F]/30
                        ${
                          mounted && theme === "dark"
                            ? "border-[#087D8F] bg-[#123C46] ring-1 ring-[#087D8F]/20"
                            : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                        }
                      `}
                    >
                      <div className="flex h-24 items-center justify-center rounded-lg bg-[#071926]">
                        <div className="flex h-14 w-20 overflow-hidden rounded border border-[#1E3A47] bg-[#102A38]">
                          <div className="w-5 bg-[#0879D9]" />
                          <div className="flex flex-1 flex-col gap-2 p-2">
                            <div className="h-2 rounded-full bg-[#1E3A47]" />
                            <div className="h-4 rounded bg-[#071926]" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon
                            size={16}
                            className="text-[#087D8F] dark:text-[#38BDF8]"
                          />
                          <span className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                            {t("dark")}
                          </span>
                        </div>

                        {mounted && theme === "dark" && (
                          <Check
                            size={16}
                            strokeWidth={2.5}
                            className="text-[#087D8F] dark:text-[#38BDF8]"
                          />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* PREVIEW */}
                  <div className="mt-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-5 py-3.5 dark:border-[#1E3A47] dark:bg-[#0B202B]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#123C46] dark:text-[#38BDF8]">
                        <Monitor size={17} />
                      </div>

                      <div>
                        <p className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                          {t("interfacePreview")}
                        </p>

                        <p className="mt-0.5 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                          {t("yourSelectedAppearanceWill")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                ACCESSIBILITY
            ================================================= */}
            {activeSection === "accessibility" && (
              <AccessibilitySettingsCard />
            )}
          </section>
        </div>

        {/* FOOTER */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#CBD5E1] dark:border-[#1E3A47] bg-white dark:bg-[#0B202B] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] dark:bg-[#123C46] text-[#2563EB] dark:text-[#38BDF8]">
              <Lock size={16} />
            </div>

            <div>
              <p className="text-[13px] font-semibold leading-[18px] text-[#0F172A] dark:text-white">
                {t("mindmatrixAdministrator") || "MindMatrix Administrator"}
              </p>

              <p className="text-[12px] font-normal leading-[16px] text-[#64748B] dark:text-[#94A3B8]">
                {t("yourPreferencesAreStored") || "Your preferences are stored securely for this browser."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold leading-[16px] text-[#16A34A] dark:text-[#34D399]">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] dark:bg-[#34D399]" />
            {t("systemOperational") || "System operational"}
          </div>
        </div>
      </div>
    </main>
  );
}