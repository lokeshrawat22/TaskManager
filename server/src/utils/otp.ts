import crypto from "crypto";

// =====================================================
// CRYPTOGRAPHICALLY SECURE OTP GENERATOR
// =====================================================

export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

// =====================================================
// OTP ONE-WAY HASH (SHA-256)
// =====================================================

export const hashOtp = (otp: string): string => {
  return crypto
    .createHash("sha256")
    .update(String(otp).trim())
    .digest("hex");
};

// =====================================================
// CONSTANT-TIME OTP HASH VERIFICATION
// =====================================================

export const verifyOtpHash = (
  enteredOtp: string,
  storedHash?: string
): boolean => {
  if (!enteredOtp || !storedHash) {
    return false;
  }

  const computedHash = hashOtp(enteredOtp);

  // Buffer length must match for timingSafeEqual
  const computedBuffer = Buffer.from(computedHash, "utf-8");
  const storedBuffer = Buffer.from(storedHash, "utf-8");

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
};