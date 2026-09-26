import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

// =====================================================
// VALIDATION CONSTANTS
// =====================================================

const VALIDATION = {
  firstName: {
    minLength: 2,
    maxLength: 30,
  },

  lastName: {
    minLength: 2,
    maxLength: 100,
  },

  email: {
    maxLength: 254,
  },

  password: {
    minLength: 8,
    maxLength: 64,
  },

  phone: {
    maxInternationalDigits: 15,
    india: {
      country: "IN" as CountryCode,
      nationalLength: 10,
      firstDigitPattern: /^[6-9]/,
    },
  },
} as const;

// =====================================================
// REGEX
// =====================================================

const NAME_REGEX = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const DIGITS_ONLY_REGEX = /^\d+$/;

const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_REGEX = /[!@#$%^&*(),.?":{}|<>\-_+=]/;
const PASSWORD_SPACE_REGEX = /\s/;

// =====================================================
// SAFE STRING
// =====================================================

const normalizeString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

// =====================================================
// FIRST NAME
// =====================================================

export const validateFirstName = (value: unknown): string => {
  const name = normalizeString(value);

  if (!name) {
    return "Please enter your first name.";
  }

  if (name.length < VALIDATION.firstName.minLength) {
    return "First name must contain at least 2 characters.";
  }

  if (name.length > VALIDATION.firstName.maxLength) {
    return "First name cannot exceed 30 characters.";
  }

  if (!NAME_REGEX.test(name)) {
    return "First name can contain letters, spaces, apostrophes and hyphens only.";
  }

  return "";
};

// =====================================================
// LAST NAME
// =====================================================

export const validateLastName = (value: unknown): string => {
  const name = normalizeString(value);

  if (!name) {
    return "Please enter your last name.";
  }

  if (name.length < VALIDATION.lastName.minLength) {
    return "Last name must contain at least 2 characters.";
  }

  if (name.length > VALIDATION.lastName.maxLength) {
    return "Last name cannot exceed 100 characters.";
  }

  if (!NAME_REGEX.test(name)) {
    return "Last name can contain letters, spaces, apostrophes and hyphens only.";
  }

  return "";
};

// =====================================================
// EMAIL
// =====================================================

export const validateEmail = (value: unknown): string => {
  const email = normalizeString(value).toLowerCase();

  if (!email) {
    return "Please enter your email address.";
  }

  if (email.length > VALIDATION.email.maxLength) {
    return "Email address is too long.";
  }

  if (/\s/.test(email)) {
    return "Email address cannot contain spaces.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address.";
  }

  return "";
};

// =====================================================
// PHONE NUMBER
// =====================================================

export const validatePhone = (
  phone: unknown,
  country: unknown,
  countryCode?: unknown,
): string => {
  const rawPhone = normalizeString(phone);
  const selectedCountry = normalizeString(country) as CountryCode;

  const selectedCallingCode = normalizeString(countryCode);

  if (!rawPhone) {
    return "Please enter your phone number.";
  }

  if (!selectedCountry) {
    return "Please select your country.";
  }

  if (!/^[A-Z]{2}$/.test(selectedCountry)) {
    return "Invalid country selection.";
  }

  let internationalPhone = rawPhone;

  // Example:
  // phone = 8860839100
  // countryCode = +91
  // result = +918860839100

  if (!rawPhone.startsWith("+")) {
    if (!DIGITS_ONLY_REGEX.test(rawPhone)) {
      return "Phone number can contain digits only.";
    }

    if (!selectedCallingCode) {
      return "Country calling code is required.";
    }

    if (!/^\+\d{1,4}$/.test(selectedCallingCode)) {
      return "Invalid country calling code.";
    }

    internationalPhone = `${selectedCallingCode}${rawPhone}`;
  }

  if (!/^\+\d+$/.test(internationalPhone)) {
    return "Please enter a valid phone number.";
  }

  const digitCount = internationalPhone.replace(/\D/g, "").length;

  if (digitCount > VALIDATION.phone.maxInternationalDigits) {
    return "Phone number cannot exceed 15 digits.";
  }

  try {
    const parsed = parsePhoneNumber(internationalPhone);

    if (!parsed) {
      return "Please enter a valid phone number.";
    }

    if (parsed.country !== selectedCountry) {
      return "Phone number does not match the selected country.";
    }

    if (
      selectedCallingCode &&
      `+${parsed.countryCallingCode}` !== selectedCallingCode
    ) {
      return "Phone number does not match the selected country code.";
    }

    // India specific validation
    if (selectedCountry === VALIDATION.phone.india.country) {
      const nationalNumber = parsed.nationalNumber;

      if (nationalNumber.length !== VALIDATION.phone.india.nationalLength) {
        return "Indian phone number must contain exactly 10 digits.";
      }

      if (!VALIDATION.phone.india.firstDigitPattern.test(nationalNumber)) {
        return "Indian mobile number must start with 6, 7, 8 or 9.";
      }
    }

    if (!isPossiblePhoneNumber(internationalPhone)) {
      return "Phone number length is not valid for the selected country.";
    }

    if (!isValidPhoneNumber(internationalPhone)) {
      return "Please enter a valid phone number.";
    }
  } catch {
    return "Please enter a valid phone number.";
  }

  return "";
};

// =====================================================
// DATE OF BIRTH
// =====================================================

export const validateDOB = (value: unknown): string => {
  const dobValue = normalizeString(value);

  // Optional under data minimization principle (DPDP Act 2023)
  if (!dobValue) {
    return "";
  }

  const dob = new Date(`${dobValue}T00:00:00`);

  const today = new Date();

  if (Number.isNaN(dob.getTime())) {
    return "Please enter a valid date of birth.";
  }

  if (dob > today) {
    return "Date of birth cannot be in the future.";
  }

  return "";
};

// =====================================================
// PASSWORD
// =====================================================

export const validatePassword = (value: unknown): string => {
  const password = typeof value === "string" ? value : "";

  if (!password) {
    return "Please enter your password.";
  }

  if (password.length < VALIDATION.password.minLength) {
    return "Password must contain at least 8 characters.";
  }

  if (password.length > VALIDATION.password.maxLength) {
    return "Password cannot exceed 64 characters.";
  }

  if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!PASSWORD_NUMBER_REGEX.test(password)) {
    return "Password must contain at least one number.";
  }

  if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    return "Password must contain at least one special character.";
  }

  if (PASSWORD_SPACE_REGEX.test(password)) {
    return "Password cannot contain spaces.";
  }

  return "";
};

// =====================================================
// CONFIRM PASSWORD
// =====================================================

export const validateConfirmPassword = (
  password: unknown,
  confirmPassword: unknown,
): string => {
  const passwordValue = typeof password === "string" ? password : "";

  const confirmValue =
    typeof confirmPassword === "string" ? confirmPassword : "";

  if (!confirmValue) {
    return "Please confirm your password.";
  }

  if (passwordValue !== confirmValue) {
    return "Passwords do not match.";
  }

  return "";
};

// =====================================================
// GENDER
// =====================================================

export const validateGender = (value: unknown): string => {
  const gender = normalizeString(value);

  // Optional under data minimization principle (DPDP Act 2023)
  if (!gender) {
    return "";
  }

  if (!["Male", "Female", "Other"].includes(gender)) {
    return "Please select a valid gender.";
  }

  return "";
};

// =====================================================
// QUALIFICATION
// =====================================================

export const validateQualification = (value: unknown): string => {
  const qualification = normalizeString(value);

  if (!qualification) {
    return "Please select your highest qualification.";
  }

  return "";
};

// =====================================================
// TERMS
// =====================================================

export const validateTerms = (value: unknown): string => {
  if (value !== true) {
    return "Please accept the Terms & Conditions to continue.";
  }

  return "";
};

// =====================================================
// REGISTER VALIDATION DATA
// =====================================================

export interface RegisterValidationData {
  firstName: unknown;
  lastName: unknown;
  email: unknown;
  country: unknown;
  phone: unknown;
  countryCode?: unknown;
  dateOfBirth?: unknown;
  gender?: unknown;
  password: unknown;
  confirmPassword: unknown;
  qualification: unknown;
  termsAccepted: unknown;
}

// =====================================================
// COMPLETE REGISTER VALIDATION
// =====================================================

export const validateRegisterForm = (
  data: RegisterValidationData,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const firstNameError = validateFirstName(data.firstName);

  const lastNameError = validateLastName(data.lastName);

  const emailError = validateEmail(data.email);

  const phoneError = validatePhone(data.phone, data.country, data.countryCode);

  const dobError = validateDOB(data.dateOfBirth);

  const passwordError = validatePassword(data.password);

  const confirmPasswordError = validateConfirmPassword(
    data.password,
    data.confirmPassword,
  );

  const genderError = validateGender(data.gender);

  const qualificationError = validateQualification(data.qualification);

  const termsError = validateTerms(data.termsAccepted);

  if (firstNameError) {
    errors.firstName = firstNameError;
  }

  if (lastNameError) {
    errors.lastName = lastNameError;
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (phoneError) {
    errors.phone = phoneError;
  }

  if (dobError) {
    errors.dateOfBirth = dobError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  if (genderError) {
    errors.gender = genderError;
  }

  if (qualificationError) {
    errors.qualification = qualificationError;
  }

  if (termsError) {
    errors.termsAccepted = termsError;
  }

  return errors;
};
