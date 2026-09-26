"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

const OTP_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const getStoredTimestamp = (key: string, email?: string): number | null => {
  if (typeof window === "undefined") return null;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";
  if (normalizedEmail) {
    const specificSession = sessionStorage.getItem(`${key}_${normalizedEmail}`);
    if (specificSession && !isNaN(Number(specificSession))) return Number(specificSession);
    const specificLocal = localStorage.getItem(`${key}_${normalizedEmail}`);
    if (specificLocal && !isNaN(Number(specificLocal))) return Number(specificLocal);
  }
  const genericSession = sessionStorage.getItem(key);
  if (genericSession && !isNaN(Number(genericSession))) return Number(genericSession);
  const genericLocal = localStorage.getItem(key);
  if (genericLocal && !isNaN(Number(genericLocal))) return Number(genericLocal);
  return null;
};

const VerifyResetOtpPage = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromUrl = searchParams.get("email") || "";

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);

  const [otpSecondsLeft, setOtpSecondsLeft] = useState<number>(OTP_EXPIRY_SECONDS);
  const [resendSecondsLeft, setResendSecondsLeft] = useState<number>(RESEND_COOLDOWN_SECONDS);

  // =====================================================
  // INITIALIZE TIMESTAMPS FROM STORAGE / BACKEND
  // =====================================================

  useEffect(() => {
    setMounted(true);

    const storedEmail = sessionStorage.getItem("passwordResetEmail");
    const resolvedEmail = (emailFromUrl || storedEmail || "").trim().toLowerCase();

    if (resolvedEmail) {
      setEmail(resolvedEmail);
    }

    const now = Date.now();
    let exp = getStoredTimestamp("passwordResetOtpExpiresAt", resolvedEmail);
    let resend = getStoredTimestamp("passwordResetResendAvailableAt", resolvedEmail);

    if (!exp) {
      exp = now + OTP_EXPIRY_SECONDS * 1000;
      sessionStorage.setItem("passwordResetOtpExpiresAt", String(exp));
      localStorage.setItem("passwordResetOtpExpiresAt", String(exp));
      if (resolvedEmail) {
        sessionStorage.setItem(`passwordResetOtpExpiresAt_${resolvedEmail}`, String(exp));
        localStorage.setItem(`passwordResetOtpExpiresAt_${resolvedEmail}`, String(exp));
      }
    }

    if (!resend) {
      resend = now + RESEND_COOLDOWN_SECONDS * 1000;
      sessionStorage.setItem("passwordResetResendAvailableAt", String(resend));
      localStorage.setItem("passwordResetResendAvailableAt", String(resend));
      if (resolvedEmail) {
        sessionStorage.setItem(`passwordResetResendAvailableAt_${resolvedEmail}`, String(resend));
        localStorage.setItem(`passwordResetResendAvailableAt_${resolvedEmail}`, String(resend));
      }
    }

    setOtpExpiresAt(exp);
    setResendAvailableAt(resend);

    setOtpSecondsLeft(Math.max(0, Math.floor((exp - now) / 1000)));
    setResendSecondsLeft(Math.max(0, Math.floor((resend - now) / 1000)));
  }, [emailFromUrl]);

  // =====================================================
  // OTP EXPIRY + RESEND COUNTDOWN (Single Source of Truth)
  // =====================================================

  useEffect(() => {
    if (!otpExpiresAt && !resendAvailableAt) return;

    const tick = () => {
      const now = Date.now();

      if (otpExpiresAt) {
        const remainingOtp = Math.max(0, Math.floor((otpExpiresAt - now) / 1000));
        setOtpSecondsLeft(remainingOtp);
      }

      if (resendAvailableAt) {
        const remainingResend = Math.max(0, Math.floor((resendAvailableAt - now) / 1000));
        setResendSecondsLeft(remainingResend);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresAt, resendAvailableAt]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    if (name.length <= 2) {
      return `${name[0] || "*"}***@${domain}`;
    }
    return `${name.slice(0, 2)}***@${domain}`;
  }, [email]);

  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setOtp(digitsOnly);
    setError("");
  };

  // =====================================================
  // VERIFY OTP
  // =====================================================

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email) {
      const msg = t("emailInformationIsMissing") || "Email information is missing.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (otp.length !== 6) {
      const msg = t("pleaseEnterThe6digit") || "Please enter the 6-digit OTP.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (otpSecondsLeft <= 0) {
      const msg = t("thisOtpHasExpired") || "This OTP has expired. Please request a new one.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    try {
      setLoading(true);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

      const response = await fetch(
        `${apiUrl}/api/auth/verify-reset-password-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const retryAfter = data?.data?.retryAfterSeconds;
        let errMsg = data?.message || "Invalid OTP. Please try again.";

        if (data?.code === "OTP_BLOCKED") {
          errMsg = data?.message || "Too many incorrect attempts. Please try again later.";
        } else if (data?.code === "OTP_EXPIRED") {
          const now = Date.now();
          setOtpSecondsLeft(0);
          setOtpExpiresAt(now);
          sessionStorage.setItem("passwordResetOtpExpiresAt", String(now));
          localStorage.setItem("passwordResetOtpExpiresAt", String(now));
          if (email) {
            sessionStorage.setItem(`passwordResetOtpExpiresAt_${email}`, String(now));
            localStorage.setItem(`passwordResetOtpExpiresAt_${email}`, String(now));
          }
          errMsg = data?.message || "OTP has expired. Please request a new OTP.";
        }

        setError(errMsg);
        showToast.error(errMsg);

        if (typeof retryAfter === "number") {
          const newResendAt = Date.now() + retryAfter * 1000;
          setResendAvailableAt(newResendAt);
          setResendSecondsLeft(retryAfter);
          sessionStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
          localStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
          if (email) {
            sessionStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
            localStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
          }
        }

        return;
      }

      const resetToken = data?.data?.resetToken;

      if (!resetToken) {
        const msg = t("passwordResetSessionCould") || "Password reset session could not be established.";
        setError(msg);
        showToast.error(msg);
        return;
      }

      sessionStorage.setItem("passwordResetToken", resetToken);
      sessionStorage.setItem("passwordResetEmail", email);
      showToast.success("OTP verified successfully!");

      // Go directly to reset password page
      window.location.href = "/forgot-password/reset";
    } catch (err: any) {
      console.error("Verify reset OTP error:", err);
      const msg = err?.message || t("somethingWentWrongPlease") || "Something went wrong. Please try again.";
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================

  const handleResend = async () => {
    if (resendSecondsLeft > 0 && otpSecondsLeft > 0) {
      return;
    }

    if (!email) {
      const msg = t("emailInformationIsMissing") || "Email information is missing.";
      setError(msg);
      showToast.warning(msg);
      return;
    }

    try {
      setResending(true);
      setError("");
      setSuccess("");

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

      const response = await fetch(
        `${apiUrl}/api/auth/resend-reset-password-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const retryAfter = data?.data?.retryAfterSeconds;

        if (typeof retryAfter === "number") {
          const newResendAt = Date.now() + retryAfter * 1000;
          setResendAvailableAt(newResendAt);
          setResendSecondsLeft(retryAfter);
          sessionStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
          localStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
          if (email) {
            sessionStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
            localStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
          }
        }

        const msg = data?.message || "Unable to resend OTP.";
        setError(msg);
        showToast.error(msg);
        return;
      }

      const now = Date.now();
      const newExpiresAt =
        data?.data?.otpExpiresAt ||
        now + (data?.data?.otpExpiresInSeconds ?? OTP_EXPIRY_SECONDS) * 1000;
      const newResendAt =
        data?.data?.resendAvailableAt ||
        now + (data?.data?.resendAvailableInSeconds ?? RESEND_COOLDOWN_SECONDS) * 1000;

      sessionStorage.setItem("passwordResetOtpExpiresAt", String(newExpiresAt));
      localStorage.setItem("passwordResetOtpExpiresAt", String(newExpiresAt));
      if (email) {
        sessionStorage.setItem(`passwordResetOtpExpiresAt_${email}`, String(newExpiresAt));
        localStorage.setItem(`passwordResetOtpExpiresAt_${email}`, String(newExpiresAt));
      }

      sessionStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
      localStorage.setItem("passwordResetResendAvailableAt", String(newResendAt));
      if (email) {
        sessionStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
        localStorage.setItem(`passwordResetResendAvailableAt_${email}`, String(newResendAt));
      }

      setOtp("");
      setOtpExpiresAt(newExpiresAt);
      setResendAvailableAt(newResendAt);

      setOtpSecondsLeft(Math.max(0, Math.floor((newExpiresAt - now) / 1000)));
      setResendSecondsLeft(Math.max(0, Math.floor((newResendAt - now) / 1000)));

      const successMsg = data?.message || t("aNewOtpHas") || "A new OTP has been sent to your email.";
      setSuccess(successMsg);
      showToast.success(successMsg);
    } catch (err: any) {
      console.error("Resend reset OTP error:", err);
      const msg = err?.message || t("somethingWentWrongPlease") || "Something went wrong. Please try again.";
      setError(msg);
      showToast.error(msg);
    } finally {
      setResending(false);
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

      <div className="relative z-10 w-full max-w-[520px]">
        <div className="overflow-hidden rounded-2xl border border-[#D7E7EF] bg-white shadow-[0_20px_60px_rgba(11,45,99,0.12)]">
          <div className="h-1 bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3]" />

          <div className="px-7 py-8 sm:px-10 sm:py-10">
            {/* Header */}
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#08AFA3]">
                {t("accountRecovery")}
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0B2D63]">
                {t("verifyOtp")}
              </h1>

              <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-[#64748B]">
                {t("enterThe6digitCode")}
              </p>

              <p className="mt-1 text-sm font-semibold text-[#0B2D63]">
                {maskedEmail || "your registered email"}
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

            <form onSubmit={handleVerify} className="mt-7">
              {/* OTP */}
              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-medium text-[#1E3A56]"
              >
                {t("enterOtp")}
              </label>

              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                placeholder="000000"
                disabled={loading || (mounted && otpSecondsLeft <= 0)}
                className="w-full rounded-xl border border-[#C9DDEA] bg-white px-4 py-4 text-center text-2xl font-bold tracking-[10px] text-[#0B2D63] outline-none transition placeholder:text-[#CBD5E1] placeholder:tracking-[10px] focus:border-[#087DB5] focus:ring-4 focus:ring-[#087DB5]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC]"
              />

              {/* Expiry */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-[#64748B]">{t("otpExpiresIn")}</span>
                <span
                  className={
                    otpSecondsLeft <= 60
                      ? "font-semibold text-red-500"
                      : "font-semibold text-[#087DB5]"
                  }
                >
                  {mounted
                    ? otpSecondsLeft <= 0
                      ? "OTP Expired"
                      : formatTime(otpSecondsLeft)
                    : formatTime(OTP_EXPIRY_SECONDS)}
                </span>
              </div>

              {/* Verify */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || (mounted && otpSecondsLeft <= 0)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-[1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP →"}
              </button>
            </form>

            {/* Resend */}
            <div className="mt-6 text-center">
              <p className="text-sm text-[#64748B]">
                {t("didnapostReceiveTheCode")}
              </p>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || (mounted && resendSecondsLeft > 0 && otpSecondsLeft > 0)}
                className="mt-2 text-sm font-semibold text-[#087DB5] transition hover:text-[#0B2D63] hover:underline disabled:cursor-not-allowed disabled:text-[#94A3B8] disabled:no-underline"
              >
                {resending
                  ? "Sending..."
                  : mounted && resendSecondsLeft > 0 && otpSecondsLeft > 0
                    ? `Resend OTP in ${formatTime(resendSecondsLeft)}`
                    : "Resend OTP"}
              </button>
            </div>

            {/* Back */}
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-sm font-medium text-[#64748B] transition hover:text-[#0B2D63] hover:underline"
              >
                {t("changeEmail")}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#94A3B8]">
          {t("neverShareYourOtp")}
        </p>
      </div>
    </main>
  );
};

export default VerifyResetOtpPage;