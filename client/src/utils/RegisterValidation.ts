import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
} from "libphonenumber-js";

import type {
  RegisterErrors,
  RegisterFormData,
} from "@/types/auth";

/* ======================================================
   FIRST NAME
====================================================== */

export const validateFirstName = (value: string): string => {
  const name = value.trim();

  if (!name) {
    return "Please enter your first name.";
  }

  if (name.length < 2) {
    return "First name must contain at least 2 characters.";
  }

  if (/\s/.test(name)) {
    return "First name can contain only one word.";
  }

  if (!/^[A-Za-z]+$/.test(name)) {
    return "First name can contain letters only.";
  }

  if (!/^[A-Z][a-zA-Z]*$/.test(name)) {
    return "First name must start with a capital letter.";
  }

  if (name.length > 30) {
    return "First name cannot exceed 30 characters.";
  }

  return "";
};

/* ======================================================
   LAST NAME
====================================================== */

export const validateLastName = (value: string): string => {
  const name = value.trim();

  if (!name) {
    return "Please enter your last name.";
  }

  if (name.length < 2) {
    return "Last name must contain at least 2 characters.";
  }

  if (name.length > 100) {
    return "Last name cannot exceed 100 characters.";
  }

  // Letters and single spaces only
  if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(name)) {
    return "Last name can contain letters and spaces only.";
  }

  // Every word must start with a capital letter
  const words = name.split(/\s+/);

  const hasInvalidCapitalization = words.some(
    (word) => !/^[A-Z][a-zA-Z]*$/.test(word)
  );

  if (hasInvalidCapitalization) {
    return "Each word in last name must start with a capital letter.";
  }

  return "";
};

/* ======================================================
   EMAIL
====================================================== */

export const validateEmail = (value: string): string => {
  const email = value.trim();

  if (!email) {
    return "Please enter your email address.";
  }

  if (email.length > 254) {
    return "Email address is too long.";
  }

  if (/\s/.test(email)) {
    return "Email address cannot contain spaces.";
  }

  // Allowed email characters
  if (!/^[A-Za-z0-9._%+-@]+$/.test(email)) {
    return "Email contains invalid characters.";
  }

  // Exactly one @
  const atCount = (email.match(/@/g) || []).length;

  if (atCount !== 1) {
    return "Please enter a valid email address.";
  }

  const [localPart, domain] = email.split("@");

  /* ================= LOCAL PART ================= */

  if (!localPart) {
    return "Please enter email before @.";
  }

  if (localPart.length > 64) {
    return "Email username is too long.";
  }

  if (!/^[A-Za-z0-9]/.test(localPart)) {
    return "Email must start with a letter or number.";
  }

  if (!/[A-Za-z0-9]$/.test(localPart)) {
    return "Email username must end with a letter or number.";
  }

  if (localPart.includes("..")) {
    return "Email cannot contain consecutive dots.";
  }

  /* ================= DOMAIN ================= */

  if (!domain) {
    return "Please enter email domain.";
  }

  if (domain.length > 253) {
    return "Email domain is too long.";
  }

  if (!/^[A-Za-z0-9.-]+$/.test(domain)) {
    return "Email domain contains invalid characters.";
  }

  if (!domain.includes(".")) {
    return "Please enter a complete email domain.";
  }

  if (domain.startsWith(".") || domain.endsWith(".")) {
    return "Please enter a valid email domain.";
  }

  if (domain.includes("..")) {
    return "Email domain cannot contain consecutive dots.";
  }

  /* ================= DOMAIN PARTS ================= */

  const domainParts = domain.split(".");

  for (const part of domainParts) {
    if (!part) {
      return "Please enter a valid email domain.";
    }

    if (part.startsWith("-") || part.endsWith("-")) {
      return "Domain section cannot start or end with '-'.";
    }

    if (!/^[A-Za-z0-9-]+$/.test(part)) {
      return "Please enter a valid email domain.";
    }
  }

  /* ================= GMAIL ================= */

  const normalizedDomain = domain.toLowerCase();

  if (
    normalizedDomain.startsWith("gmail.") &&
    normalizedDomain !== "gmail.com"
  ) {
    return "For Gmail, only @gmail.com is allowed.";
  }

  /* ================= EXTENSION ================= */

  const extension = domainParts[domainParts.length - 1];

  if (!/^[A-Za-z]{2,63}$/.test(extension)) {
    return "Please enter a valid email extension.";
  }

  return "";
};

/* ======================================================
   PHONE NUMBER
====================================================== */

export const validatePhone = (
  phone: string,
  country: RegisterFormData["country"]
): string => {
  const value = phone.trim();

  if (!value) {
    return "Please enter your phone number.";
  }

  if (!/^\d+$/.test(value)) {
    return "Phone number can contain digits only.";
  }

  /* ================= INDIA ================= */

  if (country === "IN") {
    // Maximum 10 digits
    if (value.length > 10) {
      return "Indian phone number cannot exceed 10 digits.";
    }

    // Indian mobile number must start with 6, 7, 8 or 9
    if (!/^[6-9]/.test(value)) {
      return "Indian mobile number must start with 6, 7, 8 or 9.";
    }

    // Show remaining digits while typing
    if (value.length < 10) {
      const remaining = 10 - value.length;

      return `Enter ${remaining} more digit${remaining > 1 ? "s" : ""
        }.`;
    }

    try {
      if (!isPossiblePhoneNumber(value, country)) {
        return "Phone number length is not valid for the selected country.";
      }

      if (!isValidPhoneNumber(value, country)) {
        return "Please enter a valid phone number.";
      }
    } catch {
      return "Please enter a valid phone number.";
    }

    return "";
  }

  /* ================= OTHER COUNTRIES ================= */

  // E.164 maximum national input protection
  if (value.length > 15) {
    return "Phone number cannot exceed 15 digits.";
  }

  try {
    if (!isPossiblePhoneNumber(value, country)) {
      return "Phone number length is not valid for the selected country.";
    }

    if (!isValidPhoneNumber(value, country)) {
      return "Please enter a valid phone number.";
    }
  } catch {
    return "Please enter a valid phone number.";
  }

  return "";
};

/* ======================================================
   DATE OF BIRTH
====================================================== */
/* ======================================================
   DATE OF BIRTH
====================================================== */

export const validateDOB = (value: string): string => {
  // Optional under data minimization principle (DPDP Act 2023)
  if (!value) {
    return "";
  }

  const dob = new Date(`${value}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(dob.getTime())) {
    return "Please enter a valid date of birth.";
  }

  // Future date validation
  if (dob > today) {
    return "Date of birth cannot be in the future.";
  }

  // Minimum age: 14 years
  let age = today.getFullYear() - dob.getFullYear();

  const monthDifference = today.getMonth() - dob.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < dob.getDate())
  ) {
    age--;
  }

  if (age < 14) {
    return "You must be at least 14 years old.";
  }

  return "";
};

/* ======================================================
   PASSWORD
====================================================== */

export const validatePassword = (value: string): string => {
  if (!value) {
    return "Please enter your password.";
  }

  if (value.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (value.length > 64) {
    return "Password cannot exceed 64 characters.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[0-9]/.test(value)) {
    return "Password must contain at least one number.";
  }

  if (!/[!@#$%^&*(),.?":{}|<>\-_+=]/.test(value)) {
    return "Password must contain at least one special character.";
  }

  if (/\s/.test(value)) {
    return "Password cannot contain spaces.";
  }

  return "";
};

/* ======================================================
   CONFIRM PASSWORD
====================================================== */

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): string => {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
};

/* ======================================================
   GENDER
====================================================== */

export const validateGender = (value: string): string => {
  // Optional under data minimization principle (DPDP Act 2023)
  if (!value) {
    return "";
  }

  return "";
};

/* ======================================================
   QUALIFICATION
====================================================== */

export const validateQualification = (value: string): string => {
  if (!value) {
    return "Please select your highest qualification.";
  }

  return "";
};

/* ======================================================
   TERMS
====================================================== */

export const validateTerms = (value: boolean): string => {
  if (!value) {
    return "Please accept the Terms & Conditions to continue.";
  }

  return "";
};



/* ======================================================
   COMPLETE FORM
====================================================== */

export const validateRegisterForm = (
  data: RegisterFormData
): RegisterErrors => {
  const errors: RegisterErrors = {};

  const firstNameError = validateFirstName(data.firstName);
  const lastNameError = validateLastName(data.lastName);
  const emailError = validateEmail(data.email);
  const phoneError = validatePhone(data.phone, data.country);
  const dobError = validateDOB(data.dob);
  const passwordError = validatePassword(data.password);
  const confirmPasswordError = validateConfirmPassword(
    data.password,
    data.confirmPassword
  );
  const genderError = validateGender(data.gender);
  const qualificationError = validateQualification(
    data.qualification
  );
  const termsError = validateTerms(data.terms);

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
    errors.dob = dobError;
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
    errors.terms = termsError;
  }

  return errors;
};


