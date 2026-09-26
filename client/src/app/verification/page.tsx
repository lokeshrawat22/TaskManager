"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

// =====================================================
// ICONS
// =====================================================
const ShieldIcon = () => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3z" />
    <path d="M8.5 12l2.2 2.2 4.8-5" />
  </svg>
);


const MailIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);


const PhoneIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M10 5h4" />
    <circle cx="12" cy="18.5" r=".7" />
  </svg>
);


const CheckIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);


const ArrowIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);


const LoaderIcon = () => (
  <svg
    className="animate-spin"
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      className="opacity-25"
    />
    <path d="M21 12a9 9 0 0 0-9-9" />
  </svg>
);


const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);


// =====================================================
// HELPERS
// =====================================================

const maskEmail = (email: string) => {
  if (!email) {
    return "your email address";
  }

  const [name, domain] =
    email.split("@");

  if (!domain || name.length < 3) {
    return email;
  }

  return `${name.substring(
    0,
    2
  )}••••${name.substring(
    name.length - 1
  )}@${domain}`;
};


const maskPhone = (phone: string) => {
  if (!phone) {
    return "your phone number";
  }

  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.substring(
    0,
    3
  )} •••• ${phone.substring(
    phone.length - 4
  )}`;
};


const formatTimer = (
  seconds: number
) => {
  const minutes = Math.floor(
    seconds / 60
  );

  const remainingSeconds =
    seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};


// =====================================================
// PAGE
// =====================================================

export default function VerificationPage() {
    const { t } = useLanguage();


  const router = useRouter();

  // Sensitive verification data is intentionally NOT read from the URL.
  // Register/Login must store these values in sessionStorage before
  // navigating to /verify.
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");

  // ===================================================
  // STATE
  // ===================================================

  const [emailOtp, setEmailOtp] =
    useState("");

  const [phoneOtp, setPhoneOtp] =
    useState("");


  const [emailLoading, setEmailLoading] =
    useState(false);

  const [phoneLoading, setPhoneLoading] =
    useState(false);


  const [emailResending, setEmailResending] =
    useState(false);

  const [phoneResending, setPhoneResending] =
    useState(false);


  const [emailVerified, setEmailVerified] =
    useState(false);

  const [phoneVerified, setPhoneVerified] =
    useState(false);

  // OTP security: 5 incorrect attempts = 10 minute block
  const [emailBlockedUntil, setEmailBlockedUntil] = useState(0);
  const [phoneBlockedUntil, setPhoneBlockedUntil] = useState(0);

  // Server-provided OTP expiry timestamps.
  // These states are declared before the restore/save effects.
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] =
    useState<number | null>(null);

  const [phoneOtpExpiresAt, setPhoneOtpExpiresAt] =
    useState<number | null>(null);

  const [currentTime, setCurrentTime] =
    useState(Date.now());

  

  const [currentStep, setCurrentStep] =
    useState<"email" | "phone">("email");

  const [verificationMessage, setVerificationMessage] =
    useState("");

  const [isHydrated, setIsHydrated] =
    useState(false);


  // ===================================================
  // LOAD VERIFICATION CONTEXT + RESTORE STATE
  // ===================================================

  useEffect(() => {
    // Never read email, phone or source from URL query parameters.
    const storedEmail =
      sessionStorage.getItem("verificationEmail") || "";

    const storedPhone =
      sessionStorage.getItem("verificationPhone") || "";

    const storedSource =
      sessionStorage.getItem("verificationSource") || "";

    setEmail(storedEmail);
    setPhone(storedPhone);
    setSource(storedSource);

    if (!storedEmail && !storedPhone) {
      setIsHydrated(true);
      return;
    }

    const sessionKey = "verificationState";
    const savedState =
      sessionStorage.getItem(sessionKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);

        if (
          parsed.currentStep === "email" ||
          parsed.currentStep === "phone"
        ) {
          setCurrentStep(parsed.currentStep);
        }

        setEmailVerified(
          Boolean(parsed.emailVerified)
        );

        setPhoneVerified(
          Boolean(parsed.phoneVerified)
        );

        setEmailBlockedUntil(
          Number(parsed.emailBlockedUntil || 0)
        );

        setPhoneBlockedUntil(
          Number(parsed.phoneBlockedUntil || 0)
        );

        setEmailOtpExpiresAt(
          Number(parsed.emailOtpExpiresAt || 0) || null
        );

        setPhoneOtpExpiresAt(
          Number(parsed.phoneOtpExpiresAt || 0) || null
        );
      } catch {
        sessionStorage.removeItem(sessionKey);
      }
    }

    setIsHydrated(true);
  }, []);


  // Save verification state so refresh keeps the
  // user on the same verification step.
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!email && !phone) {
      return;
    }

    const sessionKey = "verificationState";

    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({
        currentStep,
        emailVerified,
        phoneVerified,
        emailBlockedUntil,
        phoneBlockedUntil,
        emailOtpExpiresAt,
        phoneOtpExpiresAt,
      })
    );
  }, [
    isHydrated,
    email,
    phone,
    currentStep,
    emailVerified,
    phoneVerified,
    emailBlockedUntil,
    phoneBlockedUntil,
    emailOtpExpiresAt,
    phoneOtpExpiresAt,
  ]);


  // ===================================================
  // PREVENT BACK UNTIL AT LEAST ONE OTP IS VERIFIED
  // ===================================================

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    // Once email or phone is verified, allow normal navigation.
    if (emailVerified || phoneVerified) {
      return;
    }

    // Keep an extra history entry on the verification page.
    // This prevents accidental browser Back navigation while
    // the user still has not verified any OTP.
    window.history.pushState(
      { verificationGuard: true },
      "",
      window.location.href
    );

    const handlePopState = () => {
      // User pressed browser Back before verification.
      // Immediately put the verification page back in history.
      window.history.pushState(
        { verificationGuard: true },
        "",
        window.location.href
      );
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [isHydrated, emailVerified, phoneVerified]);


  const [emailError, setEmailError] =
    useState("");

  const [phoneError, setPhoneError] =
    useState("");


  // ===================================================
  // OTP TIMERS
  // ===================================================

  const [emailTimer, setEmailTimer] =
  useState(0);

const [phoneTimer, setPhoneTimer] =
  useState(0);




  // ===================================================
  // OTP EXPIRY CLOCK
  // ===================================================

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const emailOtpSecondsLeft = emailOtpExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (emailOtpExpiresAt - currentTime) / 1000
        )
      )
    : 0;

  const phoneOtpSecondsLeft = phoneOtpExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (phoneOtpExpiresAt - currentTime) / 1000
        )
      )
    : 0;

  // ===================================================
  // EMAIL TIMER
  // ===================================================
useEffect(() => {
  if (!email || emailVerified) {
    return;
  }

  const expiryKey = `emailOtpResendExpiry_${email}`;
  const initializedKey = `emailOtpResendInitialized_${email}`;

  const storedExpiry =
    localStorage.getItem(expiryKey);

  let expiryTime = storedExpiry
    ? Number(storedExpiry)
    : 0;

  // Start timer only for the first time
  if (
    !expiryTime &&
    !localStorage.getItem(initializedKey)
  ) {
    expiryTime = Date.now() + 60 * 1000;

    localStorage.setItem(
      expiryKey,
      String(expiryTime)
    );

    localStorage.setItem(
      initializedKey,
      "true"
    );
  }

  const updateTimer = () => {
    const remaining = expiryTime
      ? Math.max(
          0,
          Math.ceil(
            (expiryTime - Date.now()) / 1000
          )
        )
      : 0;

    setEmailTimer(remaining);
  };

  updateTimer();

  const interval = window.setInterval(
    updateTimer,
    1000
  );

  return () => {
    window.clearInterval(interval);
  };
}, [email, emailVerified]);

  // ===================================================
  // PHONE TIMER
  // ===================================================

 useEffect(() => {
  if (!phone || phoneVerified) {
    return;
  }

  const expiryKey = `phoneOtpResendExpiry_${phone}`;
  const initializedKey = `phoneOtpResendInitialized_${phone}`;

  const storedExpiry =
    localStorage.getItem(expiryKey);

  let expiryTime = storedExpiry
    ? Number(storedExpiry)
    : 0;

  // Start timer only for the first time
  if (
    !expiryTime &&
    !localStorage.getItem(initializedKey)
  ) {
    expiryTime = Date.now() + 60 * 1000;

    localStorage.setItem(
      expiryKey,
      String(expiryTime)
    );

    localStorage.setItem(
      initializedKey,
      "true"
    );
  }

  const updateTimer = () => {
    const remaining = expiryTime
      ? Math.max(
          0,
          Math.ceil(
            (expiryTime - Date.now()) / 1000
          )
        )
      : 0;

    setPhoneTimer(remaining);
  };

  updateTimer();

  const interval = window.setInterval(
    updateTimer,
    1000
  );

  return () => {
    window.clearInterval(interval);
  };
}, [phone, phoneVerified]);

  // ===================================================
  // OTP BLOCK TIMERS
  // ===================================================

  useEffect(() => {
    const updateBlockTimers = () => {
      const now = Date.now();

      setEmailBlockedUntil((value) =>
        value > now ? value : 0
      );

      setPhoneBlockedUntil((value) =>
        value > now ? value : 0
      );
    };

    updateBlockTimers();

    const interval = window.setInterval(
      updateBlockTimers,
      1000
    );

    return () => window.clearInterval(interval);
  }, []);

  const emailBlocked =
    emailBlockedUntil > Date.now();

  const phoneBlocked =
    phoneBlockedUntil > Date.now();

  const formatBlockedTime = (until: number) =>
    formatTimer(
      Math.max(
        0,
        Math.ceil(
          (until - Date.now()) / 1000
        )
      )
    );

  // ===================================================
  // VERIFY EMAIL
  // ===================================================

  const handleEmailVerify =
    async () => {
      setEmailError("");

      if (emailBlocked) {
        setEmailError(
          `Too many incorrect attempts. Try again in ${formatBlockedTime(emailBlockedUntil)}.`
        );
        return;
      }

      if (!email) {
        setEmailError(
          "Email address is missing."
        );
        return;
      }

      if (emailOtp.length !== 6) {
        setEmailError(
          "Please enter a 6-digit OTP."
        );
        return;
      }

      try {
        setEmailLoading(true);

        const response =
          await fetch(
            `${
              process.env
                .NEXT_PUBLIC_API_URL ||
              "http://localhost:5000"
            }/api/auth/verify-email`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                email,
                otp: emailOtp,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (data.code === "OTP_BLOCKED") {
            setEmailBlockedUntil(
              Date.now() + 10 * 60 * 1000
            );
          }

          throw new Error(
            data.message ||
              "Email verification failed"
          );
        }

        setEmailVerified(true);
        setEmailBlockedUntil(0);
        setEmailError("");
        setVerificationMessage("");
        showToast.success(data?.message || "Email verified successfully!");
        setCurrentStep("phone");

      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Email verification failed";
        setEmailError(msg);
        showToast.error(msg);
      } finally {
        setEmailLoading(false);
      }
    };


  // ===================================================
  // SKIP EMAIL
  // ===================================================

  const handleSkipEmail = () => {
    setEmailError("");
    setVerificationMessage("");
    setCurrentStep("phone");
  };


  // ===================================================
  // VERIFY PHONE
  // ===================================================

  const handlePhoneVerify =
    async () => {
      setPhoneError("");

      if (phoneBlocked) {
        setPhoneError(
          `Too many incorrect attempts. Try again in ${formatBlockedTime(phoneBlockedUntil)}.`
        );
        return;
      }

      if (!phone) {
        setPhoneError(
          "Phone number is missing."
        );
        return;
      }

      if (phoneOtp.length !== 6) {
        setPhoneError(
          "Please enter a 6-digit OTP."
        );
        return;
      }

      try {
        setPhoneLoading(true);

        const response =
          await fetch(
            `${
              process.env
                .NEXT_PUBLIC_API_URL ||
              "http://localhost:5000"
            }/api/auth/verify-phone`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                phone,
                otp: phoneOtp,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (data.code === "OTP_BLOCKED") {
            setPhoneBlockedUntil(
              Date.now() + 10 * 60 * 1000
            );
          }

          throw new Error(
            data.message ||
              "Phone verification failed"
          );
        }

        setPhoneVerified(true);
        setPhoneBlockedUntil(0);
        setPhoneError("");
        setVerificationMessage("");
        showToast.success(data?.message || "Phone number verified successfully!");

      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Phone verification failed";
        setPhoneError(msg);
        showToast.error(msg);
      } finally {
        setPhoneLoading(false);
      }
    };


  // ===================================================
  // BACK TO EMAIL
  // ===================================================

  const handleBackToEmail = () => {
    setPhoneError("");
    setVerificationMessage("");
    setCurrentStep("email");
  };


  // ===================================================
  // SKIP PHONE
  // ===================================================

  const handleSkipPhone = () => {
    setPhoneError("");

    if (emailVerified || phoneVerified) {
      setVerificationMessage("");
      return;
    }

    setVerificationMessage(
      "Please verify at least your email or phone number before continuing."
    );
  };


  // ===================================================
  // RESEND EMAIL OTP
  // ===================================================

  const handleResendEmail =
    async () => {
      if (
        emailTimer > 0 ||
        emailBlocked ||
        emailResending ||
        emailVerified
      ) {
        return;
      }

      setEmailError("");

      try {
        setEmailResending(true);

        const response =
          await fetch(
            `${
              process.env
                .NEXT_PUBLIC_API_URL ||
              "http://localhost:5000"
            }/api/auth/resend-email-otp`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                email,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (data.code === "OTP_BLOCKED") {
            setEmailBlockedUntil(
              Date.now() + 10 * 60 * 1000
            );
          }

          throw new Error(
            data.message ||
              "Failed to resend email OTP"
          );
        }

        setEmailOtp("");

        if (data.data?.emailOtpExpiresAt) {
          setEmailOtpExpiresAt(
            Number(data.data.emailOtpExpiresAt)
          );
        } else {
          setEmailOtpExpiresAt(
            Date.now() + 10 * 60 * 1000
          );
        }

        const newExpiry =
          data.data?.emailOtpResendAvailableAt
            ? Number(data.data.emailOtpResendAvailableAt)
            : Date.now() + 60 * 1000;

        localStorage.setItem(
          `emailOtpResendExpiry_${email}`,
          String(newExpiry)
        );

        setEmailTimer(
          Math.max(
            0,
            Math.ceil(
              (newExpiry - Date.now()) / 1000
            )
          )
        );
        showToast.info(data?.message || "Verification code sent to your email!");

      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to resend email OTP";
        setEmailError(msg);
        showToast.error(msg);
      } finally {
        setEmailResending(false);
      }
    };


  // ===================================================
  // RESEND PHONE OTP
  // ===================================================

  const handleResendPhone =
    async () => {
      if (
        phoneTimer > 0 ||
        phoneBlocked ||
        phoneResending ||
        phoneVerified
      ) {
        return;
      }

      setPhoneError("");

      try {
        setPhoneResending(true);

        const response =
          await fetch(
            `${
              process.env
                .NEXT_PUBLIC_API_URL ||
              "http://localhost:5000"
            }/api/auth/resend-phone-otp`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                phone,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (data.code === "OTP_BLOCKED") {
            setPhoneBlockedUntil(
              Date.now() + 10 * 60 * 1000
            );
          }

          throw new Error(
            data.message ||
              "Failed to resend phone OTP"
          );
        }

        setPhoneOtp("");

        if (data.data?.phoneOtpExpiresAt) {
          setPhoneOtpExpiresAt(
            Number(data.data.phoneOtpExpiresAt)
          );
        } else {
          setPhoneOtpExpiresAt(
            Date.now() + 10 * 60 * 1000
          );
        }

        const newExpiry =
          data.data?.phoneOtpResendAvailableAt
            ? Number(data.data.phoneOtpResendAvailableAt)
            : Date.now() + 60 * 1000;

        localStorage.setItem(
          `phoneOtpResendExpiry_${phone}`,
          String(newExpiry)
        );

        setPhoneTimer(
          Math.max(
            0,
            Math.ceil(
              (newExpiry - Date.now()) / 1000
            )
          )
        );
        showToast.info(data?.message || "Verification code sent to your phone!");

      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to resend phone OTP";
        setPhoneError(msg);
        showToast.error(msg);
      } finally {
        setPhoneResending(false);
      }
    };


  // ===================================================
  // AUTO SEND OTP WHEN COMING FROM LOGIN
  // ===================================================

  useEffect(() => {
    if (!isHydrated || source !== "login" || !email) {
      return;
    }

    // Prevent a refresh from sending another OTP again.
    const loginOtpSentKey =
      "loginVerificationOtpSent";

    const alreadySent =
      sessionStorage.getItem(loginOtpSentKey);

    if (alreadySent === "true") {
      return;
    }

    const sendFreshOtp = async () => {
      try {
        setEmailResending(true);
        setEmailError("");

        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:5000"
          }/api/auth/resend-verification-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // Backend can tell us how long we need to wait.
          if (
            data.code === "RESEND_COOLDOWN" &&
            data.data?.retryAfterSeconds
          ) {
            const retrySeconds = Number(
              data.data.retryAfterSeconds
            );

            const expiry =
              Date.now() + retrySeconds * 1000;

            localStorage.setItem(
              `emailOtpResendExpiry_${email}`,
              String(expiry)
            );

            setEmailTimer(retrySeconds);
          }

          if (data.code === "OTP_BLOCKED") {
            setEmailBlockedUntil(
              Date.now() + 10 * 60 * 1000
            );
          }

          throw new Error(
            data.message ||
              "Failed to send verification OTP"
          );
        }

        // Fresh OTP was successfully sent.
        sessionStorage.setItem(
          loginOtpSentKey,
          "true"
        );

        setEmailOtp("");

        if (data.data?.emailOtpExpiresAt) {
          setEmailOtpExpiresAt(
            Number(data.data.emailOtpExpiresAt)
          );
        } else {
          setEmailOtpExpiresAt(
            Date.now() + 10 * 60 * 1000
          );
        }

        if (data.data?.phoneOtpExpiresAt) {
          setPhoneOtpExpiresAt(
            Number(data.data.phoneOtpExpiresAt)
          );
        }

        const newExpiry =
          data.data?.emailOtpResendAvailableAt
            ? Number(data.data.emailOtpResendAvailableAt)
            : Date.now() + 60 * 1000;

        localStorage.setItem(
          `emailOtpResendExpiry_${email}`,
          String(newExpiry)
        );

        setEmailTimer(60);
        setEmailError("");
      } catch (error) {
        setEmailError(
          error instanceof Error
            ? error.message
            : "Failed to send verification OTP"
        );
      } finally {
        setEmailResending(false);
      }
    };

    sendFreshOtp();
  }, [
    isHydrated,
    source,
    email,
    phone,
  ]);


  // ===================================================
  // CONTINUE
  // ===================================================

  const handleContinue = () => {
    // At least ONE verification is required.
    if (!emailVerified && !phoneVerified) {
      const msg = "Please verify at least your email or phone number before continuing.";
      setVerificationMessage(msg);
      showToast.warning(msg);
      return;
    }

    sessionStorage.removeItem("verificationState");
    sessionStorage.removeItem("loginVerificationOtpSent");
    sessionStorage.removeItem("verificationEmail");
    sessionStorage.removeItem("verificationPhone");
    sessionStorage.removeItem("verificationSource");

    showToast.success("Verification complete! Redirecting to login...");
    router.replace("/login");
  };


  // ===================================================
  // PROGRESS
  // ===================================================

  const verificationCount =
    Number(emailVerified) +
    Number(phoneVerified);

  const progress =
    verificationCount === 2
      ? 100
      : verificationCount === 1
        ? 50
        : 0;

  const isVerificationComplete =
    emailVerified ||
    phoneVerified;

  const isFullyVerified =
    emailVerified &&
    phoneVerified;


  // ===================================================
  // RENDER
  // ===================================================

  if (isHydrated && !email && !phone) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5FAFD] px-4 text-[#102A43]">
        <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 text-center shadow-[0_18px_55px_rgba(6,61,99,0.14)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F6FA] text-[#087DB5]">
            <ShieldIcon />
          </div>

          <h1 className="mt-4 text-lg font-bold">
            {t("verificationSessionNotFound")}</h1>

          <p className="mt-2 text-sm text-[#64748B]">
            {t("pleaseStartTheVerification")}</p>

          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-5 inline-flex h-10 min-w-[160px] items-center justify-center rounded-lg bg-gradient-to-r from-[#063D63] via-[#087DB5] to-[#10A9D1] px-5 text-sm font-bold text-white"
          >
            {t("backToLogin1")}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F5FAFD] text-[#102A43]">

      {/* BACKGROUND */}

      <img
        src="/verify.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="pointer-events-none absolute inset-0 bg-white/70" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#063D63]/10 via-transparent to-[#10B8A8]/10" />


      {/* MAIN */}

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">

        <div className="w-full max-w-[620px]">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-4 text-center sm:mb-5">

            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-md">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#063D63] to-[#10A9D1] text-white">
                <ShieldIcon />
              </div>

              <div className="text-left">

                <p className="text-sm font-bold leading-none text-[#063D63]">
                  {t("mindmatrix")}</p>

                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  {t("secureAuthentication")}</p>

              </div>

            </div>

            <p className="mx-auto mt-1.5 max-w-[500px] text-xs leading-5 text-[#64748B] sm:text-sm">
              {t("verifyYourEmailAddress")}</p>

          </div>


          {/* =================================================
              MAIN CARD
          ================================================= */}

          <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_18px_55px_rgba(6,61,99,0.14)] backdrop-blur-xl sm:p-5">


            {/* =================================================
                PROGRESS
            ================================================= */}

            <div className="mb-4 rounded-xl bg-[#F7FAFC] px-4 py-3">

              <div className="mb-2 flex items-center justify-between">

                <div>

                  <p className="text-xs font-bold text-[#102A43]">
                    {t("verificationProgress")}</p>

                  <p className="mt-0.5 text-[10px] text-[#64748B]">
                    {verificationCount}{t("2Completed")}</p>

                </div>

                <span className="text-xs font-bold text-[#087DB5]">
                  {progress}%
                </span>

              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-[#E5EDF2]">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#063D63] via-[#087DB5] to-[#10B8A8] transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                  }}
                />

              </div>

            </div>


            {/* =================================================
                EMAIL
            ================================================= */}

            {currentStep === "email" && (
              <div
                className={`rounded-xl border p-4 transition-all ${
                  emailVerified
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-[#DDE8EF] bg-white"
                }`}
              >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    emailVerified
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-[#E8F6FA] text-[#087DB5]"
                  }`}
                >
                  {emailVerified ? (
                    <CheckIcon />
                  ) : (
                    <MailIcon />
                  )}
                </div>


                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-2">

                    <h2 className="text-sm font-bold text-[#102A43] sm:text-[15px]">
                      {t("emailVerification")}</h2>

                    {emailVerified && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        <CheckIcon />
                        {t("verified")}</span>
                    )}

                  </div>

                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                    {emailVerified
                      ? "Email address verified successfully."
                      : `Code sent to ${maskEmail(email)}`}
                  </p>

                </div>

              </div>


              {!emailVerified && (
                <div className="mt-3">

                  <label
                    htmlFor="emailOtp"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]"
                  >
                    {t("enter6digitCode")}</label>


                  <input
                    id="emailOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={emailOtp}
                    onChange={(e) => {
                      setEmailOtp(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      );

                      setEmailError("");
                    }}
                    placeholder="••••••"
                    className={`h-11 w-full rounded-lg border bg-[#F8FBFD] px-3 text-center text-lg font-semibold tracking-[0.5em] text-[#102A43] outline-none transition placeholder:text-[#B8C7D4] focus:bg-white focus:ring-2 ${
                      emailError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                        : "border-[#D7E4EE] focus:border-[#10A9D1] focus:ring-[#10A9D1]/10"
                    }`}
                  />


                  {emailError && (
                    <p className="mt-1.5 text-[10px] font-medium text-red-500">
                      {emailError}
                    </p>
                  )}


                  {/* RESEND / TIMER */}

                  <div className="mt-2 flex items-center justify-between gap-3">

                    <span className="text-[10px] text-[#64748B]">
                      {t("didnapostReceiveTheCode")}</span>

                    {emailTimer > 0 ? (
                      <span className="text-[10px] font-semibold text-[#94A3B8]">
                        {t("resendOtpIn")}{" "}
                        <span className="text-[#087DB5]">
                          {formatTimer(
                            emailTimer
                          )}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleResendEmail
                        }
                        disabled={
                          emailResending
                        }
                        className="text-[10px] font-bold text-[#087DB5] transition hover:text-[#08AFA3] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {emailResending
                          ? "Sending..."
                          : "Resend OTP"}
                      </button>
                    )}

                  </div>

                  {emailOtpSecondsLeft > 0 && (
                    <p className="mt-1.5 text-[10px] text-[#64748B]">
                      {t("otpExpiresIn")}{" "}
                      <span className="font-semibold text-[#087DB5]">
                        {formatTimer(emailOtpSecondsLeft)}
                      </span>
                    </p>
                  )}

                  {/* VERIFY BUTTON */}

                  <button
                    type="button"
                    onClick={
                      handleEmailVerify
                    }
                    disabled={
                      emailLoading
                    }
                    className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#063D63] via-[#087DB5] to-[#10A9D1] text-xs font-bold text-white shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {emailLoading ? (
                      <>
                        <LoaderIcon />
                        {t("verifyingEmail")}</>
                    ) : (
                      <>
                        {t("verifyEmail")}<ArrowIcon />
                      </>
                    )}

                  </button>

                  <button
                    type="button"
                    onClick={handleSkipEmail}
                    disabled={emailLoading}
                    className="mt-2 w-full text-xs font-semibold text-[#64748B] transition hover:text-[#087DB5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("skipForNow")}</button>

                </div>
              )}

            </div>
            )}


            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="flex items-center gap-3 py-3">

              <div className="h-px flex-1 bg-[#E5EDF2]" />

              <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {t("next")}</span>

              <div className="h-px flex-1 bg-[#E5EDF2]" />

            </div>


            {/* =================================================
                PHONE
            ================================================= */}

            {currentStep === "phone" && (
              <button
                type="button"
                onClick={handleBackToEmail}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] transition hover:text-[#087DB5]"
              >
                <span aria-hidden="true">←</span>
                {t("backToEmailVerification")}</button>
            )}

            {currentStep === "phone" && (
              <div
                className={`rounded-xl border p-4 transition-all ${
                  phoneVerified
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-[#DDE8EF] bg-white"
                }`}
              >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    phoneVerified
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-[#E8F6FA] text-[#087DB5]"
                  }`}
                >
                  {phoneVerified ? (
                    <CheckIcon />
                  ) : (
                    <PhoneIcon />
                  )}
                </div>


                <div className="min-w-0 flex-1">

                  <div className="flex items-center justify-between gap-2">

                    <h2 className="text-sm font-bold text-[#102A43] sm:text-[15px]">
                      {t("phoneVerification")}</h2>

                    {phoneVerified && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        <CheckIcon />
                        {t("verified")}</span>
                    )}

                  </div>

                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                    {phoneVerified
                      ? "Phone number verified successfully."
                      : `SMS code sent to ${maskPhone(phone)}`}
                  </p>

                </div>

              </div>


              {!phoneVerified && (
                <div className="mt-3">

                  <label
                    htmlFor="phoneOtp"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]"
                  >
                    {t("enter6digitCode")}</label>


                  <input
                    id="phoneOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={phoneOtp}
                    onChange={(e) => {
                      setPhoneOtp(
                        e.target.value.replace(
                          /\D/g,
                          ""
                        )
                      );

                      setPhoneError("");
                    }}
                    placeholder="••••••"
                    className={`h-11 w-full rounded-lg border bg-[#F8FBFD] px-3 text-center text-lg font-semibold tracking-[0.5em] text-[#102A43] outline-none transition placeholder:text-[#B8C7D4] focus:bg-white focus:ring-2 ${
                      phoneError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                        : "border-[#D7E4EE] focus:border-[#10A9D1] focus:ring-[#10A9D1]/10"
                    }`}
                  />


                  {phoneError && (
                    <p className="mt-1.5 text-[10px] font-medium text-red-500">
                      {phoneError}
                    </p>
                  )}


                  {/* RESEND / TIMER */}

                  <div className="mt-2 flex items-center justify-between gap-3">

                    <span className="text-[10px] text-[#64748B]">
                      {t("didnapostReceiveTheCode")}</span>

                    {phoneTimer > 0 ? (
                      <span className="text-[10px] font-semibold text-[#94A3B8]">
                        {t("resendOtpIn")}{" "}
                        <span className="text-[#087DB5]">
                          {formatTimer(
                            phoneTimer
                          )}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleResendPhone
                        }
                        disabled={
                          phoneResending
                        }
                        className="text-[10px] font-bold text-[#087DB5] transition hover:text-[#08AFA3] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {phoneResending
                          ? "Sending..."
                          : "Resend OTP"}
                      </button>
                    )}

                  </div>

                  {phoneOtpSecondsLeft > 0 && (
                    <p className="mt-1.5 text-[10px] text-[#64748B]">
                      {t("otpExpiresIn")}{" "}
                      <span className="font-semibold text-[#087DB5]">
                        {formatTimer(phoneOtpSecondsLeft)}
                      </span>
                    </p>
                  )}

                  {/* VERIFY BUTTON */}

                  <button
                    type="button"
                    onClick={
                      handlePhoneVerify
                    }
                    disabled={
                      phoneLoading
                    }
                    className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#087DB5] to-[#10B8A8] text-xs font-bold text-white shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {phoneLoading ? (
                      <>
                        <LoaderIcon />
                        {t("verifyingPhone")}</>
                    ) : (
                      <>
                        {t("verifyPhone")}<ArrowIcon />
                      </>
                    )}

                  </button>

                  <button
                    type="button"
                    onClick={handleSkipPhone}
                    disabled={phoneLoading}
                    className="mt-2 w-full text-xs font-semibold text-[#64748B] transition hover:text-[#087DB5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("skipForNow")}</button>

                </div>
              )}

            </div>
            )}


            {/* =================================================
                SUCCESS
            ================================================= */}

            {isVerificationComplete && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">

                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckIcon />
                </div>

                <h2 className="mt-2 text-base font-bold text-emerald-900">
                  {t("verificationComplete")}</h2>

                <p className="mt-1 text-xs text-emerald-700">
                  {isFullyVerified
                    ? "Your email and phone number have both been verified successfully."
                    : "At least one verification method has been successfully verified. You can continue to login."
                  }
                </p>

                <button
                  type="button"
                  onClick={
                    handleContinue
                  }
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-bold text-white transition hover:bg-emerald-700 sm:w-auto sm:min-w-[190px]"
                >
                  {t("continueToLogin")}<ArrowIcon />
                </button>

              </div>
            )}

            {verificationMessage && !isVerificationComplete && (
              <p className="mt-3 text-center text-xs font-medium text-red-500">
                {verificationMessage}
              </p>
            )}

          </div>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-[#64748B]">

            <LockIcon />

            <span>
              {t("yourVerificationInformationIs")}</span>

          </div>

        </div>

      </div>

    </main>
  );
}