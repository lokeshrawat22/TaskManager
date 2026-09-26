import { Resend } from "resend";
import nodemailer from "nodemailer";
import { maskEmail } from "../utils/masking.js";

// =====================================================
// ENVIRONMENT & CREDENTIAL RESOLUTION
// =====================================================

// Prefer official RESEND_API_KEY, fallback to SMTP_PASS for backward compatibility
const resendApiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || "").trim();
const emailFrom = (process.env.RESEND_FROM || process.env.SMTP_FROM || "").trim();

// Transport mode: "resend" (default, production-safe REST API) or "smtp" (fallback)
const emailTransport = (process.env.EMAIL_TRANSPORT || "resend").toLowerCase();

// SMTP Fallback configuration
const smtpHost = process.env.SMTP_HOST || "smtp.resend.com";
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpUser = process.env.SMTP_USER || "resend";
const smtpPass = process.env.SMTP_PASS || resendApiKey;

// =====================================================
// CLIENT INITIALIZATION & STARTUP DIAGNOSTICS
// =====================================================

let resendClient: Resend | null = null;
let smtpTransporter: nodemailer.Transporter | null = null;

if (!resendApiKey) {
  console.warn(
    "[EMAIL_CONFIG_WARN] Missing RESEND_API_KEY / SMTP_PASS in environment. Email sending will fail until configured."
  );
}

if (!emailFrom) {
  console.warn(
    "[EMAIL_CONFIG_WARN] Missing RESEND_FROM / SMTP_FROM in environment. Defaulting to Resend sandbox or required domain."
  );
}

if (emailTransport === "smtp") {
  // console.log(`[EMAIL_STARTUP] Using SMTP transport (${smtpHost}:${smtpPort}) with standard TLS verification.`);
  smtpTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Production requirement: strict certificate validation, never bypass TLS
    tls: {
      rejectUnauthorized: true,
    },
  });

  smtpTransporter.verify((error) => {
    if (error) {
      console.error(
        "[EMAIL_STARTUP_ERROR] Resend SMTP connection failed:",
        error.message
      );
    } else {
      console.log("[EMAIL_STARTUP] Resend SMTP connection verified successfully.");
    }
  });
} else {
  // Default: Official Resend SDK via HTTPS REST API (port 443)
  // Immunized against local AV/proxy SMTP socket interception, TLS compliant
  if (resendApiKey) {
    resendClient = new Resend(resendApiKey);

    // Asynchronously verify API connectivity on startup
    resendClient.domains
      .list()
      .then((res) => {
        if (res.error) {
          console.error("[EMAIL_STARTUP_WARN] Resend API key validation issue:", {
            name: res.error.name,
            message: res.error.message,
          });
        } else {
          const verifiedDomains = res.data?.data
            ?.filter((d) => d.status === "verified")
            ?.map((d) => d.name);
          console.log(
            `[EMAIL_STARTUP] Resend official API client ready. Verified domain(s): [${
              verifiedDomains && verifiedDomains.length > 0
                ? verifiedDomains.join(", ")
                : "none / sandbox"
            }].`
          );
        }
      })
      .catch((err) => {
        console.error(
          "[EMAIL_STARTUP_WARN] Resend API reachability check failed:",
          err instanceof Error ? err.message : String(err)
        );
      });
  }
}

// =====================================================
// ERROR CLASSIFIER & SAFE LOGGER
// =====================================================

export interface ClassifiedEmailError {
  category:
    | "CONFIGURATION_ERROR"
    | "AUTHENTICATION_ERROR"
    | "DOMAIN_VERIFICATION_ERROR"
    | "RATE_LIMIT_ERROR"
    | "TLS_NETWORK_ERROR"
    | "PROVIDER_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  originalName?: string;
}

export function classifyEmailError(err: unknown): ClassifiedEmailError {
  if (!err) {
    return { category: "UNKNOWN_ERROR", message: "An unknown email delivery error occurred." };
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  const rawName = err instanceof Error ? err.name : "";
  const code = (err as any)?.code || "";

  // 1. Missing credentials
  if (
    rawMessage.includes("missing") ||
    rawMessage.includes("Missing API key") ||
    rawMessage.includes("missing_api_key")
  ) {
    return {
      category: "CONFIGURATION_ERROR",
      message: "Email service is not configured with a valid API key or sender address.",
      originalName: rawName || "ConfigurationError",
    };
  }

  // 2. Authentication failure
  if (
    rawMessage.includes("401") ||
    rawMessage.includes("unauthorized") ||
    rawMessage.includes("Invalid API key") ||
    rawMessage.includes("restricted_api_key")
  ) {
    return {
      category: "AUTHENTICATION_ERROR",
      message: "Authentication failed with email provider. Verify API key credentials.",
      originalName: rawName || "AuthenticationError",
    };
  }

  // 3. Domain or sender verification
  if (
    rawMessage.includes("domain") ||
    rawMessage.includes("not verified") ||
    rawMessage.includes("validation_error") ||
    rawMessage.includes("from")
  ) {
    return {
      category: "DOMAIN_VERIFICATION_ERROR",
      message: "The configured sender email domain is unverified or rejected by Resend.",
      originalName: rawName || "DomainVerificationError",
    };
  }

  // 4. Rate limiting
  if (rawMessage.includes("429") || rawMessage.includes("rate_limit_exceeded")) {
    return {
      category: "RATE_LIMIT_ERROR",
      message: "Email provider rate limit exceeded. Please retry after a cooldown period.",
      originalName: rawName || "RateLimitError",
    };
  }

  // 5. TLS / Network / Socket
  if (
    code === "ESOCKET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    rawMessage.includes("self-signed certificate") ||
    rawMessage.includes("certificate") ||
    rawMessage.includes("TLS")
  ) {
    return {
      category: "TLS_NETWORK_ERROR",
      message: "Network or TLS connection failure while reaching email provider.",
      originalName: code || rawName || "TlsNetworkError",
    };
  }

  // 6. Resend Provider 5xx
  return {
    category: "PROVIDER_ERROR",
    message: `Email provider error: ${rawMessage}`,
    originalName: rawName || "ProviderError",
  };
}

// =====================================================
// GENERIC EMAIL SENDER (RESEND API WITH SMTP FALLBACK)
// =====================================================

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendMailResult {
  messageId: string;
  id: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendMailParams): Promise<SendMailResult> {
  const recipientMasked = maskEmail(to);
  const senderAddress = from || emailFrom;

  if (!senderAddress) {
    const error = new Error("No sender email address configured (RESEND_FROM or SMTP_FROM).");
    console.error("[EMAIL_SEND_ERROR] Configuration error:", error.message);
    throw error;
  }

  if (process.env.NODE_ENV === "test" || to.endsWith("@example.com") || to.endsWith("@test.com")) {
    console.log(`[EMAIL_TEST_MODE] Simulating send to ${recipientMasked}`);
    return { messageId: `test-msg-${Date.now()}`, id: "test-id" };
  }

  // Option A: SMTP transport fallback if explicitly selected
  if (emailTransport === "smtp" && smtpTransporter) {
    try {
      console.log(`[EMAIL] Sending email via SMTP to: ${recipientMasked}`);
      const info = await smtpTransporter.sendMail({
        from: senderAddress,
        to,
        subject,
        html,
        text,
      });

      console.log(`[EMAIL] Email sent successfully via SMTP. Message ID: ${info.messageId}`);
      return {
        messageId: info.messageId,
        id: info.messageId,
      };
    } catch (err) {
      const classified = classifyEmailError(err);
      console.error("[EMAIL_SEND_ERROR] SMTP delivery failed:", {
        recipient: recipientMasked,
        category: classified.category,
        error: classified.message,
      });
      throw err;
    }
  }

  // Option B: Official Resend Node SDK (Default, Production Recommended)
  if (!resendApiKey) {
    const error = new Error("Resend API key is missing. Please configure RESEND_API_KEY.");
    console.error("[EMAIL_SEND_ERROR] Configuration error:", error.message);
    throw error;
  }

  const client = resendClient || new Resend(resendApiKey);

  try {
    console.log(`[EMAIL] Sending email via Resend official API to: ${recipientMasked}`);
    const response = await client.emails.send({
      from: senderAddress,
      to,
      subject,
      html,
      text,
    });

    if (response.error) {
      const classified = classifyEmailError(response.error);
      console.error("[EMAIL_SEND_ERROR] Resend API rejected message:", {
        recipient: recipientMasked,
        category: classified.category,
        errorName: response.error.name,
        errorMessage: response.error.message,
      });
      throw new Error(`Resend email delivery failed [${response.error.name}]: ${response.error.message}`);
    }

    const messageId = response.data?.id || "unknown";
    console.log(`[EMAIL] Email sent successfully via Resend API. ID: ${messageId}`);

    return {
      messageId,
      id: messageId,
    };
  } catch (err) {
    const classified = classifyEmailError(err);
    console.error("[EMAIL_SEND_ERROR] Resend API exception:", {
      recipient: recipientMasked,
      category: classified.category,
      error: classified.message,
    });
    throw err;
  }
}

// =====================================================
// EXPORTED EMAIL HANDLERS (EXACT INTERFACE PRESERVED)
// =====================================================

export const sendEmailOtp = async (
  email: string,
  firstName: string,
  otp: string
): Promise<SendMailResult> => {
  const subject = "MindMatrix - Email Verification Code";
  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
      "
    >
      <h2>Verify your MindMatrix account</h2>
      <p>Hello ${firstName},</p>
      <p>Your email verification code is:</p>
      <div
        style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 25px 0;
        "
      >
        ${otp}
      </div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not create this account, you can safely ignore this email.</p>
      <br />
      <p>
        Regards,<br />
        <strong>MindMatrix Team</strong>
      </p>
    </div>
  `;

  const text = `Hello ${firstName},\n\nYour MindMatrix email verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nRegards,\nMindMatrix Team`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};

export const sendPasswordResetOtp = async (
  email: string,
  firstName: string,
  otp: string
): Promise<SendMailResult> => {
  const subject = "MindMatrix - Password Reset Code";
  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        color: #1e293b;
      "
    >
      <h2>Reset your MindMatrix password</h2>
      <p>Hello ${firstName},</p>
      <p>We received a request to reset your MindMatrix account password.</p>
      <p>Your password reset code is:</p>
      <div
        style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 25px 0;
        "
      >
        ${otp}
      </div>
      <p>This code will expire in <strong>10 minutes</strong>.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
      <br />
      <p>
        Regards,<br />
        <strong>MindMatrix Team</strong>
      </p>
    </div>
  `;

  const text = `Hello ${firstName},\n\nYour MindMatrix password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nRegards,\nMindMatrix Team`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};