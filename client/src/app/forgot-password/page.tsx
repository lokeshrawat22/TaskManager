"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

const ForgotPasswordPage = () => {
  const { t } = useLanguage();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      const msg = t("pleaseEnterYourEmail") || "Please enter your email";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      const msg = t("pleaseEnterAValid") || "Please enter a valid email address";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.message || "Unable to send password reset OTP.";
        setError(msg);
        showToast.error(msg);
        return;
      }

      const successMsg =
        data?.message ||
        "If an account exists with this email, a password reset OTP has been sent.";
      setSuccess(successMsg);
      showToast.success(successMsg);

      const otpExpiresAt =
        data?.data?.otpExpiresAt ||
        Date.now() + (data?.data?.otpExpiresInSeconds || 600) * 1000;
      const resendAvailableAt =
        data?.data?.resendAvailableAt ||
        Date.now() + (data?.data?.resendAvailableInSeconds || 60) * 1000;

      sessionStorage.setItem("passwordResetEmail", normalizedEmail);
      sessionStorage.setItem("passwordResetOtpExpiresAt", String(otpExpiresAt));
      sessionStorage.setItem(
        `passwordResetOtpExpiresAt_${normalizedEmail}`,
        String(otpExpiresAt)
      );
      localStorage.setItem("passwordResetOtpExpiresAt", String(otpExpiresAt));
      localStorage.setItem(
        `passwordResetOtpExpiresAt_${normalizedEmail}`,
        String(otpExpiresAt)
      );

      sessionStorage.setItem(
        "passwordResetResendAvailableAt",
        String(resendAvailableAt)
      );
      sessionStorage.setItem(
        `passwordResetResendAvailableAt_${normalizedEmail}`,
        String(resendAvailableAt)
      );
      localStorage.setItem(
        "passwordResetResendAvailableAt",
        String(resendAvailableAt)
      );
      localStorage.setItem(
        `passwordResetResendAvailableAt_${normalizedEmail}`,
        String(resendAvailableAt)
      );

      setTimeout(() => {
        router.push(
          `/forgot-password/verify?email=${encodeURIComponent(normalizedEmail)}`
        );
      }, 700);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const msg = err?.message || t("somethingWentWrongPlease") || "Something went wrong. Please try again.";
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#F5FAFD] px-4 py-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-[#087DB5]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#08AFA3]/10 blur-3xl" />

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
                {t("forgotPassword")}
              </h1>

              <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-[#64748B]">
                {t("enterYourRegisteredEmail")}
              </p>
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
            <form onSubmit={handleSubmit} className="mt-7">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#1E3A56]"
              >
                {t("emailAddress")} <span className="text-red-500">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("enterYourRegisteredEmail1")}
                disabled={loading}
                className="w-full rounded-xl border border-[#C9DDEA] bg-white px-4 py-3 text-sm text-[#1E293B] outline-none transition placeholder:text-[#94A3B8] focus:border-[#087DB5] focus:ring-4 focus:ring-[#087DB5]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send Reset OTP →"}
              </button>
            </form>

            {/* Back to login */}
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-[#087DB5] transition hover:text-[#0B2D63] hover:underline"
              >
                {t("backToLogin")}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#94A3B8]">
          {t("forYourSecurityWe")}
        </p>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;