import { Router } from "express";

import {
  login,
  register,
  verifyEmail,
  verifyPhone,
  logout,
  resendEmailOtp,
  resendPhoneOtp,
  resendVerificationOtp,
  refreshAccessToken,
  forgotPassword,
  verifyResetPasswordOtp,
  resendResetPasswordOtp,
  resetPassword,
  getLoginEncryptionKey,
  getProfile,
  updateProfile,
  uploadCoverImage,
  removeCoverImage,
} from "../controllers/auth.controllers.js";

import upload from "../middlewares/upload.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { decryptLoginPayload } from "../middlewares/encryption.middleware.js";
import {
  accountLoginLimiter,
  ipLoginLimiter,
  resetAccountLoginAttempts,
  otpLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// =====================================================
// REGISTER
// =====================================================

router.post(
  "/register",
  upload.single("profilePhoto"),
  register,
);

// =====================================================
// VERIFICATION
// =====================================================

router.post(
  "/verify-email",
  otpLimiter,
  verifyEmail,
);

router.post(
  "/verify-phone",
  otpLimiter,
  verifyPhone,
);

// =====================================================
// RESEND OTP
// =====================================================

// Email verification page
router.post(
  "/resend-email-otp",
  otpLimiter,
  resendEmailOtp,
);

// Phone verification page
router.post(
  "/resend-phone-otp",
  otpLimiter,
  resendPhoneOtp,
);

// Login → Verification page
// Sends fresh OTP when user clicks "Verify Now"
router.post(
  "/resend-verification-otp",
  otpLimiter,
  resendVerificationOtp,
);

// =====================================================
// FORGOT PASSWORD
// =====================================================

// Send password reset OTP
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPassword,
);

// Verify password reset OTP
router.post(
  "/verify-reset-password-otp",
  passwordResetLimiter,
  verifyResetPasswordOtp,
);

// Resend password reset OTP
router.post(
  "/resend-reset-password-otp",
  passwordResetLimiter,
  resendResetPasswordOtp,
);

// Reset password
router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPassword,
);

// =====================================================
// LOGIN & ENCRYPTION KEY
// =====================================================

// Ephemeral AES-256-GCM session key for client-side login payload encryption
router.get(
  "/encryption-key",
  getLoginEncryptionKey,
);

router.post(
  "/login",
  decryptLoginPayload,
  ipLoginLimiter,
  accountLoginLimiter,
  login,
);

if (process.env.NODE_ENV !== "production") {
  router.post("/test-reset-rate-limit", async (req, res) => {
    const raw = req.body?.email || req.body?.identifier || "";
    if (raw) {
      await resetAccountLoginAttempts(String(raw));
    }
    res.json({ success: true, message: `Reset rate limit for ${raw}` });
  });
}

// =====================================================
// REFRESH TOKEN
// =====================================================

router.post(
  "/refresh-token",
  refreshAccessToken,
);

router.post(
  "/refresh-access-token",
  refreshAccessToken,
);

// =====================================================
// LOGOUT
// =====================================================

router.post(
  "/logout",
  logout,
);

// =====================================================
// PROFILE & ME SESSION
// =====================================================

router.get(
  "/me",
  authenticate,
  getProfile,
);

router.get(
  "/profile",
  authenticate,
  getProfile,
);

router.put(
  "/profile",
  authenticate,
  upload.single("profilePhoto"),
  updateProfile,
);

// =====================================================
// COVER IMAGE (UPLOAD & REMOVE)
// =====================================================

router.put(
  "/profile/cover-image",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.patch(
  "/profile/cover-image",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.delete(
  "/profile/cover-image",
  authenticate,
  removeCoverImage,
);

router.put(
  "/profile/cover",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.patch(
  "/profile/cover",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.delete(
  "/profile/cover",
  authenticate,
  removeCoverImage,
);

export default router;