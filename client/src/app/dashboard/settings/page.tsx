"use client";

import {
  Activity,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  X,
  Eye,
  Settings,
  Accessibility,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/components/ThemeProvider";
import { showToast } from "@/lib/toast";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import AccessibilitySettingsCard from "@/components/settings/AccessibilitySettingsCard";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import {
  PageHeader,
  SectionCard,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type Section =
  | "account"
  | "security"
  | "notifications"
  | "preferences"
  | "privacy"
  | "accessibility";

type NotificationSettings = {
  taskAssigned: boolean;
  deadlineReminder: boolean;
  taskCompleted: boolean;
  statusChanged: boolean;
  teamUpdates: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
};

type PreferenceSettings = {
  language: string;
  timezone: string;
  dateFormat: string;
  theme: "light" | "dark" | "system";
};

type UserSettings = {
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  employeeId?: string;
};

// =====================================================
// DEFAULTS
// =====================================================

const defaultNotifications: NotificationSettings = {
  taskAssigned: true,
  deadlineReminder: true,
  taskCompleted: true,
  statusChanged: true,
  teamUpdates: true,
  emailNotifications: true,
  inAppNotifications: true,
};

const defaultPreferences: PreferenceSettings = {
  language: "English",
  timezone: "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY",
  theme: "light",
};

// =====================================================
// TOGGLE SWITCH COMPONENT
// =====================================================

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
        checked
          ? "bg-[#2563EB] dark:bg-[#38BDF8]"
          : "bg-[#CBD5E1] dark:bg-[#1E3A47]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// =====================================================
// SETTING ROW COMPONENT
// =====================================================

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] py-4 last:border-b-0 dark:border-[#1E3A47]">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] dark:bg-[#0C3345] dark:text-[#38BDF8]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0 self-end sm:self-center">{children}</div>
    </div>
  );
}

// =====================================================
// MAIN SETTINGS PAGE
// =====================================================

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [section, setSection] = useState<Section>("account");
  const [user, setUser] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>(
    defaultNotifications
  );
  const { confirmLogout } = useAuth();
  const [preferences, setPreferences] = useState<PreferenceSettings>(
    defaultPreferences
  );
  const [saved, setSaved] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem("mindmatrix_notifications");
      const storedPreferences = localStorage.getItem("mindmatrix_preferences");
      const storedUser = localStorage.getItem("user");

      if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
      if (storedPreferences) setPreferences(JSON.parse(storedPreferences));
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }, []);

  const saveSettings = () => {
    try {
      localStorage.setItem("mindmatrix_notifications", JSON.stringify(notifications));
      localStorage.setItem("mindmatrix_preferences", JSON.stringify(preferences));
      setSaved(true);
      showToast.success(t("settingsSaved") || "Settings saved successfully!");
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Settings save error:", error);
      showToast.error("Unable to save settings.");
    }
  };

  const handleDeleteAccountRequest = async () => {
    try {
      setDeletingAccount(true);
      showToast.info("Account deletion request submitted to organization administrators.");
      setDeleteAccountOpen(false);
    } catch {
      showToast.error("Failed to submit deletion request.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const navItems: { id: Section; label: string; icon: any; description: string }[] = [
    {
      id: "account",
      label: "Account Overview",
      icon: UserRound,
      description: "Profile and organizational details",
    },
    {
      id: "security",
      label: "Security & Passwords",
      icon: Lock,
      description: "Credentials, password, and session access",
    },
    {
      id: "notifications",
      label: "Notification Alerts",
      icon: Bell,
      description: "Task reminders, updates, and channels",
    },
    {
      id: "preferences",
      label: "Preferences & Theme",
      icon: Globe2,
      description: "Language, date format, and light/dark theme",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      icon: Accessibility,
      description: "Visual contrast, motion, and readability",
    },
    {
      id: "privacy",
      label: "Privacy & Data",
      icon: ShieldCheck,
      description: "Account privacy and lifecycle management",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <PageHeader
        title={t("settings") || "Settings & Preferences"}
        subtitle="Manage your personal workspace preferences, security configuration, and notifications"
        eyebrow="ACCOUNT"
        icon={Settings}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
        actions={
          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-colors cursor-pointer"
          >
            {saved ? (
              <>
                <Check size={14} />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        }
      />

      {/* =================================================
          2-COLUMN SETTINGS LAYOUT
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT NAV SIDEBAR (1 COL) */}
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                  active
                    ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8] border border-[#BFDBFE] shadow-xs dark:bg-[#0C3345] dark:border-[#1E3A47] dark:text-[#38BDF8]"
                    : "border border-transparent bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:hover:bg-[#102A38]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#2563EB] dark:bg-[#38BDF8]" />
                )}

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active
                      ? "bg-[#2563EB] text-white shadow-xs dark:bg-[#0284C7] dark:text-white"
                      : "bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0F172A] dark:bg-[#122834] dark:text-[#94A3B8]"
                  }`}
                >
                  <Icon size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight truncate">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    {item.description}
                  </p>
                </div>

                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${
                    active
                      ? "text-[#2563EB] dark:text-[#38BDF8]"
                      : "text-[#94A3B8] opacity-0 group-hover:opacity-100"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT AREA (3 COLS) */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION: ACCOUNT OVERVIEW */}
          {section === "account" && (
            <SectionCard
              title="Account Overview"
              subtitle="Your workspace membership identity"
              icon={UserRound}
              headerAction={
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline dark:text-[#38BDF8]"
                >
                  <span>Edit Profile</span>
                  <ChevronRight size={13} />
                </Link>
              }
            >
              <div className="space-y-4">
                <SettingRow
                  icon={<Mail size={17} />}
                  title="Registered Email"
                  description="Primary identifier used for system notifications and login"
                >
                  <span className="font-mono text-xs font-semibold text-[#0F172A] dark:text-white">
                    {user?.email || "employee@mindmatrix.com"}
                  </span>
                </SettingRow>

                <SettingRow
                  icon={<ShieldCheck size={17} />}
                  title="Workspace Role"
                  description="Permission tier assigned within your organization"
                >
                  <span className="inline-flex items-center rounded-md border border-[#CBD5E1] bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold text-[#0F172A] dark:border-[#1E3A47] dark:bg-[#0C3345] dark:text-white">
                    {user?.role || "Employee"}
                  </span>
                </SettingRow>

                <SettingRow
                  icon={<LogOut size={17} />}
                  title="Sign Out"
                  description="Terminate your active session on this device"
                >
                  <button
                    type="button"
                    onClick={confirmLogout}
                    className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171] transition-colors"
                  >
                    Sign Out
                  </button>
                </SettingRow>
              </div>
            </SectionCard>
          )}

          {/* SECTION: SECURITY & PASSWORDS */}
          {section === "security" && (
            <SectionCard
              title="Security & Passwords"
              subtitle="Maintain strong security standards for your account"
              icon={Lock}
            >
              <div className="space-y-4">
                <SettingRow
                  icon={<KeyRound size={17} />}
                  title="Account Password"
                  description="Regularly rotate your password to protect organizational data"
                >
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1D4ED8] transition-colors"
                  >
                    Change Password
                  </button>
                </SettingRow>

                <SettingRow
                  icon={<ShieldCheck size={17} />}
                  title="Session Protection"
                  description="Automatic token refreshment and inactive session monitoring"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] dark:text-[#4ADE80]">
                    <span className="h-2 w-2 rounded-full bg-[#16A34A] dark:bg-[#4ADE80]" />
                    <span>Protected</span>
                  </span>
                </SettingRow>
              </div>
            </SectionCard>
          )}

          {/* SECTION: NOTIFICATIONS */}
          {section === "notifications" && (
            <SectionCard
              title="Notification Preferences"
              subtitle="Choose which alerts you receive and delivery methods"
              icon={Bell}
            >
              <div className="space-y-4">
                <SettingRow
                  icon={<Bell size={17} />}
                  title="Task Assigned Alert"
                  description="Notify immediately when a new task is assigned to you"
                >
                  <Toggle
                    checked={notifications.taskAssigned}
                    onChange={(val) =>
                      setNotifications((prev) => ({ ...prev, taskAssigned: val }))
                    }
                    label="Task Assigned"
                  />
                </SettingRow>

                <SettingRow
                  icon={<Bell size={17} />}
                  title="Deadline Reminders"
                  description="Receive alerts 24 hours and 2 hours before upcoming due dates"
                >
                  <Toggle
                    checked={notifications.deadlineReminder}
                    onChange={(val) =>
                      setNotifications((prev) => ({ ...prev, deadlineReminder: val }))
                    }
                    label="Deadline Reminder"
                  />
                </SettingRow>

                <SettingRow
                  icon={<Mail size={17} />}
                  title="Email Notifications"
                  description="Deliver task milestones and daily digest to your email inbox"
                >
                  <Toggle
                    checked={notifications.emailNotifications}
                    onChange={(val) =>
                      setNotifications((prev) => ({
                        ...prev,
                        emailNotifications: val,
                      }))
                    }
                    label="Email Notifications"
                  />
                </SettingRow>

                <SettingRow
                  icon={<Monitor size={17} />}
                  title="In-App Push Notifications"
                  description="Display real-time notification toasts while using the portal"
                >
                  <Toggle
                    checked={notifications.inAppNotifications}
                    onChange={(val) =>
                      setNotifications((prev) => ({
                        ...prev,
                        inAppNotifications: val,
                      }))
                    }
                    label="In-App Notifications"
                  />
                </SettingRow>
              </div>
            </SectionCard>
          )}

          {/* SECTION: PREFERENCES & THEME */}
          {section === "preferences" && (
            <SectionCard
              title="Language & Workspace Theme"
              subtitle="Personalize portal localization and visual experience"
              icon={Globe2}
            >
              <div className="space-y-4">
                <SettingRow
                  icon={<Globe2 size={17} />}
                  title="Interface Language"
                  description="Select your preferred language for the entire workspace"
                >
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] outline-none dark:border-[#1E3A47] dark:bg-[#071923] dark:text-white focus:border-[#2563EB]"
                  >
                    <option value="en">English (US)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </SettingRow>

                <SettingRow
                  icon={<Sun size={17} />}
                  title="Theme Appearance"
                  description="Choose between crisp enterprise light mode or sleek dark mode"
                >
                  <div className="flex items-center rounded-xl border border-[#CBD5E1] bg-[#F1F5F9] p-1 dark:border-[#1E3A47] dark:bg-[#071923]">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        theme === "light"
                          ? "bg-white text-[#2563EB] shadow-xs dark:bg-[#0B202B] dark:text-white"
                          : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8]"
                      }`}
                    >
                      <Sun size={13} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        theme === "dark"
                          ? "bg-[#0B202B] text-[#38BDF8] shadow-xs"
                          : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8]"
                      }`}
                    >
                      <Moon size={13} />
                      <span>Dark</span>
                    </button>
                  </div>
                </SettingRow>
              </div>
            </SectionCard>
          )}

          {/* SECTION: ACCESSIBILITY */}
          {section === "accessibility" && <AccessibilitySettingsCard />}

          {/* SECTION: PRIVACY */}
          {section === "privacy" && (
            <SectionCard
              title="Privacy & Data Control"
              subtitle="Data visibility within your team and account termination"
              icon={ShieldCheck}
            >
              <div className="space-y-4">
                <SettingRow
                  icon={<ShieldCheck size={17} />}
                  title="Team Activity Visibility"
                  description="Allow team members to view completed tasks in organizational reports"
                >
                  <span className="text-xs font-semibold text-[#16A34A] dark:text-[#4ADE80]">
                    Enabled by Organization Policy
                  </span>
                </SettingRow>

                <SettingRow
                  icon={<Trash2 size={17} />}
                  title="Request Account Closure"
                  description="Submit a formal request to organizational administrators to archive account"
                >
                  <button
                    type="button"
                    onClick={() => setDeleteAccountOpen(true)}
                    className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171] transition-colors"
                  >
                    Request Archive
                  </button>
                </SettingRow>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteAccountOpen}
        onClose={() => {
          if (!deletingAccount) setDeleteAccountOpen(false);
        }}
        className="w-full max-w-sm"
      >
        <div className="w-full rounded-[14px] border border-[#CBD5E1] bg-white p-6 shadow-2xl dark:border-[#1E3A47] dark:bg-[#0B202B]">
          <h3 className="text-base font-bold text-[#DC2626] dark:text-[#F87171]">
            Request Account Closure
          </h3>
          <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
            This will submit a formal ticket to your HR and System Administrator. Are you sure you wish to proceed?
          </p>
          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteAccountOpen(false)}
              disabled={deletingAccount}
              className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#071923] dark:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccountRequest}
              disabled={deletingAccount}
              className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-bold text-white hover:bg-[#B91C1C] cursor-pointer"
            >
              {deletingAccount ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}