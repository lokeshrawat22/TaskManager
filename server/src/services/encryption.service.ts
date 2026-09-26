import crypto from "node:crypto";

// =====================================================
// ENCRYPTION CONFIGURATION (AES-256-GCM)
// =====================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended by NIST SP 800-38D for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const CURRENT_KEY_VERSION = "v1";

/**
 * Resolves a 32-byte (256-bit) Buffer from an environment key string.
 * Supports 64-char hex, base64, or raw 32-byte strings.
 */
function parseKey(rawKey: string | undefined, keyName: string): Buffer {
  if (!rawKey || !rawKey.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`CRITICAL: ${keyName} is missing in production environment.`);
    }
    // Safe deterministic development fallback key (never used in production)
    return crypto.createHash("sha256").update("mindmatrix_dev_fallback_aes_key_2026").digest();
  }

  const trimmed = rawKey.trim();

  // 64-character hexadecimal (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  // 44-character Base64 (32 bytes)
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) {
    return Buffer.from(trimmed, "base64");
  }

  // Raw 32-byte string
  if (Buffer.byteLength(trimmed, "utf8") === 32) {
    return Buffer.from(trimmed, "utf8");
  }

  // If length is arbitrary, derive a consistent 256-bit key using SHA-256
  return crypto.createHash("sha256").update(trimmed).digest();
}

/**
 * Key storage mapping for rotation support.
 * The active encryption key is always CURRENT_KEY_VERSION ("v1").
 */
const keyMap: Record<string, Buffer> = {
  v1: parseKey(process.env.AES_ENCRYPTION_KEY, "AES_ENCRYPTION_KEY"),
};

// Support optional rotated secondary key if specified
if (process.env.AES_ENCRYPTION_KEY_V2) {
  keyMap.v2 = parseKey(process.env.AES_ENCRYPTION_KEY_V2, "AES_ENCRYPTION_KEY_V2");
}

/**
 * Custom error class for encryption/decryption operations.
 * Designed to avoid leaking sensitive information, keys, or plaintext in stack traces.
 */
export class EncryptionError extends Error {
  public readonly code: string;

  constructor(message: string, code = "ENCRYPTION_FAILED") {
    super(message);
    this.name = "EncryptionError";
    this.code = code;
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

/**
 * Encrypts a sensitive string payload using AES-256-GCM.
 *
 * Output format:
 *   v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 *
 * Every invocation uses a cryptographically secure, freshly generated 12-byte random IV.
 *
 * @param plaintext The sensitive data string to encrypt
 * @returns Serialized encrypted payload string
 */
export function encryptSensitiveData(plaintext: string): string {
  if (typeof plaintext !== "string" || !plaintext) {
    throw new EncryptionError("Cannot encrypt empty or non-string payload", "INVALID_INPUT");
  }

  try {
    const key = keyMap[CURRENT_KEY_VERSION];
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${CURRENT_KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
  } catch (error) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError("Encryption operation failed", "ENCRYPTION_ERROR");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 *
 * Verifies authenticity with the 128-bit authentication tag.
 * Fails safely if the ciphertext, tag, or IV has been tampered with.
 *
 * @param encryptedPayload Serialized encrypted string (`version:iv:tag:ciphertext`)
 * @returns Plaintext string
 */
export function decryptSensitiveData(encryptedPayload: string): string {
  if (typeof encryptedPayload !== "string" || !encryptedPayload.trim()) {
    throw new EncryptionError("Invalid ciphertext: payload is empty or non-string", "INVALID_INPUT");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 4) {
    throw new EncryptionError("Malformed encrypted payload structure", "INVALID_FORMAT");
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts;

  const key = keyMap[version];
  if (!key) {
    throw new EncryptionError(`Unknown key version: ${version}`, "KEY_VERSION_NOT_FOUND");
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError("Invalid IV length", "INVALID_IV");
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError("Invalid authentication tag length", "INVALID_AUTH_TAG");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (error: any) {
    if (error instanceof EncryptionError) throw error;
    // GCM authentication failure or invalid padding
    throw new EncryptionError(
      "Decryption failed: authentication tag verification failed or ciphertext tampered",
      "AUTHENTICATION_FAILED"
    );
  }
}

/**
 * Checks whether a given string matches the AES-256-GCM encrypted payload format.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 4) return false;
  const [version, ivHex, authTagHex, ciphertextHex] = parts;
  return (
    Boolean(keyMap[version]) &&
    /^[0-9a-fA-F]{24}$/.test(ivHex) &&
    /^[0-9a-fA-F]{32}$/.test(authTagHex) &&
    /^[0-9a-fA-F]+$/.test(ciphertextHex)
  );
}

/**
 * Safely decrypts a string if it is encrypted with AES-256-GCM.
 * If the string is not encrypted (e.g. legacy plaintext stored before encryption was enabled),
 * returns the original string to ensure zero downtime and smooth migration.
 *
 * @param value The value to safely decrypt
 * @returns Plaintext string or original value
 */
export function safeDecryptSensitiveData(value: string | undefined | null): string | undefined | null {
  if (!value || typeof value !== "string") return value;
  if (!isEncrypted(value)) return value;

  try {
    return decryptSensitiveData(value);
  } catch (error) {
    // If decryption fails on tampered data, return null or throw depending on policy
    return null;
  }
}

/**
 * Decrypts an AES-256-GCM payload using a provided 32-byte key Buffer or hex string.
 * Used for decrypting client-encrypted payloads with ephemeral session keys.
 */
export function decryptWithCustomKey(encryptedPayload: string, rawKey: Buffer | string): string {
  if (typeof encryptedPayload !== "string" || !encryptedPayload.trim()) {
    throw new EncryptionError("Invalid ciphertext: payload is empty or non-string", "INVALID_INPUT");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 4) {
    throw new EncryptionError("Malformed encrypted payload structure", "INVALID_FORMAT");
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts;
  if (version !== "v1") {
    throw new EncryptionError(`Unsupported payload version: ${version}`, "UNSUPPORTED_VERSION");
  }

  const keyBuffer = typeof rawKey === "string" ? Buffer.from(rawKey, "hex") : rawKey;
  if (keyBuffer.length !== 32) {
    throw new EncryptionError("Invalid key length: must be 32 bytes for AES-256-GCM", "INVALID_KEY");
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError("Invalid IV length", "INVALID_IV");
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError("Invalid authentication tag length", "INVALID_AUTH_TAG");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (error: any) {
    if (error instanceof EncryptionError) throw error;
    throw new EncryptionError(
      "Decryption failed: authentication tag verification failed or ciphertext tampered",
      "AUTHENTICATION_FAILED"
    );
  }
}

/**
 * Ephemeral Session Key Management for Client-to-Server Payload Encryption
 */
export interface EphemeralSessionKey {
  keyId: string;
  key: string; // 64-char hex string (32 bytes)
  expiresAt: number;
}

/**
 * Generates an ephemeral AES-256 session key, valid for 5 minutes.
 * The session key and expiry are sealed into `keyId` using the server's master key.
 */
export function generateEphemeralSessionKey(ttlMs: number = 5 * 60 * 1000): EphemeralSessionKey {
  const sessionKeyBytes = crypto.randomBytes(32);
  const sessionKeyHex = sessionKeyBytes.toString("hex");
  const expiresAt = Date.now() + ttlMs;

  // Seal into keyId using server's master key
  const sealed = encryptSensitiveData(
    JSON.stringify({
      k: sessionKeyHex,
      exp: expiresAt,
    })
  );

  return {
    keyId: sealed,
    key: sessionKeyHex,
    expiresAt,
  };
}

/**
 * Resolves and validates an ephemeral session key from a sealed `keyId`.
 * Throws EncryptionError if invalid, tampered, or expired.
 */
export function resolveEphemeralSessionKey(keyId: string): { key: string; expiresAt: number } {
  const decrypted = decryptSensitiveData(keyId);
  let parsed: any;
  try {
    parsed = JSON.parse(decrypted);
  } catch {
    throw new EncryptionError("Malformed session key envelope", "INVALID_ENVELOPE");
  }

  if (!parsed || typeof parsed.k !== "string" || typeof parsed.exp !== "number") {
    throw new EncryptionError("Invalid session key structure", "INVALID_STRUCTURE");
  }

  if (Date.now() > parsed.exp) {
    throw new EncryptionError("Session key has expired. Please refresh and try again.", "KEY_EXPIRED");
  }

  return {
    key: parsed.k,
    expiresAt: parsed.exp,
  };
}
