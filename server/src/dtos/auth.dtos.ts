

export interface RegisterDTO {
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



export interface LoginDTO {
  identifier?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
}


export interface ForgotPasswordDTO {
  phone: string;
}


export interface VerifyEmailOtpDTO {
  email: string;
  otp: string;
}

export interface VerifyPhoneOtpDTO {
  phone: string;
  otp: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}



export interface ResetPasswordDTO {
  resetToken: string;
  newPassword: string;
}

export interface VerifyEmailOtpDTO {
  email: string;
  otp: string;
}


export interface VerifyPhoneOtpDTO {
  phone: string;
  otp: string;
}