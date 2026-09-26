import type { CountryCode } from "libphonenumber-js";

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;

  country: CountryCode;
  phone: string;

  dob: string;
  gender: string;
  qualification: string;

  password: string;
  confirmPassword: string;

  terms: boolean;
}

export interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  qualification?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}