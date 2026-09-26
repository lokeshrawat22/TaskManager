import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendEmailOtp } from "../services/email.service.js";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/twilio.service.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../utils/otp.js";
import { maskEmail, maskPhone } from "../utils/masking.js";
import { auditLog } from "../utils/auditLogger.js";

// =====================================================
// UTILITY HELPERS
// =====================================================

const normalizeEmail = (email: string): string => String(email).trim().toLowerCase();
const normalizePhone = (phone: string): string => String(phone).trim();

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
};

const formatFullPhone = (phone: string, countryCode?: string): string => {
  let cleanPhone = phone.trim();
  let cleanCC = (countryCode || "+91").trim();
  if (cleanCC && !cleanCC.startsWith("+")) {
    cleanCC = `+${cleanCC}`;
  }
  if (cleanPhone.startsWith("+")) {
    return cleanPhone;
  }
  return `${cleanCC}${cleanPhone}`;
};

const userResponse = (user: any) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  country: user.country,
  countryCode: user.countryCode,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  qualification: user.qualification,
  role: user.role,
  employeeId: user.employeeId,
  department: user.department,
  designation: user.designation,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  profilePhoto: user.profilePhoto,
});

const checkCooldown = (res: Response, availableAt?: Date): boolean => {
  if (!availableAt || availableAt.getTime() <= Date.now()) {
    return false;
  }
  const waitSec = Math.ceil((availableAt.getTime() - Date.now()) / 1000);
  res.status(429).json({
    success: false,
    code: "RESEND_COOLDOWN",
    message: `Please wait ${waitSec} seconds before requesting another code.`,
    data: { retryAfterSeconds: waitSec },
  });
  return true;
};

// =====================================================
// CHANGE EMAIL CONTROLLERS
// =====================================================

/**
 * GET /api/auth/change-email/pending-status
 * Restores or inspects an active change-email challenge session
 */
export const getChangeEmailPendingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { challengeId } = req.query;

    const user = await User.findById(userId).select(
      "+emailChangeChallengeId +emailChangeChallengeExpiresAt +emailChangeStep +emailChangeResendAvailableAt +emailChangeCrossToken +emailChangeCrossTokenExpiresAt +pendingEmail"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.emailChangeChallengeId && !user.pendingEmail && !user.emailChangeCrossToken) {
      res.status(200).json({ hasPending: false });
      return;
    }

    if (challengeId && user.emailChangeChallengeId && user.emailChangeChallengeId !== challengeId) {
      res.status(200).json({ hasPending: false });
      return;
    }

    const isExpired = Boolean(
      user.emailChangeChallengeExpiresAt &&
      user.emailChangeChallengeExpiresAt.getTime() < Date.now()
    );

    res.status(200).json({
      hasPending: true,
      isExpired,
      step: user.emailChangeStep || 1,
      challengeId: user.emailChangeChallengeId,
      maskedContact: maskPhone(user.phone || "", user.countryCode || "+91"),
      pendingEmail: user.pendingEmail || "",
      crossVerificationToken: user.emailChangeCrossToken || undefined,
      resendAvailableAt: user.emailChangeResendAvailableAt
        ? user.emailChangeResendAvailableAt.getTime()
        : 0,
      expiresAt: user.emailChangeChallengeExpiresAt
        ? user.emailChangeChallengeExpiresAt.getTime()
        : 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/initiate-cross-verification
 * Step 1: Validates the new email address, ensures partner (phone) is verified,
 * and sends cross-verification OTP to registered mobile number.
 */
export const initiateChangeEmailCrossVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select(
      "+crossOtpResendAvailableAt +emailChangeChallengeId +emailChangeCrossPhoneOtp +emailChangeCrossPhoneOtpExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Security Rule: Existing mobile number must be verified to cross-verify email change
    if (!user.isPhoneVerified || !user.phone) {
      res.status(400).json({
        success: false,
        code: "PARTNER_NOT_VERIFIED",
        message: "Please verify your mobile number before changing your email address.",
      });
      return;
    }

    // Check cooldown
    if (checkCooldown(res, user.crossOtpResendAvailableAt)) {
      return;
    }

    const { newEmail } = req.body;
    if (newEmail) {
      const normalizedNewEmail = normalizeEmail(newEmail);
      if (!isValidEmail(normalizedNewEmail)) {
        res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
        return;
      }

      if (normalizedNewEmail === user.email.toLowerCase()) {
        res.status(400).json({
          success: false,
          message: "New email cannot be the same as your current email.",
        });
        return;
      }

      // Check if new email is already taken by another account
      const existing = await User.findOne({
        email: normalizedNewEmail,
        _id: { $ne: user._id },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: "This email address is already in use by another account.",
        });
        return;
      }

      user.pendingEmail = normalizedNewEmail;
    }

    const challengeId = crypto.randomUUID();
    const phoneOtp = generateOtp();

    user.emailChangeCrossPhoneOtp = hashOtp(phoneOtp);
    user.emailChangeCrossPhoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.emailChangeChallengeId = challengeId;
    user.emailChangeChallengeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.emailChangeStep = 2; // Step 1 is new email entry; Step 2 is existing partner OTP verification
    user.crossOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
    user.emailChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    // Send SMS OTP to user's registered phone
    const fullPhone = formatFullPhone(user.phone, user.countryCode);
    try {
      await sendPhoneOtp(fullPhone, phoneOtp);
    } catch (smsError) {
      console.error("[CHANGE_EMAIL] Failed to send SMS via primary format, trying plain phone:", smsError);
      try {
        await sendPhoneOtp(user.phone, phoneOtp);
      } catch (err2) {
        console.error("[CHANGE_EMAIL] Failed to send SMS:", err2);
      }
    }

    auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
      userId: user._id.toString(),
      userEmail: user.email,
      details: { action: "Initiated change email cross-verification" },
    });

    res.status(200).json({
      success: true,
      message: "Verification code sent to your registered mobile number",
      challengeId,
      maskedPhone: maskPhone(user.phone, user.countryCode),
      maskedContact: maskPhone(user.phone, user.countryCode),
      resendAvailableAt: user.crossOtpResendAvailableAt.getTime(),
      expiresAt: user.emailChangeChallengeExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/verify-cross-otp
 * Step 2: Verifies the OTP sent to user's registered phone.
 * Upon success, issues crossVerificationToken and automatically sends OTP to new email.
 */
export const verifyChangeEmailCrossOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { otp, challengeId } = req.body;
    if (!otp || String(otp).trim().length < 6) {
      res.status(400).json({
        success: false,
        message: "Please enter the 6-digit verification code.",
      });
      return;
    }

    const user = await User.findById(userId).select(
      "+emailChangeCrossPhoneOtp +emailChangeCrossPhoneOtpExpiresAt +emailChangeChallengeId +emailChangeChallengeExpiresAt +pendingEmail +emailChangeCrossToken +emailChangeCrossTokenExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (challengeId && user.emailChangeChallengeId && user.emailChangeChallengeId !== challengeId) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification session. Please restart.",
      });
      return;
    }

    if (
      !user.emailChangeCrossPhoneOtpExpiresAt ||
      user.emailChangeCrossPhoneOtpExpiresAt.getTime() < Date.now()
    ) {
      res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "Verification code has expired. Please request a new code.",
      });
      return;
    }

    let isApproved = false;
    const cleanOtp = String(otp).trim();

    if (user.emailChangeCrossPhoneOtp) {
      isApproved = verifyOtpHash(cleanOtp, user.emailChangeCrossPhoneOtp);
    }

    if (!isApproved && user.phone) {
      const fullPhone = formatFullPhone(user.phone, user.countryCode);
      try {
        const check = await verifyPhoneOtp(fullPhone, cleanOtp);
        if (check && (check.status === "approved" || (check as any).valid === true)) {
          isApproved = true;
        }
      } catch {
        try {
          const check2 = await verifyPhoneOtp(user.phone, cleanOtp);
          if (check2 && (check2.status === "approved" || (check2 as any).valid === true)) {
            isApproved = true;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!isApproved) {
      res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid verification code. Please check and try again.",
      });
      return;
    }

    // Cross-verification succeeded! Generate secure unguessable 64-char token
    const crossToken = crypto.randomBytes(32).toString("hex");
    user.emailChangeCrossToken = crossToken;
    user.emailChangeCrossTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.emailChangeCrossPhoneOtp = undefined;
    user.emailChangeCrossPhoneOtpExpiresAt = undefined;

    // If new email is already captured, send verification code to it immediately
    if (user.pendingEmail) {
      const newEmailOtp = generateOtp();
      user.pendingEmailOtp = hashOtp(newEmailOtp);
      user.pendingEmailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.emailChangeStep = 3;
      user.emailChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

      await user.save();

      try {
        await sendEmailOtp(user.pendingEmail, user.firstName || "User", newEmailOtp);
      } catch (emailErr) {
        console.error("[CHANGE_EMAIL] Failed to send new email OTP:", emailErr);
      }
    } else {
      user.emailChangeStep = 2;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Mobile number verified successfully",
      crossVerificationToken: crossToken,
      challengeId: user.emailChangeChallengeId,
      maskedEmail: maskEmail(user.pendingEmail || ""),
      resendAvailableAt: Date.now() + 60 * 1000,
      expiresAt: user.emailChangeCrossTokenExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/request
 * Submits or resends OTP to the new email address.
 * Requires valid crossVerificationToken.
 */
export const requestChangeEmailOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { newEmail, crossVerificationToken, challengeId } = req.body;

    const user = await User.findById(userId).select(
      "+emailChangeCrossToken +emailChangeCrossTokenExpiresAt +emailChangeChallengeId +emailChangeResendAvailableAt +pendingEmail"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Enforce cross-verification token
    if (
      !crossVerificationToken ||
      user.emailChangeCrossToken !== crossVerificationToken ||
      !user.emailChangeCrossTokenExpiresAt ||
      user.emailChangeCrossTokenExpiresAt.getTime() < Date.now()
    ) {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Cross-verification token has expired or is invalid. Please restart the process.",
      });
      return;
    }

    const targetEmail = (newEmail || user.pendingEmail || "").trim().toLowerCase();
    if (!isValidEmail(targetEmail)) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
      return;
    }

    if (targetEmail === user.email.toLowerCase()) {
      res.status(400).json({
        success: false,
        message: "New email cannot be the same as your current email.",
      });
      return;
    }

    const duplicate = await User.findOne({
      email: targetEmail,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: "This email address is already in use by another account.",
      });
      return;
    }

    if (checkCooldown(res, user.emailChangeResendAvailableAt)) {
      return;
    }

    const emailOtp = generateOtp();
    user.pendingEmail = targetEmail;
    user.pendingEmailOtp = hashOtp(emailOtp);
    user.pendingEmailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.emailChangeStep = 3;
    user.emailChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    await sendEmailOtp(targetEmail, user.firstName || "User", emailOtp);

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${targetEmail}`,
      challengeId: user.emailChangeChallengeId || challengeId,
      maskedEmail: maskEmail(targetEmail),
      resendAvailableAt: user.emailChangeResendAvailableAt.getTime(),
      expiresAt: user.pendingEmailOtpExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/verify
 * Step 3: Verifies OTP sent to the new email and applies the email change.
 * Requires valid crossVerificationToken and correct OTP.
 */
export const verifyAndUpdateEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { newEmail, otp, crossVerificationToken } = req.body;

    if (!otp || String(otp).trim().length < 6) {
      res.status(400).json({
        success: false,
        message: "Please enter the 6-digit verification code.",
      });
      return;
    }

    const user = await User.findById(userId).select(
      "+pendingEmail +pendingEmailOtp +pendingEmailOtpExpiresAt +emailChangeCrossToken +emailChangeCrossTokenExpiresAt +emailChangeChallengeId"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check cross-verification token
    if (
      !crossVerificationToken ||
      user.emailChangeCrossToken !== crossVerificationToken ||
      !user.emailChangeCrossTokenExpiresAt ||
      user.emailChangeCrossTokenExpiresAt.getTime() < Date.now()
    ) {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Cross-verification has expired or is invalid. Please restart the process.",
      });
      return;
    }

    const cleanNewEmail = normalizeEmail(newEmail || user.pendingEmail || "");
    if (!cleanNewEmail || cleanNewEmail !== normalizeEmail(user.pendingEmail || "")) {
      res.status(400).json({
        success: false,
        message: "Email address mismatch. Please request a new verification code.",
      });
      return;
    }

    if (
      !user.pendingEmailOtp ||
      !user.pendingEmailOtpExpiresAt ||
      user.pendingEmailOtpExpiresAt.getTime() < Date.now()
    ) {
      res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "Verification code has expired. Please request a new code.",
      });
      return;
    }

    const isMatch = verifyOtpHash(String(otp).trim(), user.pendingEmailOtp);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid verification code. Please check and try again.",
      });
      return;
    }

    // Final duplicate check before committing change
    const duplicate = await User.findOne({
      email: cleanNewEmail,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: "This email address is already in use by another account.",
      });
      return;
    }

    const previousEmail = user.email;
    user.email = cleanNewEmail;
    user.isEmailVerified = true;

    // Clean up pending and challenge fields
    user.set("pendingEmail", undefined);
    user.set("pendingEmailOtp", undefined);
    user.set("pendingEmailOtpExpiresAt", undefined);
    user.set("emailChangeCrossToken", undefined);
    user.set("emailChangeCrossTokenExpiresAt", undefined);
    user.set("emailChangeCrossPhoneOtp", undefined);
    user.set("emailChangeCrossPhoneOtpExpiresAt", undefined);
    user.set("emailChangeChallengeId", undefined);
    user.set("emailChangeChallengeExpiresAt", undefined);
    user.set("emailChangeStep", undefined);
    user.set("emailChangeResendAvailableAt", undefined);
    user.set("crossOtpResendAvailableAt", undefined);

    await user.save();

    auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
      userId: user._id.toString(),
      userEmail: user.email,
      details: {
        action: "Email address changed and verified",
        previousEmail,
        newEmail: user.email,
      },
    });

    res.status(200).json({
      success: true,
      message: "Email address updated and verified successfully",
      data: {
        email: user.email,
        isEmailVerified: true,
        user: userResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/resend-cross-otp
 * Resends the verification code to the registered mobile number during cross-verification.
 */
export const resendChangeEmailCrossOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select(
      "+crossOtpResendAvailableAt +emailChangeChallengeId +emailChangeCrossPhoneOtp +emailChangeCrossPhoneOtpExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.isPhoneVerified || !user.phone) {
      res.status(400).json({
        success: false,
        message: "Mobile number is not verified.",
      });
      return;
    }

    if (checkCooldown(res, user.crossOtpResendAvailableAt)) {
      return;
    }

    const phoneOtp = generateOtp();
    user.emailChangeCrossPhoneOtp = hashOtp(phoneOtp);
    user.emailChangeCrossPhoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.crossOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
    user.emailChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    const fullPhone = formatFullPhone(user.phone, user.countryCode);
    try {
      await sendPhoneOtp(fullPhone, phoneOtp);
    } catch {
      try {
        await sendPhoneOtp(user.phone, phoneOtp);
      } catch (err2) {
        console.error("[CHANGE_EMAIL] Failed to resend SMS:", err2);
      }
    }

    res.status(200).json({
      success: true,
      message: "Verification code resent to your registered mobile number",
      maskedPhone: maskPhone(user.phone, user.countryCode),
      challengeId: user.emailChangeChallengeId,
      resendAvailableAt: user.crossOtpResendAvailableAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-email/cancel
 * Cancels any active change email session and cleans up pending challenge state.
 */
export const cancelChangeEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          pendingEmail: "",
          pendingEmailOtp: "",
          pendingEmailOtpExpiresAt: "",
          emailChangeCrossToken: "",
          emailChangeCrossTokenExpiresAt: "",
          emailChangeCrossPhoneOtp: "",
          emailChangeCrossPhoneOtpExpiresAt: "",
          emailChangeChallengeId: "",
          emailChangeChallengeExpiresAt: "",
          emailChangeStep: "",
          emailChangeResendAvailableAt: "",
          crossOtpResendAvailableAt: "",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Change email challenge cancelled",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// CHANGE PHONE CONTROLLERS
// =====================================================

/**
 * GET /api/auth/change-phone/pending-status
 * Restores or inspects an active change-phone challenge session
 */
export const getChangePhonePendingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { challengeId } = req.query;

    const user = await User.findById(userId).select(
      "+phoneChangeChallengeId +phoneChangeChallengeExpiresAt +phoneChangeStep +phoneChangeResendAvailableAt +phoneChangeCrossToken +phoneChangeCrossTokenExpiresAt +pendingPhone +pendingCountryCode"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.phoneChangeChallengeId && !user.pendingPhone && !user.phoneChangeCrossToken) {
      res.status(200).json({ hasPending: false });
      return;
    }

    if (challengeId && user.phoneChangeChallengeId && user.phoneChangeChallengeId !== challengeId) {
      res.status(200).json({ hasPending: false });
      return;
    }

    const isExpired = Boolean(
      user.phoneChangeChallengeExpiresAt &&
      user.phoneChangeChallengeExpiresAt.getTime() < Date.now()
    );

    res.status(200).json({
      hasPending: true,
      isExpired,
      step: user.phoneChangeStep || 1,
      challengeId: user.phoneChangeChallengeId,
      maskedContact: maskEmail(user.email || ""),
      pendingPhone: user.pendingPhone || "",
      pendingCountryCode: user.pendingCountryCode || "+91",
      crossVerificationToken: user.phoneChangeCrossToken || undefined,
      resendAvailableAt: user.phoneChangeResendAvailableAt
        ? user.phoneChangeResendAvailableAt.getTime()
        : 0,
      expiresAt: user.phoneChangeChallengeExpiresAt
        ? user.phoneChangeChallengeExpiresAt.getTime()
        : 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/initiate-cross-verification
 * Step 1: Validates the new mobile number, ensures partner (email) is verified,
 * and sends cross-verification OTP to registered email address.
 */
export const initiateChangePhoneCrossVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select(
      "+crossOtpResendAvailableAt +phoneChangeChallengeId +phoneChangeCrossEmailOtp +phoneChangeCrossEmailOtpExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Security Rule: Existing email address must be verified to cross-verify phone change
    if (!user.isEmailVerified || !user.email) {
      res.status(400).json({
        success: false,
        code: "PARTNER_NOT_VERIFIED",
        message: "Please verify your email address before changing your mobile number.",
      });
      return;
    }

    // Check cooldown
    if (checkCooldown(res, user.crossOtpResendAvailableAt)) {
      return;
    }

    const { newPhone, countryCode } = req.body;
    if (newPhone) {
      const cleanPhone = normalizePhone(newPhone);
      const cleanCC = countryCode ? String(countryCode).trim() : user.countryCode || "+91";

      if (!isValidPhone(cleanPhone)) {
        res.status(400).json({
          success: false,
          message: "Please enter a valid mobile number.",
        });
        return;
      }

      if (cleanPhone === user.phone) {
        res.status(400).json({
          success: false,
          message: "New number cannot be the same as your current number.",
        });
        return;
      }

      const duplicate = await User.findOne({
        phone: cleanPhone,
        _id: { $ne: user._id },
      });

      if (duplicate) {
        res.status(400).json({
          success: false,
          message: "This mobile number is already in use by another account.",
        });
        return;
      }

      user.pendingPhone = cleanPhone;
      user.pendingCountryCode = cleanCC;
    }

    const challengeId = crypto.randomUUID();
    const emailOtp = generateOtp();

    user.phoneChangeCrossEmailOtp = hashOtp(emailOtp);
    user.phoneChangeCrossEmailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.phoneChangeChallengeId = challengeId;
    user.phoneChangeChallengeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.phoneChangeStep = 2; // Step 1 is new phone entry; Step 2 is existing email OTP verification
    user.crossOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
    user.phoneChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    await sendEmailOtp(user.email, user.firstName || "User", emailOtp);

    auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
      userId: user._id.toString(),
      userEmail: user.email,
      details: { action: "Initiated change phone cross-verification" },
    });

    res.status(200).json({
      success: true,
      message: "Verification code sent to your registered email address",
      challengeId,
      maskedEmail: maskEmail(user.email),
      maskedContact: maskEmail(user.email),
      resendAvailableAt: user.crossOtpResendAvailableAt.getTime(),
      expiresAt: user.phoneChangeChallengeExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/verify-cross-otp
 * Step 2: Verifies OTP sent to user's registered email.
 * Upon success, issues crossVerificationToken and automatically sends SMS OTP to new phone.
 */
export const verifyChangePhoneCrossOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { otp, challengeId } = req.body;
    if (!otp || String(otp).trim().length < 6) {
      res.status(400).json({
        success: false,
        message: "Please enter the 6-digit verification code.",
      });
      return;
    }

    const user = await User.findById(userId).select(
      "+phoneChangeCrossEmailOtp +phoneChangeCrossEmailOtpExpiresAt +phoneChangeChallengeId +phoneChangeChallengeExpiresAt +pendingPhone +pendingCountryCode +phoneChangeCrossToken +phoneChangeCrossTokenExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (challengeId && user.phoneChangeChallengeId && user.phoneChangeChallengeId !== challengeId) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification session. Please restart.",
      });
      return;
    }

    if (
      !user.phoneChangeCrossEmailOtp ||
      !user.phoneChangeCrossEmailOtpExpiresAt ||
      user.phoneChangeCrossEmailOtpExpiresAt.getTime() < Date.now()
    ) {
      res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "Verification code has expired. Please request a new code.",
      });
      return;
    }

    const isMatch = verifyOtpHash(String(otp).trim(), user.phoneChangeCrossEmailOtp);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid verification code. Please check and try again.",
      });
      return;
    }

    // Cross-verification token
    const crossToken = crypto.randomBytes(32).toString("hex");
    user.phoneChangeCrossToken = crossToken;
    user.phoneChangeCrossTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.phoneChangeCrossEmailOtp = undefined;
    user.phoneChangeCrossEmailOtpExpiresAt = undefined;

    // If new phone was already provided, send SMS OTP to it immediately
    if (user.pendingPhone) {
      const phoneOtp = generateOtp();
      user.pendingPhoneOtp = hashOtp(phoneOtp);
      user.pendingPhoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.phoneChangeStep = 3;
      user.phoneChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

      await user.save();

      const fullPendingPhone = formatFullPhone(user.pendingPhone, user.pendingCountryCode);
      try {
        await sendPhoneOtp(fullPendingPhone, phoneOtp);
      } catch {
        try {
          await sendPhoneOtp(user.pendingPhone, phoneOtp);
        } catch (err2) {
          console.error("[CHANGE_PHONE] Failed to send SMS to new phone:", err2);
        }
      }
    } else {
      user.phoneChangeStep = 2;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Email address verified successfully",
      crossVerificationToken: crossToken,
      challengeId: user.phoneChangeChallengeId,
      maskedPhone: maskPhone(user.pendingPhone || "", user.pendingCountryCode || "+91"),
      resendAvailableAt: Date.now() + 60 * 1000,
      expiresAt: user.phoneChangeCrossTokenExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/request
 * Submits or resends OTP to the new phone number.
 * Requires valid crossVerificationToken.
 */
export const requestChangePhoneOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { newPhone, countryCode, crossVerificationToken, challengeId } = req.body;

    const user = await User.findById(userId).select(
      "+phoneChangeCrossToken +phoneChangeCrossTokenExpiresAt +phoneChangeChallengeId +phoneChangeResendAvailableAt +pendingPhone +pendingCountryCode"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (
      !crossVerificationToken ||
      user.phoneChangeCrossToken !== crossVerificationToken ||
      !user.phoneChangeCrossTokenExpiresAt ||
      user.phoneChangeCrossTokenExpiresAt.getTime() < Date.now()
    ) {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Cross-verification token has expired or is invalid. Please restart the process.",
      });
      return;
    }

    const targetPhone = (newPhone || user.pendingPhone || "").trim();
    const targetCC = (countryCode || user.pendingCountryCode || "+91").trim();

    if (!isValidPhone(targetPhone)) {
      res.status(400).json({
        success: false,
        message: "Please enter a valid mobile number.",
      });
      return;
    }

    if (targetPhone === user.phone) {
      res.status(400).json({
        success: false,
        message: "New number cannot be the same as your current number.",
      });
      return;
    }

    const duplicate = await User.findOne({
      phone: targetPhone,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: "This mobile number is already in use by another account.",
      });
      return;
    }

    if (checkCooldown(res, user.phoneChangeResendAvailableAt)) {
      return;
    }

    const phoneOtp = generateOtp();
    user.pendingPhone = targetPhone;
    user.pendingCountryCode = targetCC;
    user.pendingPhoneOtp = hashOtp(phoneOtp);
    user.pendingPhoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.phoneChangeStep = 3;
    user.phoneChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    const fullTargetPhone = formatFullPhone(targetPhone, targetCC);
    try {
      await sendPhoneOtp(fullTargetPhone, phoneOtp);
    } catch {
      try {
        await sendPhoneOtp(targetPhone, phoneOtp);
      } catch (err2) {
        console.error("[CHANGE_PHONE] Failed to send SMS to new phone:", err2);
      }
    }

    res.status(200).json({
      success: true,
      message: `SMS verification code sent to ${fullTargetPhone}`,
      challengeId: user.phoneChangeChallengeId || challengeId,
      resendAvailableAt: user.phoneChangeResendAvailableAt.getTime(),
      expiresAt: user.pendingPhoneOtpExpiresAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/verify
 * Step 3: Verifies OTP sent to the new mobile number and applies the phone change.
 * Requires valid crossVerificationToken and correct OTP.
 */
export const verifyAndUpdatePhone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { newPhone, otp, crossVerificationToken } = req.body;

    if (!otp || String(otp).trim().length < 6) {
      res.status(400).json({
        success: false,
        message: "Please enter the 6-digit verification code.",
      });
      return;
    }

    const user = await User.findById(userId).select(
      "+pendingPhone +pendingCountryCode +pendingPhoneOtp +pendingPhoneOtpExpiresAt +phoneChangeCrossToken +phoneChangeCrossTokenExpiresAt +phoneChangeChallengeId"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check cross-verification token
    if (
      !crossVerificationToken ||
      user.phoneChangeCrossToken !== crossVerificationToken ||
      !user.phoneChangeCrossTokenExpiresAt ||
      user.phoneChangeCrossTokenExpiresAt.getTime() < Date.now()
    ) {
      res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Cross-verification has expired or is invalid. Please restart the process.",
      });
      return;
    }

    const cleanNewPhone = normalizePhone(newPhone || user.pendingPhone || "");
    if (!cleanNewPhone || cleanNewPhone !== normalizePhone(user.pendingPhone || "")) {
      res.status(400).json({
        success: false,
        message: "Mobile number mismatch. Please request a new verification code.",
      });
      return;
    }

    if (
      !user.pendingPhoneOtp ||
      !user.pendingPhoneOtpExpiresAt ||
      user.pendingPhoneOtpExpiresAt.getTime() < Date.now()
    ) {
      res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "Verification code has expired. Please request a new code.",
      });
      return;
    }

    let isApproved = false;
    const cleanOtp = String(otp).trim();

    if (user.pendingPhoneOtp) {
      isApproved = verifyOtpHash(cleanOtp, user.pendingPhoneOtp);
    }

    if (!isApproved) {
      const fullPhone = formatFullPhone(cleanNewPhone, user.pendingCountryCode);
      try {
        const check = await verifyPhoneOtp(fullPhone, cleanOtp);
        if (check && (check.status === "approved" || (check as any).valid === true)) {
          isApproved = true;
        }
      } catch {
        try {
          const check2 = await verifyPhoneOtp(cleanNewPhone, cleanOtp);
          if (check2 && (check2.status === "approved" || (check2 as any).valid === true)) {
            isApproved = true;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!isApproved) {
      res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid verification code. Please check and try again.",
      });
      return;
    }

    // Check duplicate before saving
    const duplicate = await User.findOne({
      phone: cleanNewPhone,
      _id: { $ne: user._id },
    });

    if (duplicate) {
      res.status(400).json({
        success: false,
        message: "This mobile number is already in use by another account.",
      });
      return;
    }

    const previousPhone = user.phone;
    user.phone = cleanNewPhone;
    user.countryCode = user.pendingCountryCode || user.countryCode || "+91";
    user.isPhoneVerified = true;

    // Clean up all pending/challenge fields
    user.set("pendingPhone", undefined);
    user.set("pendingCountryCode", undefined);
    user.set("pendingPhoneOtp", undefined);
    user.set("pendingPhoneOtpExpiresAt", undefined);
    user.set("phoneChangeCrossToken", undefined);
    user.set("phoneChangeCrossTokenExpiresAt", undefined);
    user.set("phoneChangeCrossEmailOtp", undefined);
    user.set("phoneChangeCrossEmailOtpExpiresAt", undefined);
    user.set("phoneChangeChallengeId", undefined);
    user.set("phoneChangeChallengeExpiresAt", undefined);
    user.set("phoneChangeStep", undefined);
    user.set("phoneChangeResendAvailableAt", undefined);
    user.set("crossOtpResendAvailableAt", undefined);

    await user.save();

    auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
      userId: user._id.toString(),
      userEmail: user.email,
      details: {
        action: "Mobile number changed and verified",
        previousPhone,
        newPhone: user.phone,
      },
    });

    res.status(200).json({
      success: true,
      message: "Mobile number updated and verified successfully",
      data: {
        phone: user.phone,
        countryCode: user.countryCode,
        isPhoneVerified: true,
        user: userResponse(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/resend-cross-otp
 * Resends the verification code to the registered email address during cross-verification.
 */
export const resendChangePhoneCrossOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).select(
      "+crossOtpResendAvailableAt +phoneChangeChallengeId +phoneChangeCrossEmailOtp +phoneChangeCrossEmailOtpExpiresAt"
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.isEmailVerified || !user.email) {
      res.status(400).json({
        success: false,
        message: "Email address is not verified.",
      });
      return;
    }

    if (checkCooldown(res, user.crossOtpResendAvailableAt)) {
      return;
    }

    const emailOtp = generateOtp();
    user.phoneChangeCrossEmailOtp = hashOtp(emailOtp);
    user.phoneChangeCrossEmailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.crossOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
    user.phoneChangeResendAvailableAt = new Date(Date.now() + 60 * 1000);

    await user.save();

    await sendEmailOtp(user.email, user.firstName || "User", emailOtp);

    res.status(200).json({
      success: true,
      message: "Verification code resent to your registered email address",
      maskedEmail: maskEmail(user.email),
      challengeId: user.phoneChangeChallengeId,
      resendAvailableAt: user.crossOtpResendAvailableAt.getTime(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-phone/cancel
 * Cancels any active change phone session and cleans up pending challenge state.
 */
export const cancelChangePhone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          pendingPhone: "",
          pendingCountryCode: "",
          pendingPhoneOtp: "",
          pendingPhoneOtpExpiresAt: "",
          phoneChangeCrossToken: "",
          phoneChangeCrossTokenExpiresAt: "",
          phoneChangeCrossEmailOtp: "",
          phoneChangeCrossEmailOtpExpiresAt: "",
          phoneChangeChallengeId: "",
          phoneChangeChallengeExpiresAt: "",
          phoneChangeStep: "",
          phoneChangeResendAvailableAt: "",
          crossOtpResendAvailableAt: "",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Change phone challenge cancelled",
    });
  } catch (error) {
    next(error);
  }
};
