import { API_BASE_URL } from "@/constants/api.constants";

// =============================
// COMMON TYPES
// =============================

export interface OtpTimingData {
  emailOtpExpiresAt?: number | null;
  emailOtpResendAvailableAt?: number | null;

  phoneOtpExpiresAt?: number | null;
  phoneOtpResendAvailableAt?: number | null;

  retryAfterSeconds?: number;
}

export interface AuthUserData {
  id?: string;

  firstName?: string;
  lastName?: string;

  email: string;
  phone: string;

  country?: string;
  countryCode?: string;

  dateOfBirth?: string;
  gender?: string;
  qualification?: string;

  // PROFILE PHOTO & COVER
  profilePhoto?: string;
  coverImage?: string;

  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;

  data?: {
    user?: AuthUserData;

    email?: string;
    phone?: string;

    emailVerified?: boolean;
    phoneVerified?: boolean;

    // OTP timing
    emailOtpExpiresAt?: number | null;
    emailOtpResendAvailableAt?: number | null;

    phoneOtpExpiresAt?: number | null;
    phoneOtpResendAvailableAt?: number | null;

    retryAfterSeconds?: number;

    // Backward compatibility
    otp?: OtpTimingData;
  };
}


// =============================
// REGISTER
// =============================

export interface RegisterPayload {
  firstName: string;
  lastName: string;

  email: string;

  country: string;
  countryCode: string;
  phone: string;

  dateOfBirth: string;

  gender:
    | "Male"
    | "Female"
    | "Other";

  password: string;
  confirmPassword: string;

  qualification: string;

  termsAccepted: boolean;
}


// =============================
// REGISTER USER
// =============================

export const registerUser = async (
  data: RegisterPayload,
  profilePhoto?: File | null
): Promise<AuthResponse> => {

  // =================================================
  // FORM DATA
  // =================================================

  const formData = new FormData();

  formData.append(
    "firstName",
    data.firstName
  );

  formData.append(
    "lastName",
    data.lastName
  );

  formData.append(
    "email",
    data.email
  );

  formData.append(
    "country",
    data.country
  );

  formData.append(
    "countryCode",
    data.countryCode
  );

  formData.append(
    "phone",
    data.phone
  );

  formData.append(
    "dateOfBirth",
    data.dateOfBirth
  );

  formData.append(
    "gender",
    data.gender
  );

  formData.append(
    "password",
    data.password
  );

  formData.append(
    "confirmPassword",
    data.confirmPassword
  );

  formData.append(
    "qualification",
    data.qualification
  );

  formData.append(
    "termsAccepted",
    String(data.termsAccepted)
  );


  // =================================================
  // PROFILE PHOTO
  // =================================================

  if (profilePhoto) {
    formData.append(
      "profilePhoto",
      profilePhoto
    );
  }


  // =================================================
  // API REQUEST
  // =================================================

  const response = await fetch(
    `${API_BASE_URL}/api/auth/register`,
    {
      method: "POST",

      // IMPORTANT:
      // Do NOT manually set Content-Type here.
      // Browser automatically sets:
      // multipart/form-data + boundary

      credentials: "include",

      body: formData,
    }
  );


  // =================================================
  // RESPONSE
  // =================================================

  const result: AuthResponse & {
    errors?: Record<string, string>;
    code?: string;
  } = await response.json();


  // =================================================
  // ERROR
  // =================================================

  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Registration failed"
    ) as Error & {
      errors?: Record<string, string>;
      status?: number;
      code?: string;
    };


    error.errors =
      result.errors;

    error.status =
      response.status;

    error.code =
      result.code;


    throw error;
  }


  return result;
};


// =============================
// LOGIN & FIELD-LEVEL ENCRYPTION (AES-256-GCM)
// =============================

export interface LoginPayload {
  email?: string;
  identifier?: string;
  password: string;
  rememberMe?: boolean;
}

export interface EncryptedLoginPayload {
  data: string;
}

export interface LoginEncryptionKeyResponse {
  success: boolean;
  data: {
    keyId: string;
    key: string;
    algorithm: string;
    expiresAt: number;
  };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Fetches an ephemeral AES-256-GCM session key from the backend.
 * Never stores keys permanently or in localStorage.
 */
export const getLoginEncryptionKey = async (): Promise<LoginEncryptionKeyResponse["data"]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/encryption-key`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to initialize secure login session. Please refresh and try again.");
  }

  const json: LoginEncryptionKeyResponse = await response.json();
  if (!json?.success || !json?.data?.key || !json?.data?.keyId) {
    throw new Error("Invalid encryption key response from server.");
  }

  return json.data;
};

/**
 * Encrypts a single plaintext string value using Web Crypto AES-256-GCM.
 * Every field receives a freshly generated, unique 12-byte random IV.
 */
async function encryptField(
  plaintext: string,
  cryptoObj: Crypto,
  cryptoKey: CryptoKey
): Promise<string> {
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    encoded
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertextBytes = encryptedBytes.subarray(0, encryptedBytes.length - 16);
  const authTagBytes = encryptedBytes.subarray(encryptedBytes.length - 16);

  return `v1:${bytesToHex(iv)}:${bytesToHex(authTagBytes)}:${bytesToHex(ciphertextBytes)}`;
}

/**
 * Encrypts the COMPLETE login payload ({ email, password, rememberMe })
 * using Web Crypto AES-256-GCM.
 * - Outgoing HTTP payload: { data: encryptedData }
 * - Plaintext email and password NEVER appear in the HTTP request payload.
 */
export const encryptLoginCredentials = async (
  data: LoginPayload
): Promise<{ body: EncryptedLoginPayload; keyId: string }> => {
  const keyInfo = await getLoginEncryptionKey();

  const cryptoObj =
    typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Modern cryptographic browser support (Web Crypto API) is required.");
  }

  const keyBytes = hexToBytes(keyInfo.key);
  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const emailOrId = (data.email || data.identifier || "").trim();
  const logicalPayload = {
    email: emailOrId,
    identifier: emailOrId,
    password: data.password,
    rememberMe: Boolean(data.rememberMe),
  };

  const encryptedData = await encryptField(
    JSON.stringify(logicalPayload),
    cryptoObj,
    cryptoKey
  );

  return {
    body: {
      data: encryptedData,
    },
    keyId: keyInfo.keyId,
  };
};

export const loginUser = async (
  data: LoginPayload
): Promise<AuthResponse> => {
  // Encrypt COMPLETE payload: { data: encryptedData }
  const { body: loginPayload, keyId } = await encryptLoginCredentials(data);

  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-Login-Key-Id": keyId,
      },

      credentials: "include",

      body: JSON.stringify(loginPayload),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Login failed"
    ) as Error & {
      code?: string;

      data?: {
        email: string;
        phone: string;

        emailVerified: boolean;
        phoneVerified: boolean;

        emailOtpExpiresAt?: number | null;
        phoneOtpExpiresAt?: number | null;

        emailOtpResendAvailableAt?: number | null;
        phoneOtpResendAvailableAt?: number | null;

        retryAfterSeconds?: number;
      };

      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data as any;

    error.status =
      response.status;


    throw error;
  }


  return result;
};


// =============================
// RESEND EMAIL OTP
// =============================

export const resendEmailOtp = async (
  email: string
): Promise<AuthResponse> => {

  const response = await fetch(
    `${API_BASE_URL}/api/auth/resend-email-otp`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
      }),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Failed to resend email OTP"
    ) as Error & {
      code?: string;

      data?: {
        retryAfterSeconds?: number;
      };

      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data;

    error.status =
      response.status;


    throw error;
  }


  return result;
};


// =============================
// RESEND PHONE OTP
// =============================

export const resendPhoneOtp = async (
  phone: string
): Promise<AuthResponse> => {

  const response = await fetch(
    `${API_BASE_URL}/api/auth/resend-phone-otp`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        phone,
      }),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Failed to resend phone OTP"
    ) as Error & {
      code?: string;

      data?: {
        retryAfterSeconds?: number;
      };

      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data;

    error.status =
      response.status;


    throw error;
  }


  return result;
};


// =============================
// RESEND VERIFICATION OTP
// LOGIN → VERIFICATION PAGE
// =============================

export const resendVerificationOtp = async (
  email: string
): Promise<AuthResponse> => {

  const response = await fetch(
    `${API_BASE_URL}/api/auth/resend-verification-otp`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
      }),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Failed to send verification OTP"
    ) as Error & {
      code?: string;

      data?: {
        retryAfterSeconds?: number;
      };

      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data;

    error.status =
      response.status;


    throw error;
  }


  return result;
};


// =============================
// VERIFY EMAIL
// =============================

export const verifyEmailOtp = async (
  email: string,
  otp: string
): Promise<AuthResponse> => {

  const response = await fetch(
    `${API_BASE_URL}/api/auth/verify-email`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Email verification failed"
    ) as Error & {
      code?: string;
      data?: any;
      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data;

    error.status =
      response.status;


    throw error;
  }


  return result;
};


// =============================
// VERIFY PHONE
// =============================

export const verifyPhoneOtp = async (
  phone: string,
  otp: string
): Promise<AuthResponse> => {

  const response = await fetch(
    `${API_BASE_URL}/api/auth/verify-phone`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        phone,
        otp,
      }),
    }
  );


  const result: AuthResponse & {
    code?: string;
  } = await response.json();


  if (!response.ok) {

    const error = new Error(
      result.message ||
        "Phone verification failed"
    ) as Error & {
      code?: string;
      data?: any;
      status?: number;
    };


    error.code =
      result.code;

    error.data =
      result.data;

    error.status =
      response.status;


    throw error;
  }


  return result;
};

// =====================================================
// BLOCKED EMPLOYEE LOGOUT HANDLER
// =====================================================

export const BLOCKED_LOGOUT_MESSAGE =
  "Your account has been blocked by an administrator.";

let isLoggingOutDueToBlock = false;

export const handleBlockedEmployeeLogout = (customMessage?: string) => {
  if (isLoggingOutDueToBlock) return;
  isLoggingOutDueToBlock = true;

  const notice = customMessage || BLOCKED_LOGOUT_MESSAGE;

  try {
    sessionStorage.setItem("blocked_logout_notice", notice);
  } catch {
    // ignore
  }

  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      window.dispatchEvent(
        new CustomEvent("currentUserUpdated", { detail: null })
      );
    }
  } catch {
    // ignore
  }

  // Attempt server logout to clear cookies
  try {
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
};

// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    console.log("[AUTH-DIAG] Frontend initiating refresh endpoint request (/api/auth/refresh-token)...");
    const response = await fetch(
      `${API_BASE_URL}/api/auth/refresh-token`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      console.log(`[AUTH-DIAG] Refresh endpoint request failed with HTTP ${response.status}`);
      if (response.status === 403) {
        try {
          const errData = await response.clone().json();
          if (errData?.code === "ACCOUNT_BLOCKED") {
            handleBlockedEmployeeLogout(errData.message);
          }
        } catch {
          // ignore
        }
      }
      return false;
    }

    const result: AuthResponse = await response.json();
    const success = result.success === true;
    console.log(`[AUTH-DIAG] Refresh endpoint request completed. Success: ${success}`);

    return success;
  } catch (error) {
    console.log("[AUTH-DIAG] Refresh endpoint network error (not a token value):", (error as any)?.message ?? error);
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[AUTH] refreshAccessToken threw (not a token value):",
        (error as any)?.message ?? error,
      );
    }

    return false;
  }
};

// =====================================================
// AUTHENTICATED FETCH
// =====================================================
// Use this for protected APIs.
//
// Flow:
// 1. Send original request.
// 2. If access token is valid → return response.
// 3. If API returns 401 → refresh access token.
// 4. Retry the original request once.
// 5. If refresh fails → return original 401 response.
//
// The refresh endpoint sets the new accessToken cookie,
// so the frontend does not need to store the token manually.
// =====================================================

export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const requestOptions: RequestInit = {
    ...options,
    credentials: "include",
  };

  // ---------------------------------------------------
  // FIRST REQUEST
  // ---------------------------------------------------

  let response = await fetch(
    url,
    requestOptions
  );

  // If blocked, handle immediate logout (only if the authenticated session itself is blocked)
  if (response.status === 403) {
    try {
      const errData = await response.clone().json();
      if (
        errData?.code === "ACCOUNT_BLOCKED" &&
        !url.includes("/block")
      ) {
        handleBlockedEmployeeLogout(errData.message);
        return response;
      }
    } catch {
      // ignore
    }
  }

  // Access token is still valid.
  if (response.status !== 401) {
    return response;
  }

  // ---------------------------------------------------
  // REFRESH ACCESS TOKEN
  // ---------------------------------------------------

  const refreshed =
    await refreshAccessToken();

  if (!refreshed) {
    return response;
  }

  // ---------------------------------------------------
  // RETRY ORIGINAL REQUEST
  // ---------------------------------------------------

  response = await fetch(
    url,
    requestOptions
  );

  if (response.status === 403) {
    try {
      const errData = await response.clone().json();
      if (
        errData?.code === "ACCOUNT_BLOCKED" &&
        !url.includes("/block")
      ) {
        handleBlockedEmployeeLogout(errData.message);
      }
    } catch {
      // ignore
    }
  }

  return response;
};

// =============================
// LOGOUT
// =============================

export const logoutUser = async () => {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
    }
  } catch {
    // ignore
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/logout`,
    {
      method: "POST",

      credentials: "include",
    }
  );


  const result =
    await response.json();


  if (!response.ok) {

    throw new Error(
      result.message ||
        "Logout failed"
    );
  }


  return result;
};

// =============================
// UPLOAD COVER IMAGE
// =============================

export const uploadCoverImage = async (file: File) => {
  const formData = new FormData();
  formData.append("coverImage", file);

  const apiBase = API_BASE_URL;
  const response = await authenticatedFetch(
    `${apiBase}/api/auth/profile/cover-image`,
    {
      method: "PUT",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const errorMsg =
      result?.message ||
      result?.error ||
      `Failed to upload cover image (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
};

// =============================
// REMOVE COVER IMAGE
// =============================

export const removeCoverImage = async () => {
  const apiBase = API_BASE_URL;
  const response = await authenticatedFetch(
    `${apiBase}/api/auth/profile/cover-image`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const errorMsg =
      result?.message ||
      result?.error ||
      `Failed to remove cover image (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return result;
};

// =============================
// UPLOAD PROFILE PHOTO
// =============================

export const uploadProfilePhoto = async (file: File) => {
  const formData = new FormData();
  formData.append("profilePhoto", file);

  const apiBase = API_BASE_URL;
  const response = await authenticatedFetch(
    `${apiBase}/api/auth/profile`,
    {
      method: "PUT",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to upload profile photo");
  }

  return result;
};

// =============================
// REMOVE PROFILE PHOTO
// =============================

export const removeProfilePhoto = async () => {
  const formData = new FormData();
  formData.append("removeProfilePhoto", "true");

  const apiBase = API_BASE_URL;
  const response = await authenticatedFetch(
    `${apiBase}/api/auth/profile`,
    {
      method: "PUT",
      credentials: "include",
      body: formData,
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Failed to remove profile photo");
  }

  return result;
};