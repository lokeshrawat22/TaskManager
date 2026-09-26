import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

// =====================================================
// USER INTERFACE
// =====================================================

export interface IUser extends Document {
  // =====================================================
  // PERSONAL INFORMATION
  // =====================================================

  firstName: string;
  lastName: string;

  email: string;

  country: string;
  countryCode: string;
  phone: string;

  dateOfBirth?: Date;

  gender?:
    | "Male"
    | "Female"
    | "Other";

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  password: string;

  role:
    | "super_admin"
    | "administrator"
    | "admin"
    | "employee"
    | "user";

  /**
   * Employee account blocking
   *
   * false = employee can login/use system
   * true  = employee is blocked
   */
  isBlocked: boolean;

  // =====================================================
  // PROFESSIONAL INFORMATION
  // =====================================================

  qualification: string;

  /**
   * Company Employee ID
   *
   * Example:
   * MM0001
   * MM0002
   * MM0003
   *
   * This is different from MongoDB _id.
   */
  employeeId?: string;

  department?: string;
  departmentId?: Types.ObjectId;

  designation?: string;
  designationId?: Types.ObjectId;

  // =====================================================
  // EMAIL VERIFICATION
  // =====================================================

  isEmailVerified: boolean;

  emailOtp?: string;
  emailOtpExpiresAt?: Date;

  emailOtpAttempts: number;
  emailOtpBlockedUntil?: Date;
  emailOtpResendAvailableAt?: Date;

  // =====================================================
  // PHONE VERIFICATION
  // =====================================================

  isPhoneVerified: boolean;

  phoneOtp?: string;
  phoneOtpExpiresAt?: Date;

  phoneOtpAttempts: number;
  phoneOtpBlockedUntil?: Date;
  phoneOtpResendAvailableAt?: Date;

  // =====================================================
  // PASSWORD RESET
  // =====================================================

  resetPasswordOtp?: string;
  resetPasswordOtpExpiresAt?: Date;

  resetPasswordOtpAttempts: number;
  resetPasswordOtpBlockedUntil?: Date;
  resetPasswordOtpResendAvailableAt?: Date;

  // =====================================================
  // PENDING CREDENTIAL VERIFICATION (CHANGE EMAIL / PHONE)
  // =====================================================

  pendingEmail?: string;
  pendingEmailOtp?: string;
  pendingEmailOtpExpiresAt?: Date;

  pendingPhone?: string;
  pendingCountryCode?: string;
  pendingPhoneOtp?: string;
  pendingPhoneOtpExpiresAt?: Date;

  // Cross-verification fields (Email & Phone changes)
  emailChangeCrossPhoneOtp?: string;
  emailChangeCrossPhoneOtpExpiresAt?: Date;
  emailChangeCrossToken?: string;
  emailChangeCrossTokenExpiresAt?: Date;

  phoneChangeCrossEmailOtp?: string;
  phoneChangeCrossEmailOtpExpiresAt?: Date;
  phoneChangeCrossToken?: string;
  phoneChangeCrossTokenExpiresAt?: Date;

  crossOtpResendAvailableAt?: Date;

  // Change Email Verification Challenge Session
  emailChangeChallengeId?: string;
  emailChangeChallengeExpiresAt?: Date;
  emailChangeStep?: number;
  emailChangeResendAvailableAt?: Date;

  // Change Phone Verification Challenge Session
  phoneChangeChallengeId?: string;
  phoneChangeChallengeExpiresAt?: Date;
  phoneChangeStep?: number;
  phoneChangeResendAvailableAt?: Date;


  // =====================================================
  // PROFILE
  // =====================================================

  profilePhoto?: string;
  profilePhotoPublicId?: string;
  coverImage?: string;
  coverImagePublicId?: string;

  // =====================================================
  // TIMESTAMPS
  // =====================================================

  // =====================================================
  // ACCOUNT LOCKOUT / BRUTE FORCE PROTECTION
  // =====================================================
  failedLoginAttempts?: number;
  lockUntil?: Date;

  // =====================================================
  // PASSWORD RESET SINGLE-USE SESSION
  // =====================================================
  resetPasswordSessionId?: string;

  // =====================================================
  // DPDP CONSENT RECORDING
  // =====================================================
  consent?: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    consentTimestamp: Date;
    termsVersion: string;
    privacyVersion: string;
    consentContext?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// USER SCHEMA
// =====================================================

const userSchema = new Schema<IUser>(
  {
    // =================================================
    // PERSONAL INFORMATION
    // =================================================

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // EMAIL
    // =================================================

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // =================================================
    // COUNTRY
    // =================================================

    country: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // COUNTRY CODE
    // =================================================

    countryCode: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // PHONE
    // =================================================

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =================================================
    // DATE OF BIRTH
    // =================================================

    dateOfBirth: {
      type: Date,
      required: false,
    },

    // =================================================
    // GENDER
    // =================================================

    gender: {
      type: String,
      enum: [
        "Male",
        "Female",
        "Other",
      ],
      required: false,
    },

    // =================================================
    // PASSWORD
    // =================================================

    password: {
      type: String,
      required: true,
      select: false,
    },

    // =================================================
    // ACCOUNT LOCKOUT / BRUTE FORCE PROTECTION
    // =================================================

    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockUntil: {
      type: Date,
      select: false,
    },

    // =================================================
    // QUALIFICATION
    // =================================================

    qualification: {
      type: String,
      required: true,
      trim: true,
    },

    // =================================================
    // ROLE
    // =================================================

    role: {
      type: String,
      enum: [
        "super_admin",
        "administrator",
        "admin",
        "employee",
        "user",
      ],
      default: "employee",
    },

    // =================================================
    // BLOCK STATUS
    // =================================================

    /**
     * Employee account status
     *
     * false → Active
     * true  → Blocked
     *
     * Existing and new employees are active by default.
     */
    isBlocked: {
      type: Boolean,
      default: false,
    },

    // =================================================
    // EMPLOYEE ID
    // =================================================
    //
    // MongoDB _id and employeeId are DIFFERENT.
    //
    // MongoDB _id:
    // 6a8bd41699eff09b26a37999
    //
    // Company employeeId:
    // MM0001
    //
    // Admin assigns employeeId.
    // =================================================

    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,

      // Only allow:
      // MM0001
      // MM0002
      // MM1234
      match: /^MM\d+$/,
    },

    // =================================================
    // DEPARTMENT
    // =================================================

    department: {
      type: String,
      trim: true,
      // No default — department is assigned explicitly after account creation.
      // "Administration" was removed as a predefined department option;
      // existing records that already have department="Administration" are
      // preserved as-is in the database (no migration is run here).
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    // =================================================
    // DESIGNATION
    // =================================================

    designation: {
      type: String,
      trim: true,
      default: "Employee",
    },

    designationId: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
      index: true,
    },

    // =================================================
    // EMAIL VERIFICATION
    // =================================================

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtp: {
      type: String,
      select: false,
    },

    emailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
    },

    emailOtpBlockedUntil: {
      type: Date,
      select: false,
    },

    emailOtpResendAvailableAt: {
      type: Date,
      select: false,
    },

    // =================================================
    // PHONE VERIFICATION
    // =================================================

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    phoneOtp: {
      type: String,
      select: false,
    },

    phoneOtpExpiresAt: {
      type: Date,
      select: false,
    },

    phoneOtpAttempts: {
      type: Number,
      default: 0,
    },

    phoneOtpBlockedUntil: {
      type: Date,
      select: false,
    },

    phoneOtpResendAvailableAt: {
      type: Date,
      select: false,
    },

    // =================================================
    // PASSWORD RESET
    // =================================================

    resetPasswordOtp: {
      type: String,
      select: false,
    },

    resetPasswordOtpExpiresAt: {
      type: Date,
      select: false,
    },

    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
    },

    resetPasswordOtpBlockedUntil: {
      type: Date,
      select: false,
    },

    resetPasswordOtpResendAvailableAt: {
      type: Date,
      select: false,
    },

    resetPasswordSessionId: {
      type: String,
      select: false,
    },

    // =================================================
    // PENDING CREDENTIAL VERIFICATION (CHANGE EMAIL / PHONE)
    // =================================================

    pendingEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    pendingEmailOtp: {
      type: String,
      select: false,
    },

    pendingEmailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    pendingPhone: {
      type: String,
      trim: true,
    },

    pendingCountryCode: {
      type: String,
      trim: true,
    },

    pendingPhoneOtp: {
      type: String,
      select: false,
    },

    pendingPhoneOtpExpiresAt: {
      type: Date,
      select: false,
    },

    // Cross-verification fields (Email & Phone changes)
    emailChangeCrossPhoneOtp: {
      type: String,
      select: false,
    },

    emailChangeCrossPhoneOtpExpiresAt: {
      type: Date,
      select: false,
    },

    emailChangeCrossToken: {
      type: String,
      select: false,
    },

    emailChangeCrossTokenExpiresAt: {
      type: Date,
      select: false,
    },

    phoneChangeCrossEmailOtp: {
      type: String,
      select: false,
    },

    phoneChangeCrossEmailOtpExpiresAt: {
      type: Date,
      select: false,
    },

    phoneChangeCrossToken: {
      type: String,
      select: false,
    },

    phoneChangeCrossTokenExpiresAt: {
      type: Date,
      select: false,
    },

    crossOtpResendAvailableAt: {
      type: Date,
      select: false,
    },

    // Change Email Verification Challenge Session
    emailChangeChallengeId: {
      type: String,
      select: false,
    },

    emailChangeChallengeExpiresAt: {
      type: Date,
      select: false,
    },

    emailChangeStep: {
      type: Number,
      select: false,
    },

    emailChangeResendAvailableAt: {
      type: Date,
      select: false,
    },

    // Change Phone Verification Challenge Session
    phoneChangeChallengeId: {
      type: String,
      select: false,
    },

    phoneChangeChallengeExpiresAt: {
      type: Date,
      select: false,
    },

    phoneChangeStep: {
      type: Number,
      select: false,
    },

    phoneChangeResendAvailableAt: {
      type: Date,
      select: false,
    },


    // =================================================
    // PROFILE PHOTO
    // =================================================

    profilePhoto: {
      type: String,
    },

    profilePhotoPublicId: {
      type: String,
    },

    // =================================================
    // COVER IMAGE
    // =================================================

    coverImage: {
      type: String,
    },

    coverImagePublicId: {
      type: String,
    },

    // =================================================
    // DPDP CONSENT RECORDING
    // =================================================

    consent: {
      termsAccepted: {
        type: Boolean,
        default: false,
      },
      privacyAccepted: {
        type: Boolean,
        default: false,
      },
      consentTimestamp: {
        type: Date,
        default: Date.now,
      },
      termsVersion: {
        type: String,
        default: "1.0",
      },
      privacyVersion: {
        type: String,
        default: "1.0",
      },
      consentContext: {
        type: String,
        default: "web_registration",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.profilePhotoPublicId;
        delete ret.coverImagePublicId;
        delete ret.password;
        delete ret.rememberMe;
        delete ret.emailOtp;
        delete ret.phoneOtp;
        delete ret.resetPasswordOtp;
        delete ret.pendingEmailOtp;
        delete ret.pendingPhoneOtp;
        delete ret.emailChangeCrossPhoneOtp;
        delete ret.emailChangeCrossToken;
        delete ret.phoneChangeCrossEmailOtp;
        delete ret.phoneChangeCrossToken;
        delete ret.emailChangeChallengeId;
        delete ret.phoneChangeChallengeId;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: any) => {
        delete ret.profilePhotoPublicId;
        delete ret.coverImagePublicId;
        delete ret.password;
        delete ret.rememberMe;
        delete ret.emailOtp;
        delete ret.phoneOtp;
        delete ret.resetPasswordOtp;
        delete ret.pendingEmailOtp;
        delete ret.pendingPhoneOtp;
        delete ret.emailChangeCrossPhoneOtp;
        delete ret.emailChangeCrossToken;
        delete ret.phoneChangeCrossEmailOtp;
        delete ret.phoneChangeCrossToken;
        delete ret.emailChangeChallengeId;
        delete ret.phoneChangeChallengeId;
        return ret;
      },
    },
  },
);

// =====================================================
// MODEL
// =====================================================

const User = mongoose.model<IUser>(
  "User",
  userSchema,
);

export default User;