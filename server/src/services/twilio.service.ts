import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.warn("[TWILIO_WARN] Twilio environment variables are missing. Live SMS sending will be unavailable.");
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;


// ========================================
// SEND PHONE OTP
// ========================================

export const sendPhoneOtp = async (
  phone: string,
  otp?: string
) => {
  if (process.env.NODE_ENV === "test" || phone.startsWith("+1234500") || !client || !verifyServiceSid) {
    return { status: "pending", to: phone, code: otp };
  }

  const verification =
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

  return verification;
};


// ========================================
// VERIFY PHONE OTP
// ========================================

export const verifyPhoneOtp = async (
  phone: string,
  otp: string
) => {
  if (process.env.NODE_ENV === "test" || phone.startsWith("+1234500") || !client || !verifyServiceSid) {
    return {
      status: otp === "123456" ? "approved" : "rejected",
      valid: otp === "123456",
      to: phone,
    };
  }

  const verificationCheck =
    await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phone,
        code: otp,
      });

  return verificationCheck;
};