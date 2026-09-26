"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { showToast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";

// =====================================================
// PHONE & EMAIL FORMATTING HELPERS
// =====================================================

export const formatDisplayPhone = (
  phone?: string,
  countryCode?: string
): string => {
  if (!phone || !phone.trim()) {
    return "Not provided";
  }

  let cleanPhone = phone.trim();
  let cleanCC = (countryCode || "").trim();
  if (cleanCC && !cleanCC.startsWith("+")) {
    cleanCC = `+${cleanCC}`;
  }

  if (cleanCC) {
    const escapedCC = cleanCC.replace(/\+/g, "\\+");
    const repeatRegex = new RegExp(`^(?:${escapedCC}[\\s-]*)+`, "i");
    if (repeatRegex.test(cleanPhone)) {
      const localPart = cleanPhone.replace(repeatRegex, "").trim();
      return `${cleanCC} ${localPart}`;
    }
  }

  if (cleanPhone.startsWith("+")) {
    if (cleanCC && cleanPhone.startsWith(cleanCC)) {
      const localPart = cleanPhone.slice(cleanCC.length).trim();
      return `${cleanCC} ${localPart}`;
    }
    const match = cleanPhone.match(/^(\+\d{1,4})[\s-]*(.*)$/);
    if (match) {
      return `${match[1]} ${match[2].trim()}`;
    }
    return cleanPhone;
  }

  if (cleanCC) {
    return `${cleanCC} ${cleanPhone}`;
  }

  return cleanPhone;
};

export const maskEmail = (emailStr: string): string => {
  if (!emailStr || !emailStr.includes("@")) return emailStr;
  const parts = emailStr.trim().split("@");
  if (parts.length !== 2) return emailStr;
  const [local, domain] = parts;
  let visible = 3;
  if (local.length <= 2) visible = 1;
  else if (local.length === 3) visible = 2;
  const prefix = local.slice(0, visible);
  return `${prefix}***@${domain}`;
};

export const maskPhone = (phoneStr: string, ccStr: string = "+91"): string => {
  if (!phoneStr) return "";
  const digits = phoneStr.replace(/\D/g, "");
  if (digits.length < 4) return phoneStr;
  const last4 = digits.slice(-4);
  const prefix = ccStr.startsWith("+") ? ccStr : `+${ccStr}`;
  return `${prefix} ******${last4}`;
};

// =====================================================
// PENDING VERIFICATION STORAGE HELPERS
// =====================================================

export const PENDING_VERIFICATION_STORAGE_KEY = "mm_pending_verification_challenge";

export interface PendingVerificationData {
  type: VerificationModalType;
  challengeId?: string;
  step: 1 | 2 | 3 | "unverified_partner";
  maskedContact?: string;
  newInput?: string;
  newCountryCode?: string;
  crossToken?: string;
  resendAvailableAt?: number;
  expiresAt?: number;
}

export const savePendingVerification = (data: PendingVerificationData): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PENDING_VERIFICATION_STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (err) {
    console.warn("Failed to save pending verification to sessionStorage:", err);
  }
};

export const getPendingVerification = (): PendingVerificationData | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_VERIFICATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingVerificationData;
  } catch {
    return null;
  }
};

export const clearPendingVerification = (): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY);
  } catch {
    // Ignore
  }
};

// =====================================================
// TYPES
// =====================================================

export type VerificationModalType =
  | "verify-email"
  | "verify-phone"
  | "change-email"
  | "change-phone"
  | null;

export interface ProfileVerificationModalsProps {
  email?: string;
  phone?: string;
  countryCode?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  activeModal: VerificationModalType;
  setActiveModal: (modal: VerificationModalType) => void;
  onSuccess: (result: {
    type: "email" | "phone";
    value: string;
    countryCode?: string;
    isVerified: boolean;
  }) => void;
}

// =====================================================
// COMPONENT
// =====================================================

export default function ProfileVerificationModals({
  email = "",
  phone = "",
  countryCode = "+91",
  isEmailVerified = false,
  isPhoneVerified = false,
  activeModal,
  setActiveModal,
  onSuccess,
}: ProfileVerificationModalsProps) {
  // Reminder popup state
  const [showReminder, setShowReminder] = useState(false);

  // Lifecycle state:
  // 1: Cross-verification OTP on existing partner contact
  // 2: Input new contact details
  // 3: Verify OTP on new contact details
  // "unverified_partner": Edge case when partner contact is not verified
  const [modalStep, setModalStep] = useState<1 | 2 | 3 | "unverified_partner">(1);

  const [modalInput, setModalInput] = useState("");
  const [modalCountryCode, setModalCountryCode] = useState(countryCode || "+91");
  const [modalOtp, setModalOtp] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Challenge session state & timestamps
  const [challengeId, setChallengeId] = useState("");
  const [targetResendAvailableAt, setTargetResendAvailableAt] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  // Cross-verification security tokens & masked target info
  const [crossToken, setCrossToken] = useState("");
  const [maskedContact, setMaskedContact] = useState("");

  // Refs for Strict Mode guards and concurrency control
  const hasCheckedPendingRef = useRef(false);
  const isInitiatingRef = useRef(false);

  // Check reminder eligibility once per session
  useEffect(() => {
    if (!email && !phone) return;

    if (isEmailVerified && isPhoneVerified) {
      setShowReminder(false);
      return;
    }

    try {
      const dismissed = sessionStorage.getItem("mm_verify_reminder_dismissed");
      if (!dismissed && !activeModal) {
        setShowReminder(true);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [email, phone, isEmailVerified, isPhoneVerified, activeModal]);

  // Resend countdown timer calculated against target timestamp
  useEffect(() => {
    if (!targetResendAvailableAt) {
      setResendTimer(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((targetResendAvailableAt - Date.now()) / 1000)
      );
      setResendTimer(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetResendAvailableAt]);

  const dismissReminder = () => {
    setShowReminder(false);
    try {
      sessionStorage.setItem("mm_verify_reminder_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  // =====================================================
  // RESTORE PENDING VERIFICATION CHALLENGE ON MOUNT
  // =====================================================
  useEffect(() => {
    if (hasCheckedPendingRef.current) return;
    hasCheckedPendingRef.current = true;

    const pending = getPendingVerification();
    if (!pending || !pending.type) return;

    if (pending.type === "change-email" || pending.type === "change-phone") {
      // Immediately restore state into UI to prevent flicker
      setActiveModal(pending.type);
      setModalStep(pending.step || 1);
      if (pending.challengeId) setChallengeId(pending.challengeId);
      if (pending.maskedContact) setMaskedContact(pending.maskedContact);
      if (pending.newInput) setModalInput(pending.newInput);
      if (pending.newCountryCode) setModalCountryCode(pending.newCountryCode);
      if (pending.crossToken) setCrossToken(pending.crossToken);
      if (pending.resendAvailableAt) setTargetResendAvailableAt(pending.resendAvailableAt);

      setIsRestoring(true);

      const endpoint =
        pending.type === "change-email"
          ? `/api/auth/change-email/pending-status${
              pending.challengeId
                ? `?challengeId=${encodeURIComponent(pending.challengeId)}`
                : ""
            }`
          : `/api/auth/change-phone/pending-status${
              pending.challengeId
                ? `?challengeId=${encodeURIComponent(pending.challengeId)}`
                : ""
            }`;

      apiRequest<any>(endpoint, { method: "GET" })
        .then((res) => {
          if (res?.hasPending) {
            setModalStep(res.step || pending.step || 1);
            if (res.challengeId) setChallengeId(res.challengeId);
            if (res.maskedContact) setMaskedContact(res.maskedContact);
            if (res.pendingEmail) setModalInput(res.pendingEmail);
            if (res.pendingPhone) setModalInput(res.pendingPhone);
            if (res.pendingCountryCode) setModalCountryCode(res.pendingCountryCode);
            if (res.crossVerificationToken) setCrossToken(res.crossVerificationToken);

            if (res.isExpired) {
              setModalError("Verification code has expired. Please request a new code.");
              setTargetResendAvailableAt(0);
            } else if (res.resendAvailableAt) {
              setTargetResendAvailableAt(res.resendAvailableAt);
            }

            savePendingVerification({
              type: pending.type,
              challengeId: res.challengeId || pending.challengeId,
              step: res.step || pending.step || 1,
              maskedContact: res.maskedContact || pending.maskedContact,
              newInput: res.pendingEmail || res.pendingPhone || pending.newInput,
              newCountryCode: res.pendingCountryCode || pending.newCountryCode,
              crossToken: res.crossVerificationToken || pending.crossToken,
              resendAvailableAt: res.isExpired
                ? 0
                : (res.resendAvailableAt || pending.resendAvailableAt),
              expiresAt: res.expiresAt || pending.expiresAt,
            });
          } else {
            // Challenge is no longer pending or valid
            clearPendingVerification();
            setActiveModal(null);
          }
        })
        .catch((err) => {
          console.error("Failed to check pending verification status:", err);
          if (err?.status === 401 || err?.status === 404) {
            clearPendingVerification();
            setActiveModal(null);
          }
        })
        .finally(() => {
          setIsRestoring(false);
        });
    }
  }, [setActiveModal]);

  // =====================================================
  // AUTO-INITIATE ONLY ON FRESH USER ACTION
  // =====================================================
  useEffect(() => {
    if (!activeModal) {
      setModalError("");
      setModalOtp("");
      return;
    }

    // If we already have an active or restoring challenge matching this modal, do NOT re-initiate!
    const pending = getPendingVerification();
    if (
      pending &&
      pending.type === activeModal &&
      (challengeId || pending.challengeId || isRestoring)
    ) {
      return;
    }

    if (isInitiatingRef.current) return;

    // 1. DIRECT EMAIL VERIFICATION (Initial)
    if (activeModal === "verify-email") {
      if (isEmailVerified) {
        showToast.info("This email is already verified.");
        setActiveModal(null);
        return;
      }
      if (email) {
        setModalStep(2);
        setModalLoading(true);
        isInitiatingRef.current = true;
        apiRequest("/api/auth/resend-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
          .then(() => {
            const resendAt = Date.now() + 60 * 1000;
            setTargetResendAvailableAt(resendAt);
            showToast.success(`Verification code sent to ${email}`);
          })
          .catch((err: any) => {
            const msg = err?.message || "";
            if (msg.toLowerCase().includes("already verified")) {
              showToast.info("This email is already verified.");
              onSuccess({ type: "email", value: email, isVerified: true });
              setActiveModal(null);
              return;
            }
            setModalError(msg || "Failed to send verification code.");
          })
          .finally(() => {
            setModalLoading(false);
            isInitiatingRef.current = false;
          });
      }
    }

    // 2. DIRECT PHONE VERIFICATION (Initial)
    else if (activeModal === "verify-phone") {
      if (isPhoneVerified) {
        showToast.info("This mobile number is already verified.");
        setActiveModal(null);
        return;
      }
      if (phone) {
        setModalStep(2);
        setModalLoading(true);
        isInitiatingRef.current = true;
        apiRequest("/api/auth/resend-phone-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        })
          .then(() => {
            const resendAt = Date.now() + 60 * 1000;
            setTargetResendAvailableAt(resendAt);
            showToast.success(
              `SMS verification code sent to ${formatDisplayPhone(phone, countryCode)}`
            );
          })
          .catch((err: any) => {
            const msg = err?.message || "";
            if (msg.toLowerCase().includes("already verified")) {
              showToast.info("This mobile number is already verified.");
              onSuccess({ type: "phone", value: phone, countryCode, isVerified: true });
              setActiveModal(null);
              return;
            }
            setModalError(msg || "Failed to send SMS code.");
          })
          .finally(() => {
            setModalLoading(false);
            isInitiatingRef.current = false;
          });
      }
    }

    // 3. CHANGE EMAIL (Cross-Verification via Mobile Number)
    else if (activeModal === "change-email") {
      // Edge Case 1: Existing mobile number is NOT verified
      if (!isPhoneVerified || !phone) {
        setModalStep("unverified_partner");
        setModalError("Please verify your mobile number before changing your email address.");
        return;
      }

      setModalStep(1);
      setModalLoading(true);
      isInitiatingRef.current = true;
      apiRequest<any>("/api/auth/change-email/initiate-cross-verification", {
        method: "POST",
      })
        .then((res) => {
          const masked = res?.maskedPhone || maskPhone(phone, countryCode);
          const cid = res?.challengeId || "";
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;

          setChallengeId(cid);
          setMaskedContact(masked);
          setTargetResendAvailableAt(resendAt);

          savePendingVerification({
            type: "change-email",
            challengeId: cid,
            step: 1,
            maskedContact: masked,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });

          showToast.info("Verification code sent to your registered mobile number");
        })
        .catch((err: any) => {
          setModalError(err?.message || "Failed to initiate mobile verification.");
        })
        .finally(() => {
          setModalLoading(false);
          isInitiatingRef.current = false;
        });
    }

    // 4. CHANGE MOBILE NUMBER (Cross-Verification via Email Address)
    else if (activeModal === "change-phone") {
      setModalCountryCode(countryCode || "+91");

      // Edge Case 2: Existing email address is NOT verified
      if (!isEmailVerified || !email) {
        setModalStep("unverified_partner");
        setModalError("Please verify your email address before changing your mobile number.");
        return;
      }

      setModalStep(1);
      setModalLoading(true);
      isInitiatingRef.current = true;
      apiRequest<any>("/api/auth/change-phone/initiate-cross-verification", {
        method: "POST",
      })
        .then((res) => {
          const masked = res?.maskedEmail || maskEmail(email);
          const cid = res?.challengeId || "";
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;

          setChallengeId(cid);
          setMaskedContact(masked);
          setTargetResendAvailableAt(resendAt);

          savePendingVerification({
            type: "change-phone",
            challengeId: cid,
            step: 1,
            maskedContact: masked,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });

          showToast.info("Verification code sent to your registered email address");
        })
        .catch((err: any) => {
          setModalError(err?.message || "Failed to initiate email verification.");
        })
        .finally(() => {
          setModalLoading(false);
          isInitiatingRef.current = false;
        });
    }
  }, [activeModal, isEmailVerified, isPhoneVerified, email, phone, countryCode, challengeId, isRestoring, onSuccess, setActiveModal]);

  // Launch verify email directly from reminder popup or edge-case warning
  const triggerVerifyEmail = () => {
    dismissReminder();
    setActiveModal("verify-email");
  };

  // Launch verify phone directly from reminder popup or edge-case warning
  const triggerVerifyPhone = () => {
    dismissReminder();
    setActiveModal("verify-phone");
  };

  // Explicit cancel or close
  const handleCancelOrClose = useCallback(() => {
    if (modalLoading) return;

    if (activeModal === "change-email") {
      apiRequest("/api/auth/change-email/cancel", { method: "POST" }).catch(() => {});
    } else if (activeModal === "change-phone") {
      apiRequest("/api/auth/change-phone/cancel", { method: "POST" }).catch(() => {});
    }

    clearPendingVerification();
    setChallengeId("");
    setCrossToken("");
    setModalOtp("");
    setModalInput("");
    setModalError("");
    setTargetResendAvailableAt(0);
    setResendTimer(0);
    setModalStep(1);
    setActiveModal(null);
  }, [modalLoading, activeModal, setActiveModal]);

  // -----------------------------------------------------
  // HANDLERS: DIRECT INITIAL VERIFICATION
  // -----------------------------------------------------

  const handleConfirmVerifyEmail = async () => {
    if (!modalOtp.trim() || modalOtp.trim().length < 6) {
      setModalError("Please enter the 6-digit verification code.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      await apiRequest("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: modalOtp.trim() }),
      });
      showToast.success("Email verified successfully!");
      clearPendingVerification();
      onSuccess({
        type: "email",
        value: email,
        isVerified: true,
      });
      setActiveModal(null);
    } catch (err: any) {
      setModalError(err?.message || "Invalid or expired verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmVerifyPhone = async () => {
    if (!modalOtp.trim() || modalOtp.trim().length < 6) {
      setModalError("Please enter the 6-digit verification code.");
      return;
    }
    setModalLoading(true);
    setModalError("");
    try {
      await apiRequest("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: modalOtp.trim() }),
      });
      showToast.success("Mobile number verified successfully!");
      clearPendingVerification();
      onSuccess({
        type: "phone",
        value: phone,
        countryCode,
        isVerified: true,
      });
      setActiveModal(null);
    } catch (err: any) {
      setModalError(err?.message || "Invalid or expired verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  // -----------------------------------------------------
  // HANDLERS: CROSS-VERIFICATION STEP 1 (VERIFY EXISTING)
  // -----------------------------------------------------

  const handleVerifyCrossOtp = async () => {
    if (!modalOtp.trim() || modalOtp.trim().length < 6) {
      setModalError("Please enter the 6-digit verification code.");
      return;
    }
    setModalLoading(true);
    setModalError("");

    try {
      if (activeModal === "change-email") {
        const res = await apiRequest<any>("/api/auth/change-email/verify-cross-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp: modalOtp.trim(), challengeId }),
        });
        const newToken = res?.crossVerificationToken || "";
        const cid = res?.challengeId || challengeId;
        setCrossToken(newToken);
        setChallengeId(cid);
        setModalStep(2);
        setModalOtp("");
        setModalInput("");
        setTargetResendAvailableAt(0);

        savePendingVerification({
          type: "change-email",
          challengeId: cid,
          step: 2,
          maskedContact,
          crossToken: newToken,
          expiresAt: res?.expiresAt,
        });

        showToast.success("Mobile number verified! Enter your new email address.");
      } else if (activeModal === "change-phone") {
        const res = await apiRequest<any>("/api/auth/change-phone/verify-cross-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp: modalOtp.trim(), challengeId }),
        });
        const newToken = res?.crossVerificationToken || "";
        const cid = res?.challengeId || challengeId;
        setCrossToken(newToken);
        setChallengeId(cid);
        setModalStep(2);
        setModalOtp("");
        setModalInput("");
        setTargetResendAvailableAt(0);

        savePendingVerification({
          type: "change-phone",
          challengeId: cid,
          step: 2,
          maskedContact,
          crossToken: newToken,
          expiresAt: res?.expiresAt,
        });

        showToast.success("Email address verified! Enter your new mobile number.");
      }
    } catch (err: any) {
      setModalError(err?.message || "Invalid or expired verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  // -----------------------------------------------------
  // HANDLERS: CROSS-VERIFICATION STEP 2 (SEND TO NEW)
  // -----------------------------------------------------

  const handleRequestNewContact = async () => {
    const val = modalInput.trim();
    if (!val) {
      setModalError(
        activeModal === "change-email"
          ? "Please enter a new email address."
          : "Please enter a new mobile number."
      );
      return;
    }

    if (activeModal === "change-email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setModalError("Please enter a valid email address.");
        return;
      }
      if (val.toLowerCase() === email.toLowerCase()) {
        setModalError("New email cannot be the same as your current email.");
        return;
      }
    } else {
      if (val === phone) {
        setModalError("New number cannot be the same as your current number.");
        return;
      }
    }

    setModalLoading(true);
    setModalError("");

    try {
      if (activeModal === "change-email") {
        const res = await apiRequest<any>("/api/auth/change-email/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newEmail: val,
            crossVerificationToken: crossToken,
            challengeId,
          }),
        });
        const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
        const cid = res?.challengeId || challengeId;
        const masked = res?.maskedEmail || maskEmail(val);

        setModalStep(3);
        setModalOtp("");
        setTargetResendAvailableAt(resendAt);
        setChallengeId(cid);

        savePendingVerification({
          type: "change-email",
          challengeId: cid,
          step: 3,
          maskedContact: masked,
          newInput: val,
          crossToken,
          resendAvailableAt: resendAt,
          expiresAt: res?.expiresAt,
        });

        showToast.success(`Verification code sent to ${val}`);
      } else if (activeModal === "change-phone") {
        const res = await apiRequest<any>("/api/auth/change-phone/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPhone: val,
            countryCode: modalCountryCode,
            crossVerificationToken: crossToken,
            challengeId,
          }),
        });
        const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
        const cid = res?.challengeId || challengeId;

        setModalStep(3);
        setModalOtp("");
        setTargetResendAvailableAt(resendAt);
        setChallengeId(cid);

        savePendingVerification({
          type: "change-phone",
          challengeId: cid,
          step: 3,
          maskedContact: formatDisplayPhone(val, modalCountryCode),
          newInput: val,
          newCountryCode: modalCountryCode,
          crossToken,
          resendAvailableAt: resendAt,
          expiresAt: res?.expiresAt,
        });

        showToast.success(
          `SMS verification code sent to ${formatDisplayPhone(val, modalCountryCode)}`
        );
      }
    } catch (err: any) {
      setModalError(err?.message || "Failed to send verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  // -----------------------------------------------------
  // HANDLERS: CROSS-VERIFICATION STEP 3 (FINAL VERIFY & UPDATE)
  // -----------------------------------------------------

  const handleConfirmNewContact = async () => {
    if (!modalOtp.trim() || modalOtp.trim().length < 6) {
      setModalError("Please enter the 6-digit verification code.");
      return;
    }

    setModalLoading(true);
    setModalError("");

    try {
      if (activeModal === "change-email") {
        const res = await apiRequest<any>("/api/auth/change-email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newEmail: modalInput.trim(),
            otp: modalOtp.trim(),
            crossVerificationToken: crossToken,
            challengeId,
          }),
        });
        const updatedEmail = res?.data?.email || modalInput.trim();
        showToast.success("Email address updated and verified successfully!");
        clearPendingVerification();
        onSuccess({
          type: "email",
          value: updatedEmail,
          isVerified: true,
        });
        setActiveModal(null);
      } else if (activeModal === "change-phone") {
        const res = await apiRequest<any>("/api/auth/change-phone/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPhone: modalInput.trim(),
            otp: modalOtp.trim(),
            crossVerificationToken: crossToken,
            challengeId,
          }),
        });
        const updatedPhone = res?.data?.phone || modalInput.trim();
        const updatedCC = res?.data?.countryCode || modalCountryCode;
        showToast.success("Mobile number updated and verified successfully!");
        clearPendingVerification();
        onSuccess({
          type: "phone",
          value: updatedPhone,
          countryCode: updatedCC,
          isVerified: true,
        });
        setActiveModal(null);
      }
    } catch (err: any) {
      setModalError(err?.message || "Invalid or expired verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  // -----------------------------------------------------
  // HANDLERS: RESEND OTP
  // -----------------------------------------------------

  const handleResendOtp = async () => {
    setModalLoading(true);
    setModalError("");
    try {
      if (activeModal === "verify-email") {
        await apiRequest("/api/auth/resend-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        setTargetResendAvailableAt(Date.now() + 60 * 1000);
        showToast.success(`Verification code resent to ${email}`);
      } else if (activeModal === "verify-phone") {
        await apiRequest("/api/auth/resend-phone-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        setTargetResendAvailableAt(Date.now() + 60 * 1000);
        showToast.success(
          `SMS verification code resent to ${formatDisplayPhone(phone, countryCode)}`
        );
      } else if (activeModal === "change-email") {
        if (modalStep === 1) {
          const res = await apiRequest<any>("/api/auth/change-email/resend-cross-otp", {
            method: "POST",
          });
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
          setTargetResendAvailableAt(resendAt);
          savePendingVerification({
            type: "change-email",
            challengeId: res?.challengeId || challengeId,
            step: 1,
            maskedContact: res?.maskedPhone || maskedContact,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });
          showToast.success("Verification code resent to your registered mobile number");
        } else if (modalStep === 3) {
          const res = await apiRequest<any>("/api/auth/change-email/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              newEmail: modalInput.trim(),
              crossVerificationToken: crossToken,
              challengeId,
            }),
          });
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
          setTargetResendAvailableAt(resendAt);
          savePendingVerification({
            type: "change-email",
            challengeId: res?.challengeId || challengeId,
            step: 3,
            maskedContact: res?.maskedEmail || maskedContact,
            newInput: modalInput.trim(),
            crossToken,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });
          showToast.success(`Verification code resent to ${modalInput.trim()}`);
        }
      } else if (activeModal === "change-phone") {
        if (modalStep === 1) {
          const res = await apiRequest<any>("/api/auth/change-phone/resend-cross-otp", {
            method: "POST",
          });
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
          setTargetResendAvailableAt(resendAt);
          savePendingVerification({
            type: "change-phone",
            challengeId: res?.challengeId || challengeId,
            step: 1,
            maskedContact: res?.maskedEmail || maskedContact,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });
          showToast.success("Verification code resent to your registered email address");
        } else if (modalStep === 3) {
          const res = await apiRequest<any>("/api/auth/change-phone/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              newPhone: modalInput.trim(),
              countryCode: modalCountryCode,
              crossVerificationToken: crossToken,
              challengeId,
            }),
          });
          const resendAt = res?.resendAvailableAt || Date.now() + 60 * 1000;
          setTargetResendAvailableAt(resendAt);
          savePendingVerification({
            type: "change-phone",
            challengeId: res?.challengeId || challengeId,
            step: 3,
            maskedContact: formatDisplayPhone(modalInput.trim(), modalCountryCode),
            newInput: modalInput.trim(),
            newCountryCode: modalCountryCode,
            crossToken,
            resendAvailableAt: resendAt,
            expiresAt: res?.expiresAt,
          });
          showToast.success(
            `SMS verification code resent to ${formatDisplayPhone(
              modalInput.trim(),
              modalCountryCode
            )}`
          );
        }
      }
    } catch (err: any) {
      setModalError(err?.message || "Failed to resend verification code.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      {/* =================================================
          1. ONE-TIME VERIFICATION REMINDER POPUP
      ================================================= */}
      <Modal
        isOpen={showReminder && !activeModal}
        onClose={dismissReminder}
        className="w-full max-w-lg"
      >
        <div className="w-full overflow-hidden rounded-3xl border border-[#C7D5DC] bg-white p-6 shadow-2xl dark:border-[#3A5F71] dark:bg-[#102A38]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5E8] text-[#B87916] dark:bg-[#382613] dark:text-[#F3BA65]">
                <ShieldAlert size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#063D63] dark:text-white">
                  {!isEmailVerified && !isPhoneVerified
                    ? "Account Verification Recommended"
                    : !isEmailVerified
                    ? "Verify Your Email Address"
                    : "Verify Your Mobile Number"}
                </h3>
                <p className="mt-0.5 text-xs text-[#7B8F9A] dark:text-[#9FB6C0]">
                  Verify your contact information to protect your account and receive essential notifications.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissReminder}
              className="rounded-lg p-1.5 text-[#8A9CA5] transition hover:bg-[#F3F7F8] hover:text-[#063D63] dark:hover:bg-[#18333F] dark:hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {!isEmailVerified && email && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#BDCED6] bg-[#F8FBFC] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#3D6375] dark:bg-[#0D2533]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#12383F] dark:text-[#64D4DF]">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#8FA8B2]">
                      Email Address
                    </p>
                    <p className="text-sm font-semibold text-[#102A43] dark:text-[#E2EFF4]">
                      {email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:self-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E8] px-2.5 py-1 text-[10px] font-bold text-[#B87916] dark:bg-[#3D2C1A] dark:text-[#F3BA65]">
                    <AlertCircle size={12} />
                    <span>Not Verified</span>
                  </span>
                  <button
                    type="button"
                    onClick={triggerVerifyEmail}
                    className="flex items-center gap-1.5 rounded-xl bg-[#087D8F] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#066574] dark:bg-[#4CD3DF] dark:text-[#063D63]"
                  >
                    <span>Verify Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {!isPhoneVerified && phone && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#BDCED6] bg-[#F8FBFC] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#3D6375] dark:bg-[#0D2533]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#12383F] dark:text-[#64D4DF]">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#8FA8B2]">
                      Mobile Number
                    </p>
                    <p className="text-sm font-semibold text-[#102A43] dark:text-[#E2EFF4]">
                      {formatDisplayPhone(phone, countryCode)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:self-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E8] px-2.5 py-1 text-[10px] font-bold text-[#B87916] dark:bg-[#3D2C1A] dark:text-[#F3BA65]">
                    <AlertCircle size={12} />
                    <span>Not Verified</span>
                  </span>
                  <button
                    type="button"
                    onClick={triggerVerifyPhone}
                    className="flex items-center gap-1.5 rounded-xl bg-[#087D8F] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#066574] dark:bg-[#4CD3DF] dark:text-[#063D63]"
                  >
                    <span>Verify Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#CCD8DF] pt-4 dark:border-[#36596A]">
            <span className="text-[11px] text-[#8A9CA5] dark:text-[#8FA8B2]">
              You can also verify from your profile at any time.
            </span>
            <button
              type="button"
              onClick={dismissReminder}
              className="rounded-xl border border-[#BDCED6] px-4 py-2 text-xs font-bold text-[#607985] transition hover:bg-[#F3F7F8] dark:border-[#3D6375] dark:text-[#A9BEC6] dark:hover:bg-[#18333F]"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </Modal>

      {/* =================================================
          2. OTP VERIFICATION / CROSS-VERIFICATION MODAL
      ================================================= */}
      <Modal
        isOpen={!!activeModal}
        onClose={handleCancelOrClose}
        className="w-full max-w-md"
      >
        {activeModal && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#C7D5DC] bg-white p-5 sm:p-6 shadow-2xl dark:border-[#3A5F71] dark:bg-[#102A38]">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD3DF]">
                  {modalStep === "unverified_partner" ? (
                    <ShieldAlert size={20} className="text-[#B87916] dark:text-[#F3BA65]" />
                  ) : activeModal === "change-email" ? (
                    modalStep === 1 ? <Phone size={20} /> : <Mail size={20} />
                  ) : activeModal === "change-phone" ? (
                    modalStep === 1 ? <Mail size={20} /> : <Phone size={20} />
                  ) : activeModal === "verify-email" ? (
                    <Mail size={20} />
                  ) : (
                    <Phone size={20} />
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#063D63] dark:text-white">
                    {modalStep === "unverified_partner" &&
                      (activeModal === "change-email"
                        ? "Mobile Verification Required"
                        : "Email Verification Required")}

                    {activeModal === "verify-email" && "Verify Email Address"}
                    {activeModal === "verify-phone" && "Verify Mobile Number"}

                    {activeModal === "change-email" &&
                      modalStep !== "unverified_partner" &&
                      (modalStep === 1
                        ? "Verify your mobile number"
                        : modalStep === 2
                        ? "Change Email Address"
                        : "Verify new email address")}

                    {activeModal === "change-phone" &&
                      modalStep !== "unverified_partner" &&
                      (modalStep === 1
                        ? "Verify your email address"
                        : modalStep === 2
                        ? "Change Mobile Number"
                        : "Verify new mobile number")}
                  </h3>

                  <p className="text-xs text-[#7B8F9A] dark:text-[#9FB6C0]">
                    {modalStep === "unverified_partner" &&
                      "Security rule requires the existing contact to be verified first."}

                    {activeModal === "verify-email" && `Enter the OTP sent to ${email}`}
                    {activeModal === "verify-phone" &&
                      `Enter the SMS OTP sent to ${formatDisplayPhone(phone, countryCode)}`}

                    {activeModal === "change-email" &&
                      modalStep !== "unverified_partner" &&
                      (modalStep === 1
                        ? `Enter code sent to ${maskedContact || maskPhone(phone, countryCode)}`
                        : modalStep === 2
                        ? "Enter your new email address"
                        : `Enter the OTP sent to ${modalInput}`)}

                    {activeModal === "change-phone" &&
                      modalStep !== "unverified_partner" &&
                      (modalStep === 1
                        ? `Enter code sent to ${maskedContact || maskEmail(email)}`
                        : modalStep === 2
                        ? "Enter your new mobile number"
                        : `Enter the SMS OTP sent to ${formatDisplayPhone(
                            modalInput,
                            modalCountryCode
                          )}`)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={modalLoading}
                onClick={handleCancelOrClose}
                className="rounded-lg p-1.5 text-[#8A9CA5] transition hover:bg-[#F3F7F8] hover:text-[#063D63] dark:hover:bg-[#18333F] dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* INLINE ERROR */}
            {modalError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-3 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                {modalError}
              </div>
            )}

            {isRestoring ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-[#087D8F] dark:text-[#4CD3DF]" />
                <p className="mt-3 text-xs font-semibold text-[#718894] dark:text-[#9FB6C0]">
                  Verifying session...
                </p>
              </div>
            ) : (
              <>
                {/* MODAL BODY */}
                <div className="mt-5 space-y-4">
                  {/* EDGE CASE: UNVERIFIED PARTNER STATE */}
                  {modalStep === "unverified_partner" && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#FFECC9] bg-[#FFFBF3] p-4 dark:border-[#4B391F] dark:bg-[#241C12]">
                        <div className="flex items-start gap-3">
                          <ShieldAlert size={18} className="shrink-0 text-[#C98212] dark:text-[#F4BA62] mt-0.5" />
                          <p className="text-xs leading-relaxed text-[#7C5513] dark:text-[#E8BD7C]">
                            {activeModal === "change-email"
                              ? "Please verify your mobile number before changing your email address."
                              : "Please verify your email address before changing your mobile number."}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#718894] dark:text-[#8FA8B2]">
                        MindMatrix uses cross-verification to protect user accounts. To change one contact method, the other must already be verified.
                      </p>
                    </div>
                  )}

                  {/* STEP 1: CROSS-VERIFICATION (VERIFY EXISTING PARTNER CONTACT) */}
                  {(activeModal === "change-email" || activeModal === "change-phone") &&
                    modalStep === 1 && (
                      <div>
                        <div className="mb-3 rounded-xl border border-[#D5EBF0] bg-[#F3FBFD] p-3 text-[11px] font-medium text-[#087D8F] dark:border-[#1F4550] dark:bg-[#0B252E] dark:text-[#64D4DF]">
                          <div className="flex items-center gap-2">
                            <KeyRound size={14} className="shrink-0" />
                            <span>
                              {activeModal === "change-email"
                                ? "Step 1/2: Verify existing mobile number"
                                : "Step 1/2: Verify existing email address"}
                            </span>
                          </div>
                        </div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                          6-Digit Verification Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="••••••"
                          value={modalOtp}
                          onChange={(e) =>
                            setModalOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          disabled={modalLoading}
                          className="h-12 w-full rounded-xl border border-[#BDCED6] bg-[#FBFDFE] text-center font-mono text-xl font-bold tracking-[0.4em] text-[#063D63] outline-none transition focus:border-[#087D8F] focus:bg-white dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-white"
                        />

                        {/* RESEND LINK */}
                        <div className="mt-2.5 flex items-center justify-between text-xs">
                          <span className="text-[#8A9CA5] dark:text-[#8FA8B2]">
                            Didn't receive the code?
                          </span>
                          {resendTimer > 0 ? (
                            <span className="font-semibold text-[#8A9CA5] dark:text-[#8FA8B2]">
                              Resend in {resendTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={modalLoading}
                              onClick={handleResendOtp}
                              className="font-bold text-[#087D8F] transition hover:underline dark:text-[#4CD3DF]"
                            >
                              Resend Code
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* STEP 2: INPUT NEW CONTACT CREDENTIAL */}
                  {(activeModal === "change-email" || activeModal === "change-phone") &&
                    modalStep === 2 && (
                      <div>
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF9F4] px-3 py-1 text-[10px] font-bold text-[#159779] dark:bg-[#123C35] dark:text-[#5FE3BE]">
                          <CheckCircle2 size={12} />
                          <span>
                            {activeModal === "change-email"
                              ? "Mobile Number Verified"
                              : "Email Address Verified"}
                          </span>
                        </div>

                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                          {activeModal === "change-email"
                            ? "New Email Address"
                            : "New Mobile Number"}
                        </label>

                        {activeModal === "change-email" ? (
                          <input
                            type="email"
                            placeholder="e.g. user@company.com"
                            value={modalInput}
                            onChange={(e) => setModalInput(e.target.value)}
                            disabled={modalLoading}
                            className="h-11 w-full rounded-xl border border-[#BDCED6] bg-[#FBFDFE] px-3.5 text-sm font-medium text-[#315364] outline-none transition focus:border-[#087D8F] focus:bg-white dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#D7E7EC]"
                          />
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="+91"
                              value={modalCountryCode}
                              onChange={(e) => setModalCountryCode(e.target.value)}
                              disabled={modalLoading}
                              className="h-11 w-20 rounded-xl border border-[#BDCED6] bg-[#FBFDFE] px-3 text-center text-sm font-medium text-[#315364] outline-none transition focus:border-[#087D8F] dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#D7E7EC]"
                            />
                            <input
                              type="tel"
                              placeholder="e.g. 9876543210"
                              value={modalInput}
                              onChange={(e) => setModalInput(e.target.value)}
                              disabled={modalLoading}
                              className="h-11 flex-1 rounded-xl border border-[#BDCED6] bg-[#FBFDFE] px-3.5 text-sm font-medium text-[#315364] outline-none transition focus:border-[#087D8F] focus:bg-white dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#D7E7EC]"
                            />
                          </div>
                        )}
                        <p className="mt-1.5 text-[11px] text-[#8A9CA5] dark:text-[#8FA8B2]">
                          A 6-digit verification code will be sent to confirm ownership.
                        </p>
                      </div>
                    )}

                  {/* STEP 3 OR DIRECT INITIAL: VERIFY NEW CONTACT OTP */}
                  {(((activeModal === "change-email" || activeModal === "change-phone") &&
                    modalStep === 3) ||
                    activeModal === "verify-email" ||
                    activeModal === "verify-phone") && (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={modalOtp}
                        onChange={(e) =>
                          setModalOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        disabled={modalLoading}
                        className="h-12 w-full rounded-xl border border-[#BDCED6] bg-[#FBFDFE] text-center font-mono text-xl font-bold tracking-[0.4em] text-[#063D63] outline-none transition focus:border-[#087D8F] focus:bg-white dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-white"
                      />

                      {/* RESEND LINK */}
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="text-[#8A9CA5] dark:text-[#8FA8B2]">
                          Didn't receive the code?
                        </span>
                        {resendTimer > 0 ? (
                          <span className="font-semibold text-[#8A9CA5] dark:text-[#8FA8B2]">
                            Resend in {resendTimer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={modalLoading}
                            onClick={handleResendOtp}
                            className="font-bold text-[#087D8F] transition hover:underline dark:text-[#4CD3DF]"
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* MODAL ACTIONS */}
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#CCD8DF] pt-4 dark:border-[#36596A]">
                  <button
                    type="button"
                    disabled={modalLoading}
                    onClick={handleCancelOrClose}
                    className="rounded-xl border border-[#BDCED6] px-4 py-2.5 text-xs font-bold text-[#607985] transition hover:bg-[#F3F7F8] dark:border-[#3D6375] dark:text-[#A9BEC6] dark:hover:bg-[#18333F]"
                  >
                    Cancel
                  </button>

                  {modalStep === "unverified_partner" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeModal === "change-email") {
                          triggerVerifyPhone();
                        } else {
                          triggerVerifyEmail();
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[#087D8F] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#066574] dark:bg-[#4CD3DF] dark:text-[#063D63]"
                    >
                      <span>
                        {activeModal === "change-email"
                          ? "Verify Mobile Number Now"
                          : "Verify Email Address Now"}
                      </span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (activeModal === "change-email" || activeModal === "change-phone") &&
                    modalStep === 1 ? (
                    <button
                      type="button"
                      disabled={modalLoading || modalOtp.length < 6}
                      onClick={handleVerifyCrossOtp}
                      className="flex items-center gap-2 rounded-xl bg-[#063D63] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#052F4D] disabled:opacity-60 dark:bg-[#087D8F] dark:hover:bg-[#0798AA]"
                    >
                      {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      <span>Verify & Continue</span>
                    </button>
                  ) : (activeModal === "change-email" || activeModal === "change-phone") &&
                    modalStep === 2 ? (
                    <button
                      type="button"
                      disabled={modalLoading || !modalInput.trim()}
                      onClick={handleRequestNewContact}
                      className="flex items-center gap-2 rounded-xl bg-[#063D63] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#052F4D] disabled:opacity-60 dark:bg-[#087D8F] dark:hover:bg-[#0798AA]"
                    >
                      {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      <span>Send Verification Code</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={modalLoading || modalOtp.length < 6}
                      onClick={() => {
                        if (activeModal === "verify-email") {
                          handleConfirmVerifyEmail();
                        } else if (activeModal === "verify-phone") {
                          handleConfirmVerifyPhone();
                        } else if (
                          activeModal === "change-email" ||
                          activeModal === "change-phone"
                        ) {
                          handleConfirmNewContact();
                        }
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#063D63] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#052F4D] disabled:opacity-60 dark:bg-[#087D8F] dark:hover:bg-[#0798AA]"
                    >
                      {modalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      <span>Verify & Update</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

