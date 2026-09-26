"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

const ResetPasswordPage = () => {
  const { t } = useLanguage();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [email, setEmail] = useState("");

  // =====================================================
  // GET RESET TOKEN
  // =====================================================

  useEffect(() => {
    const token = sessionStorage.getItem("passwordResetToken");
    const storedEmail = sessionStorage.getItem("passwordResetEmail");

    if (!token) {
      router.replace("/forgot-password");
      return;
    }

    setResetToken(token);

    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [router]);

  // =====================================================
  // PASSWORD VALIDATION
  // =====================================================

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    return "";
  };

  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!resetToken) {
      const msg = t("yourPasswordResetSession") || "Your password reset session has expired. Please restart the process.";
      setError(msg);
      showToast.error(msg);
      return;
    }

    if (!newPassword) {
      const msg = t("pleaseEnterYourNew") || "Please enter your new password.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (!confirmPassword) {
      const msg = t("pleaseConfirmYourNew") || "Please confirm your new password.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      setError(passwordError);
      showToast.warning(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = t("passwordsDoNotMatch") || "Passwords do not match.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    try {
      setLoading(true);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.message || "Unable to reset your password.";
        setError(msg);
        showToast.error(msg);
        return;
      }

      const successMsg = data?.message || "Password reset successfully.";
      setSuccess(successMsg);
      showToast.success(successMsg);

      // Remove sensitive reset data.
      sessionStorage.removeItem("passwordResetToken");
      sessionStorage.removeItem("passwordResetEmail");
      sessionStorage.removeItem("passwordResetOtpExpiresAt");
      sessionStorage.removeItem("passwordResetResendAvailableAt");
      localStorage.removeItem("passwordResetOtpExpiresAt");
      localStorage.removeItem("passwordResetResendAvailableAt");
      if (email) {
        sessionStorage.removeItem(`passwordResetOtpExpiresAt_${email}`);
        sessionStorage.removeItem(`passwordResetResendAvailableAt_${email}`);
        localStorage.removeItem(`passwordResetOtpExpiresAt_${email}`);
        localStorage.removeItem(`passwordResetResendAvailableAt_${email}`);
      }

      setNewPassword("");
      setConfirmPassword("");

      // Go to login after success.
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err: any) {
      console.error("Reset password error:", err);
      const msg = err?.message || t("somethingWentWrongPlease") || "Something went wrong. Please try again.";
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#F5FAFD] px-4 py-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-[#087DB5]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#08AFA3]/10 blur-3xl" />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-[520px]">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-[#D7E7EF] bg-white shadow-[0_20px_60px_rgba(11,45,99,0.12)]">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3]" />

          <div className="px-7 py-8 sm:px-10 sm:py-10">
            {/* Header */}
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#08AFA3]">
                {t("accountRecovery")}
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0B2D63]">
                {t("resetPassword")}
              </h1>

              <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-[#64748B]">
                {t("createANewPassword")}
              </p>

              {email && (
                <p className="mt-2 text-sm font-medium text-[#087DB5]">
                  {email}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600"
              >
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                role="status"
                className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
              >
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResetPassword} className="mt-7">
              {/* New Password */}
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-medium text-[#1E3A56]"
              >
                {t("newPassword")} <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={t("enterNewPassword")}
                  disabled={loading}
                  className="w-full rounded-xl border border-[#C9DDEA] bg-white px-4 py-3 pr-12 text-sm text-[#1E293B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#087DB5] focus:ring-4 focus:ring-[#087DB5]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#64748B] hover:text-[#087DB5]"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Password requirements */}
              <div className="mt-2 text-xs leading-5 text-[#64748B]">
                {t("minimum8CharactersIncluding")}
              </div>

              {/* Confirm Password */}
              <label
                htmlFor="confirmPassword"
                className="mb-2 mt-5 block text-sm font-medium text-[#1E3A56]"
              >
                {t("confirmPassword")} <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder={t("confirmYourPassword")}
                  disabled={loading}
                  className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm text-[#1E293B] outline-none transition placeholder:text-[#94A3B8] focus:ring-4 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] ${
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : confirmPassword && newPassword === confirmPassword
                        ? "border-emerald-400 focus:border-emerald-400 focus:ring-emerald-100"
                        : "border-[#C9DDEA] focus:border-[#087DB5] focus:ring-[#087DB5]/10"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#64748B] hover:text-[#087DB5]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Match message */}
              {confirmPassword && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    newPassword === confirmPassword
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {newPassword === confirmPassword
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}

              {/* Reset button */}
              <button
                type="submit"
                disabled={loading || !resetToken}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Resetting Password..." : "Reset Password →"}
              </button>
            </form>

            {/* Back to login */}
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => router.replace("/login")}
                disabled={loading}
                className="text-sm font-medium text-[#64748B] transition hover:text-[#0B2D63] hover:underline"
              >
                {t("backToLogin")}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#94A3B8]">
          {t("yourPasswordIsSecurely")}
        </p>
      </div>
    </main>
  );
};

export default ResetPasswordPage;