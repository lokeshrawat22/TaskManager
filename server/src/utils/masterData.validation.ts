/**
 * Production-level validation and normalization for Departments and Designations.
 *
 * Strict Business Naming Rules:
 * Allowed:
 *  - English alphabet: A-Z / a-z
 *  - Unicode letters and combining marks (\p{L}\p{M}) for multilingual/Hindi support
 *  - Single spaces between words
 *  - '&' only when meaningful (e.g. "Product & Design", "R&D")
 *  - Hyphen '-' only when meaningful (e.g. "Pre-Sales", "Tech-Support")
 *  - Apostrophe "'" only where appropriate (e.g. "People's Operations")
 *
 * Disallowed:
 *  - Numbers (0-9)
 *  - Emojis, URLs
 *  - Symbols: @, #, %, $, *, _, =, +, /, \, <, >, {, }, [, ], !, ?, ~, ^, etc.
 *  - HTML/Script tags, SQL-like characters
 *  - Leading/trailing whitespace
 *  - Multiple consecutive spaces
 *  - Consecutive separators (&&, --, '', &-, etc.)
 *
 * Length:
 *  - Minimum: 2 characters
 *  - Maximum: 80 characters
 */

export interface MasterDataValidationResult {
  valid: boolean;
  code?:
    | "REQUIRED"
    | "TOO_SHORT"
    | "TOO_LONG"
    | "INVALID_CHARACTERS"
    | "INVALID_SEPARATORS";
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
  type: "department" | "designation" = "department"
): MasterDataValidationResult {
  const entityLabel = type === "department" ? "Department" : "Designation";

  if (!raw || typeof raw !== "string") {
    return {
      valid: false,
      code: "REQUIRED",
      message: `${entityLabel} name is required.`,
      normalized: "",
    };
  }

  const normalized = normalizeMasterDataName(raw);

  if (normalized.length === 0) {
    return {
      valid: false,
      code: "REQUIRED",
      message: `${entityLabel} name is required.`,
      normalized: "",
    };
  }

  if (normalized.length < 2) {
    return {
      valid: false,
      code: "TOO_SHORT",
      message: `${entityLabel} name must be at least 2 characters.`,
      normalized,
    };
  }

  if (normalized.length > 80) {
    return {
      valid: false,
      code: "TOO_LONG",
      message: `${entityLabel} name cannot exceed 80 characters.`,
      normalized,
    };
  }

  // Allowed character set check: Unicode letters, marks, spaces, &, -, '
  // Rejects digits, emojis, URLs, script tags (<, >), underscores, and disallowed symbols
  if (!/^[\p{L}\p{M} &'\-]+$/u.test(normalized)) {
    return {
      valid: false,
      code: "INVALID_CHARACTERS",
      message: `${entityLabel} name contains invalid characters.`,
      normalized,
    };
  }

  // Must start and end with a letter or combining mark
  if (!/^[\p{L}\p{M}]/u.test(normalized) || !/[\p{L}\p{M}]$/u.test(normalized)) {
    return {
      valid: false,
      code: "INVALID_SEPARATORS",
      message: `${entityLabel} name must start and end with a letter.`,
      normalized,
    };
  }

  // No consecutive or adjacent punctuation (e.g. "&&", "--", "''", "&-", "& -", etc.)
  if (/[-&']\s*[-&']/.test(normalized)) {
    return {
      valid: false,
      code: "INVALID_SEPARATORS",
      message: `${entityLabel} name contains invalid separator combinations.`,
      normalized,
    };
  }

  // Hyphen must be between letters: e.g. "Pre-Sales" (not "Pre - Sales", "-Sales", "Sales-")
  if (normalized.includes("-")) {
    if (/ -|- |^-|-$/.test(normalized)) {
      return {
        valid: false,
        code: "INVALID_SEPARATORS",
        message: `${entityLabel} name contains misplaced hyphen.`,
        normalized,
      };
    }
  }

  // Apostrophe must be between letters: e.g. "People's" (not "People ' s")
  if (normalized.includes("'")) {
    if (/ '|' |^'|'$/.test(normalized)) {
      return {
        valid: false,
        code: "INVALID_SEPARATORS",
        message: `${entityLabel} name contains misplaced apostrophe.`,
        normalized,
      };
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
      return {
        valid: false,
        code: "INVALID_SEPARATORS",
        message: `${entityLabel} name contains misplaced ampersand.`,
        normalized,
      };
    }
  }

  return {
    valid: true,
    normalized,
    message: `Valid ${entityLabel.toLowerCase()} name`,
  };
}
