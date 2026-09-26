"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Check,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { logoutUser } from "@/service/auth.service";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/context/LanguageContext";
import { Modal } from "@/components/ui/Modal";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { t, language } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const currentPasswordInputRef = useRef<HTMLInputElement>(null);

  // Focus current password input on open
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMessage(null);
      setIsSuccess(false);

      // Focus first field after animation frame
      const timer = setTimeout(() => {
        currentPasswordInputRef.current?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Criteria checks for new password
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(newPassword);
  const hasNoSpaces = !/\s/.test(newPassword);
  const isConfirmMatching =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const isConfirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!currentPassword.trim()) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage("Please enter your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial || !hasNoSpaces) {
      setErrorMessage(
        "New password must include uppercase, lowercase, number, and special character without spaces."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password cannot be identical to your current password.");
      return;
    }

    if (!confirmPassword.trim()) {
      setErrorMessage("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest<{ success: boolean; message: string }>(
        "/api/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const successMessage =
        "Password changed successfully. Please log in again with your new password.";

      setIsSuccess(true);
      showToast.success(successMessage);

      try {
        sessionStorage.setItem("password_changed_notice", successMessage);
      } catch {
        // ignore
      }

      // Automatically log the user out using existing auth logout logic
      try {
        await logoutUser();
      } catch (logoutErr) {
        console.warn("Logout error after password change:", logoutErr);
      } finally {
        try {
          localStorage.removeItem("user");
        } catch {
          // ignore
        }
      }

      // Redirect to login page
      setTimeout(() => {
        window.location.replace("/login");
      }, 1000);
    } catch (err: any) {
      console.error("Change password error:", err);
      setErrorMessage(
        err?.message || "Failed to change password. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      className="w-full max-w-lg"
      ariaLabel="Change Password"
    >
      <div
        ref={modalRef}
        className="w-full overflow-hidden rounded-3xl border border-[#C7D5DC] bg-white shadow-2xl transition-all dark:border-[#3A5F71] dark:bg-[#102A38]"
      >
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-[#CCD8DF] p-6 dark:border-[#3A5F71]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF7F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD3DF]">
              <KeyRound size={22} />
            </div>
            <div>
              <h2
                id="change-password-title"
                className="text-lg font-bold text-[#063D63] dark:text-white"
              >
                {t("changePassword") || "Change Password"}
              </h2>
              <p className="mt-0.5 text-xs text-[#8A9BA3] dark:text-[#AFC3CC]">
                Update your account password securely
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl p-2 text-[#8FA1A9] transition hover:bg-[#F3F7F8] hover:text-[#063D63] dark:text-[#8FA8B2] dark:hover:bg-[#18333F] dark:hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F4] text-[#159779] dark:bg-[#113B35] dark:text-[#38D8B2]">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#063D63] dark:text-white">
                Password Changed!
              </h3>
              <p className="mt-1 text-xs text-[#718894] dark:text-[#AFC3CC]">
                Password changed successfully. Please log in again with your new password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ERROR BANNER */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 dark:border-red-900/50 dark:bg-red-950/30">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* CURRENT PASSWORD */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#AFC3CC]">
                  {t("currentPassword") || "Current Password"}
                </label>
                <div className="relative">
                  <input
                    ref={currentPasswordInputRef}
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter your current password"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 w-full rounded-xl border border-[#DDE8EC] bg-[#FAFCFD] px-3.5 pr-11 text-sm font-medium text-[#315364] outline-none transition placeholder:text-[#A7B4BA] focus:border-[#087D8F] focus:ring-4 focus:ring-[#087D8F]/10 dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#D7E7EC] dark:focus:border-[#4CD3DF] disabled:opacity-60 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A9] transition hover:text-[#087D8F] dark:text-[#9EB4BE] dark:hover:text-[#4CD3DF]"
                    tabIndex={-1}
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  >
                    {showCurrentPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {/* NEW PASSWORD */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#AFC3CC]">
                  {t("newPassword") || "New Password"}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter your new password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-[#DDE8EC] bg-[#FAFCFD] px-3.5 pr-11 text-sm font-medium text-[#315364] outline-none transition placeholder:text-[#A7B4BA] focus:border-[#087D8F] focus:ring-4 focus:ring-[#087D8F]/10 dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#D7E7EC] dark:focus:border-[#4CD3DF] disabled:opacity-60 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A9] transition hover:text-[#087D8F] dark:text-[#9EB4BE] dark:hover:text-[#4CD3DF]"
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {/* CONFIRM NEW PASSWORD */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#AFC3CC]">
                    {t("confirmNewPassword") || "Confirm New Password"}
                  </label>
                  {isConfirmMatching && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#159779] dark:text-[#38D8B2]">
                      <Check size={12} />
                      Passwords match
                    </span>
                  )}
                  {isConfirmMismatch && (
                    <span className="text-[11px] font-semibold text-red-500">
                      Passwords do not match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Re-enter your new password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={`h-11 w-full rounded-xl border bg-[#FAFCFD] px-3.5 pr-11 text-sm font-medium outline-none transition placeholder:text-[#A7B4BA] dark:bg-[#0D2430] disabled:opacity-60 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                      isConfirmMismatch
                        ? "border-red-400 text-red-700 dark:border-red-500 dark:text-red-300 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#DDE8EC] text-[#315364] dark:border-[#3D6375] dark:text-[#D7E7EC] focus:border-[#087D8F] focus:ring-4 focus:ring-[#087D8F]/10 dark:focus:border-[#4CD3DF]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA1A9] transition hover:text-[#087D8F] dark:text-[#9EB4BE] dark:hover:text-[#4CD3DF]"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {/* PASSWORD REQUIREMENTS HINT */}
              <div className="rounded-2xl border border-[#E1EBEF] bg-[#F8FBFC] p-3.5 dark:border-[#3D6375]/60 dark:bg-[#0D2430]/70">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4B6370] dark:text-[#9EB5C1]">
                  <Lock size={13} className="text-[#087D8F] dark:text-[#4CD3DF]" />
                  <span>Password Requirements</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasMinLength
                        ? "text-[#159779] dark:text-[#38D8B2]"
                        : "text-[#8A9BA3] dark:text-[#7A919D]"
                    }`}
                  >
                    <span className="text-xs">{hasMinLength ? "✓" : "•"}</span>
                    <span>8+ characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasUppercase
                        ? "text-[#159779] dark:text-[#38D8B2]"
                        : "text-[#8A9BA3] dark:text-[#7A919D]"
                    }`}
                  >
                    <span className="text-xs">{hasUppercase ? "✓" : "•"}</span>
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasLowercase
                        ? "text-[#159779] dark:text-[#38D8B2]"
                        : "text-[#8A9BA3] dark:text-[#7A919D]"
                    }`}
                  >
                    <span className="text-xs">{hasLowercase ? "✓" : "•"}</span>
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      hasNumber && hasSpecial
                        ? "text-[#159779] dark:text-[#38D8B2]"
                        : "text-[#8A9BA3] dark:text-[#7A919D]"
                    }`}
                  >
                    <span className="text-xs">
                      {hasNumber && hasSpecial ? "✓" : "•"}
                    </span>
                    <span>Number & symbol</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="h-11 rounded-xl border border-[#D8E5EA] px-4 text-xs font-bold text-[#536B77] transition hover:bg-[#F3F9FC] dark:border-[#3D6375] dark:text-[#B7CCD5] dark:hover:bg-[#132E3A] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#087D8F] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#066675] active:scale-[0.99] dark:bg-[#4CD3DF] dark:text-[#063D63] dark:hover:bg-[#34C5D2] disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
