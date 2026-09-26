// =====================================================
// MASKING UTILITIES FOR SENSITIVE CONTACT DETAILS
// =====================================================

/**
 * Masks an email address for display during verification.
 * e.g. "janedoe@example.com" -> "jan***@example.com"
 * e.g. "ab@domain.com" -> "a***@domain.com"
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  const parts = email.trim().split("@");
  if (parts.length !== 2) return email;

  const [local, domain] = parts;
  if (!local) return `@${domain}`;

  let visibleCount = 3;
  if (local.length <= 2) {
    visibleCount = 1;
  } else if (local.length === 3) {
    visibleCount = 2;
  }

  const prefix = local.slice(0, visibleCount);
  return `${prefix}***@${domain}`;
}

/**
 * Masks a phone number for display during verification.
 * Guarantees standard display like "+91 ******4947".
 * Keeps last 4 digits visible and masks the preceding digits.
 */
export function maskPhone(phone: string, countryCode: string = "+91"): string {
  if (!phone || typeof phone !== "string") return "";
  const cleanPhone = phone.trim();

  // Normalize country code
  let cc = countryCode.trim();
  if (cc && !cc.startsWith("+")) {
    cc = `+${cc}`;
  }

  // Extract digits
  const digits = cleanPhone.replace(/\D/g, "");
  if (digits.length < 4) {
    return cleanPhone;
  }

  const last4 = digits.slice(-4);
  const prefix = cc || "+91";

  // Display masked representation: e.g. "+91 ******4947"
  return `${prefix} ******${last4}`;
}
