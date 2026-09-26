/**
 * Production-level validation and normalization for Departments and Designations (Client-side).
 */

export interface MasterDataValidationResult {
  valid: boolean;
  isValid: boolean;
  code?:
    | "REQUIRED"
    | "EMPTY"
    | "TOO_SHORT"
    | "TOO_LONG"
    | "INVALID_CHARACTERS"
    | "INVALID_SEPARATORS"
    | "DUPLICATE";
  message: string;
  normalized: string;
}

/**
 * Normalizes master data name:
 * - Trims leading and trailing whitespace
 * - Collapses multiple whitespace characters into a single space
 */
export function normalizeMasterDataName(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Returns lowercase normalized key for case-insensitive duplicate checking.
 */
export function toLookupKey(normalizedName: string): string {
  return normalizedName.toLowerCase();
}

/**
 * Validates department or designation name.
 */
export function validateMasterDataName(
  raw: string,
  type: "department" | "designation" = "department",
  t?: (key: string, options?: any) => string
): MasterDataValidationResult {
  const isDept = type === "department";

  const getMsg = (key: string, fallback: string) => {
    if (t) {
      const res = t(key);
      if (res && res !== key) return res;
    }
    return fallback;
  };

  const createResult = (
    valid: boolean,
    code: MasterDataValidationResult["code"],
    message: string,
    normalized: string
  ): MasterDataValidationResult => ({
    valid,
    isValid: valid,
    code,
    message,
    normalized,
  });

  if (!raw || typeof raw !== "string") {
    return createResult(
      false,
      "REQUIRED",
      isDept
        ? getMsg("departments.deptNameRequired", "Department name is required.")
        : getMsg("departments.desigNameRequired", "Designation name is required."),
      ""
    );
  }

  const normalized = normalizeMasterDataName(raw);

  if (normalized.length === 0) {
    return createResult(
      false,
      "REQUIRED",
      isDept
        ? getMsg("departments.deptNameRequired", "Department name is required.")
        : getMsg("departments.desigNameRequired", "Designation name is required."),
      ""
    );
  }

  if (normalized.length < 2) {
    return createResult(
      false,
      "TOO_SHORT",
      isDept
        ? getMsg("departments.deptNameTooShort", "Department name must be at least 2 characters.")
        : getMsg("departments.desigNameTooShort", "Designation name must be at least 2 characters."),
      normalized
    );
  }

  if (normalized.length > 80) {
    return createResult(
      false,
      "TOO_LONG",
      isDept
        ? getMsg("departments.deptNameTooLong", "Department name cannot exceed 80 characters.")
        : getMsg("departments.desigNameTooLong", "Designation name cannot exceed 80 characters."),
      normalized
    );
  }

  // Allowed character set check: Unicode letters, marks, spaces, &, -, '
  // Rejects digits, emojis, URLs, script tags (<, >), underscores, and disallowed symbols
  if (!/^[\p{L}\p{M} &'\-]+$/u.test(normalized)) {
    return createResult(
      false,
      "INVALID_CHARACTERS",
      isDept
        ? getMsg("departments.deptNameInvalidChars", "Department name can only contain letters, spaces, and approved separators (&, -, ').")
        : getMsg("departments.desigNameInvalidChars", "Designation name can only contain letters, spaces, and approved separators (&, -, ')."),
      normalized
    );
  }

  // Must start and end with a letter or combining mark
  if (!/^[\p{L}\p{M}]/u.test(normalized) || !/[\p{L}\p{M}]$/u.test(normalized)) {
    return createResult(
      false,
      "INVALID_SEPARATORS",
      isDept
        ? getMsg("departments.deptNameInvalidSeparators", "Department name must start and end with a letter.")
        : getMsg("departments.desigNameInvalidSeparators", "Designation name must start and end with a letter."),
      normalized
    );
  }

  // No consecutive or adjacent punctuation
  if (/[-&']\s*[-&']/.test(normalized)) {
    return createResult(
      false,
      "INVALID_SEPARATORS",
      isDept
        ? getMsg("departments.deptNameInvalidSeparators", "Department name contains invalid separator combinations.")
        : getMsg("departments.desigNameInvalidSeparators", "Designation name contains invalid separator combinations."),
      normalized
    );
  }

  // Hyphen must be between letters: e.g. "Pre-Sales" (not "Pre - Sales")
  if (normalized.includes("-")) {
    if (/ -|- |^-|-$/.test(normalized)) {
      return createResult(
        false,
        "INVALID_SEPARATORS",
        isDept
          ? getMsg("departments.deptNameInvalidSeparators", "Department name contains misplaced hyphen.")
          : getMsg("departments.desigNameInvalidSeparators", "Designation name contains misplaced hyphen."),
        normalized
      );
    }
  }

  // Apostrophe must be between letters: e.g. "People's" (not "People ' s")
  if (normalized.includes("'")) {
    if (/ '|' |^'|'$/.test(normalized)) {
      return createResult(
        false,
        "INVALID_SEPARATORS",
        isDept
          ? getMsg("departments.deptNameInvalidSeparators", "Department name contains misplaced apostrophe.")
          : getMsg("departments.desigNameInvalidSeparators", "Designation name contains misplaced apostrophe."),
        normalized
      );
    }
  }

  // Ampersand: if present, must be either standalone between words ("Product & Design") or between letters ("R&D")
  if (normalized.includes("&")) {
    const validAmpersand =
      / & /.test(normalized) || /[\p{L}\p{M}]&[\p{L}\p{M}]/u.test(normalized);
    if (
      !validAmpersand ||
      /^&|&$/.test(normalized) ||
      (/& /.test(normalized) && !/ & /.test(normalized))
    ) {
      return createResult(
        false,
        "INVALID_SEPARATORS",
        isDept
          ? getMsg("departments.deptNameInvalidSeparators", "Department name contains misplaced ampersand.")
          : getMsg("departments.desigNameInvalidSeparators", "Designation name contains misplaced ampersand."),
        normalized
      );
    }
  }

  return createResult(
    true,
    undefined,
    isDept
      ? getMsg("departments.deptNameValid", "Valid department name")
      : getMsg("departments.desigNameValid", "Valid designation name"),
    normalized
  );
}
