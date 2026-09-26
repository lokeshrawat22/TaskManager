"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CalendarDays,
  Building2,
  KeyRound,
  Bell,
  Pencil,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  BadgeCheck,
  Camera,
  RotateCcw,
} from "lucide-react";

import { apiRequest } from "@/service/api.service";
import {
  uploadCoverImage,
  removeCoverImage,
  uploadProfilePhoto,
} from "@/service/auth.service";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import {
  validateFirstName,
  validateDOB,
} from "@/utils/RegisterValidation";

// Local last-name validator: multi-word allowed, alpha+spaces only, no length cap
const validateEditLastName = (value: string): string => {
  const name = value.trim();
  if (!name) return "Please enter your last name.";
  if (name.length < 2) return "Last name must contain at least 2 characters.";
  // Letters and single spaces between words only
  if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(name)) return "Last name can contain letters and spaces only.";
  // Each word must start with a capital letter
  const words = name.split(/\s+/);
  if (words.some((w) => !/^[A-Z][a-zA-Z]*$/.test(w))) {
    return "Each word in last name must start with a capital letter.";
  }
  return "";
};

import ProfileVerificationModals, {
  formatDisplayPhone,
  VerificationModalType,
  getPendingVerification,
} from "@/components/profile/ProfileVerificationModals";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ErrorMessage from "@/components/auth/ErrorMessage";
import { getRoleLabel } from "@/constants/rbac";

// =====================================================
// TYPES
// =====================================================

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  country?: string;
  countryCode?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
}

interface AdminProfile {
  _id: string;

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

  qualification: string;

  role:
    | "super_admin"
    | "administrator"
    | "admin"
    | "employee"
    | "user"
    | string;

  employeeId?: string;
  department?: string;
  designation?: string;

  isEmailVerified: boolean;
  isPhoneVerified: boolean;

  profilePhoto?: string;
  profilePhotoPublicId?: string;

  coverImage?: string;
  coverImagePublicId?: string;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// API RESPONSE
// =====================================================

interface AdminProfileResponse {
  success: boolean;
  message: string;
  data: AdminProfile;
}

// =====================================================
// PAGE
// =====================================================

export default function AdminProfilePage() {
  const { language, t } = useLanguage();
  const { updateCurrentUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    countryCode: "+91",
    phone: "",
    dateOfBirth: "",
    gender: "",
    qualification: "",
    employeeId: "",
    department: "",
    designation: "",
  });

  const { departmentNames: profileDeptNames } = useDepartments({ status: "ACTIVE" });
  const { designationNames: profileDesigNames } = useDesignations({
    department: form.department,
    status: "ACTIVE",
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profilePhotoRemoved, setProfilePhotoRemoved] = useState(false);
  const [savingProfilePhoto, setSavingProfilePhoto] = useState<boolean>(false);

  // Cover Image State
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [savingCover, setSavingCover] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    profilePhoto?: string;
  }>({});

  const getDateInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const maxDOB = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // =====================================================
  // VERIFICATION & CREDENTIAL MANAGEMENT STATE
  // =====================================================

  const [activeModal, setActiveModal] = useState<VerificationModalType>(() => {
    if (typeof window !== "undefined") {
      const pending = getPendingVerification();
      if (pending?.type) {
        return pending.type;
      }
    }
    return null;
  });
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleVerificationSuccess = useCallback(
    ({
      type,
      value,
      countryCode: newCC,
      isVerified,
    }: {
      type: "email" | "phone";
      value: string;
      countryCode?: string;
      isVerified: boolean;
    }) => {
      if (type === "email") {
        setProfile((prev) =>
          prev ? { ...prev, email: value, isEmailVerified: isVerified } : prev
        );
        setForm((prev) => ({ ...prev, email: value }));
        updateCurrentUser?.({ email: value, isEmailVerified: isVerified } as any);
      } else if (type === "phone") {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                phone: value,
                countryCode: newCC || prev.countryCode,
                isPhoneVerified: isVerified,
              }
            : prev
        );
        updateCurrentUser?.({
          phone: value,
          countryCode: newCC,
          isPhoneVerified: isVerified,
        } as any);
      }
    },
    [updateCurrentUser]
  );

  // =====================================================
  // AUTO OPEN EDIT MODE IF QUERY PARAM PRESENT
  // =====================================================

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("edit") === "true") {
        setEditing(true);
      }
    }
  }, []);

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (): Promise<void> => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest<AdminProfileResponse>(
          "/api/auth/profile",
          {
            method: "GET",
          }
        );

        if (!mounted) return;

        const user: any = response.data;
        const isEmailVerified = Boolean(
          user?.isEmailVerified ?? user?.emailVerified
        );
        const isPhoneVerified = Boolean(
          user?.isPhoneVerified ?? user?.phoneVerified
        );

        const normalizedUser: AdminProfile = {
          ...user,
          isEmailVerified,
          isPhoneVerified,
        };

        setProfile(normalizedUser);
        setProfilePhotoPreview(user.profilePhoto || "");
        setCoverImagePreview(user.coverImage || "");

        setForm({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          department: user.department || "",
          designation: user.designation || "System Administrator",
          dateOfBirth: getDateInputValue(user.dateOfBirth),
        });
      } catch (err: unknown) {
        if (!mounted) return;

        console.error("Profile error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load profile"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // PHOTO HANDLERS
  // =====================================================

  const handleProfilePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      const msg = "Only JPG, PNG and WebP images are allowed.";
      showToast.warning(msg);
      if (e.target) e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      const msg = "Profile photo must be less than 5 MB.";
      showToast.warning(msg);
      if (e.target) e.target.value = "";
      return;
    }

    try {
      setSavingProfilePhoto(true);
      const res = await uploadProfilePhoto(file);
      const updatedUser: AdminProfile = res?.data?.user || res?.data;

      if (updatedUser) {
        setProfile(updatedUser);
        setProfilePhotoPreview(updatedUser.profilePhoto || "");
        updateCurrentUser(updatedUser);
      }
      setProfilePhotoFile(null);
      setProfilePhotoRemoved(false);
      showToast.success(res?.message || "Profile photo updated successfully.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profilePhotoUpdated"));
      }
    } catch (err: any) {
      console.error("Profile photo upload error:", err);
      showToast.error(err?.message || "Failed to upload profile photo.");
    } finally {
      setSavingProfilePhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleProfilePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      const msg = "Only JPG, PNG and WebP images are allowed.";
      setFieldErrors((prev) => ({ ...prev, profilePhoto: msg }));
      setError(msg);
      showToast.warning(msg);
      setProfilePhotoFile(null);
      if (e.target) e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      const msg = "Profile photo must be less than 5 MB.";
      setFieldErrors((prev) => ({ ...prev, profilePhoto: msg }));
      setError(msg);
      showToast.warning(msg);
      setProfilePhotoFile(null);
      if (e.target) e.target.value = "";
      return;
    }

    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.profilePhoto;
      return updated;
    });
    setError("");
    setProfilePhotoFile(file);
    setProfilePhotoRemoved(false);

    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfilePhotoRemoved(true);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.profilePhoto;
      return updated;
    });
  };

  // =====================================================
  // COVER IMAGE HANDLERS
  // =====================================================

  useEffect(() => {
    return () => {
      if (coverImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast.warning("Only JPG, PNG and WebP images are allowed.");
      if (e.target) e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast.warning("Cover image must be 5MB or smaller.");
      if (e.target) e.target.value = "";
      return;
    }

    setCoverImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCoverImagePreview(previewUrl);
  };

  const handleCancelCoverChange = () => {
    if (coverImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImageFile(null);
    setCoverImagePreview(profile?.coverImage || "");
  };

  const handleSaveCoverImage = async () => {
    if (!coverImageFile) return;

    try {
      setSavingCover(true);
      const res = await uploadCoverImage(coverImageFile);
      const newCoverUrl = res?.data?.coverImage || res?.data?.user?.coverImage || "";

      setProfile((prev) => (prev ? { ...prev, coverImage: newCoverUrl } : prev));
      setCoverImagePreview(newCoverUrl);
      setCoverImageFile(null);
      updateCurrentUser?.({ coverImage: newCoverUrl } as any);
      showToast.success(res?.message || "Cover image updated successfully.");
    } catch (err: any) {
      console.error("Cover image upload error:", err);
      showToast.error(err?.message || "Failed to upload cover image.");
      setCoverImagePreview(profile?.coverImage || "");
      setCoverImageFile(null);
    } finally {
      setSavingCover(false);
    }
  };

  const handleRemoveCoverImage = async () => {
    try {
      setSavingCover(true);
      const res = await removeCoverImage();
      setProfile((prev) => (prev ? { ...prev, coverImage: undefined } : prev));
      setCoverImagePreview("");
      setCoverImageFile(null);
      updateCurrentUser?.({ coverImage: undefined } as any);
      showToast.success(res?.message || "Cover image removed. Default gradient restored.");
    } catch (err: any) {
      console.error("Cover image remove error:", err);
      showToast.error(err?.message || "Failed to remove cover image.");
    } finally {
      setSavingCover(false);
    }
  };

  // =====================================================
  // FIELD VALIDATION HANDLERS
  // =====================================================

  const handleFieldBlur = (fieldName: "firstName" | "lastName" | "dateOfBirth") => {
    let err = "";
    if (fieldName === "firstName") err = validateFirstName(form.firstName);
    else if (fieldName === "lastName") err = validateEditLastName(form.lastName);
    else if (fieldName === "dateOfBirth") err = validateDOB(form.dateOfBirth || "");

    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated[fieldName] = err;
      } else {
        delete updated[fieldName];
      }
      return updated;
    });
  };

  const handleFirstNameChange = (value: string) => {
    // Strip anything that is not a letter (no spaces, no digits, no punctuation)
    const letters = value.replace(/[^A-Za-z]/g, "");
    // Auto-capitalize first letter, keep the rest as typed
    const sanitized =
      letters.length > 0
        ? letters.charAt(0).toUpperCase() + letters.slice(1)
        : "";
    setForm((prev) => ({ ...prev, firstName: sanitized }));
    const err = validateFirstName(sanitized);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated.firstName = err;
      } else {
        delete updated.firstName;
      }
      return updated;
    });
  };

  const handleLastNameChange = (value: string) => {
    // Strip non-alpha and non-space characters
    let s = value.replace(/[^A-Za-z ]/g, "");
    // Prevent leading spaces
    s = s.replace(/^ +/, "");
    // Collapse consecutive spaces to a single space
    s = s.replace(/ {2,}/g, " ");
    // Auto-capitalize the first letter of each word
    s = s.replace(/(^| )([a-z])/g, (_, space, letter) => space + letter.toUpperCase());
    setForm((prev) => ({ ...prev, lastName: s }));
    const err = validateEditLastName(s);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated.lastName = err;
      } else {
        delete updated.lastName;
      }
      return updated;
    });
  };

  const handleDobChange = (value: string) => {
    setForm((prev) => ({ ...prev, dateOfBirth: value }));
    const err = validateDOB(value);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) {
        updated.dateOfBirth = err;
      } else {
        delete updated.dateOfBirth;
      }
      return updated;
    });
  };

  // =====================================================
  // GET NAME
  // =====================================================

  const getName = () => {
    const fullName = `${form.firstName} ${form.lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    return (
      `${profile?.firstName || ""} ${
        profile?.lastName || ""
      }`.trim() ||
      "Administrator"
    );
  };

  // =====================================================
  // GET INITIALS
  // =====================================================

  const getInitials = () => {
    const name = getName();

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date?: string) => {
    if (!date) {
      return t("common.notAvailable") || t("notAvailable") || "Not available";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return t("common.notAvailable") || t("notAvailable") || "Not available";
    }

    return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // =====================================================
  // CANCEL
  // =====================================================

  const handleCancel = () => {
    if (!profile) {
      setEditing(false);
      return;
    }

    setForm({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: profile.email || "",
      department: profile.department || "",
      designation: profile.designation || "System Administrator",
      dateOfBirth: getDateInputValue(profile.dateOfBirth),
    });

    setProfilePhotoFile(null);
    setProfilePhotoPreview(profile.profilePhoto || "");
    setProfilePhotoRemoved(false);
    setCoverImageFile(null);
    setCoverImagePreview(profile.coverImage || "");
    setFieldErrors({});
    setError("");
    setEditing(false);
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const handleSave = async () => {
    try {
      setError("");

      const firstNameErr = validateFirstName(form.firstName);
      const lastNameErr = validateEditLastName(form.lastName);
      const dobErr = form.dateOfBirth ? validateDOB(form.dateOfBirth) : "";

      const newErrors: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        profilePhoto?: string;
      } = {};

      if (firstNameErr) newErrors.firstName = firstNameErr;
      if (lastNameErr) newErrors.lastName = lastNameErr;
      if (dobErr) newErrors.dateOfBirth = dobErr;
      if (fieldErrors.profilePhoto) newErrors.profilePhoto = fieldErrors.profilePhoto;

      setFieldErrors(newErrors);

      if (firstNameErr || lastNameErr || dobErr || fieldErrors.profilePhoto) {
        const firstMsg =
          firstNameErr ||
          lastNameErr ||
          dobErr ||
          fieldErrors.profilePhoto ||
          "Please fix validation errors.";
        setError(firstMsg);
        showToast.warning(firstMsg);
        return;
      }

      setSaving(true);

      const formData = new FormData();
      formData.append("firstName", form.firstName.trim());
      formData.append("lastName", form.lastName.trim());
      if (form.department) {
        formData.append("department", form.department.trim());
      }
      if (form.designation) {
        formData.append("designation", form.designation.trim());
      }
      if (form.dateOfBirth) {
        formData.append("dateOfBirth", form.dateOfBirth);
      }
      if (profilePhotoFile) {
        formData.append("profilePhoto", profilePhotoFile);
      } else if (profilePhotoRemoved) {
        formData.append("removeProfilePhoto", "true");
      }

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.success) {
        throw new Error(response?.message || "Unable to update profile");
      }

      const updatedUser: AdminProfile = response.data?.user || response.data;

      setProfile(updatedUser);
      setProfilePhotoPreview(updatedUser.profilePhoto || "");
      setProfilePhotoFile(null);
      setProfilePhotoRemoved(false);
      setFieldErrors({});
      updateCurrentUser(updatedUser);

      setForm({
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        email: updatedUser.email || "",
        department: updatedUser.department || "",
        designation: updatedUser.designation || "System Administrator",
        dateOfBirth: getDateInputValue(updatedUser.dateOfBirth),
      });

      const successMsg = response?.message || "Profile updated successfully.";
      showToast.success(successMsg);
      setEditing(false);
    } catch (err: unknown) {
      console.error("Update profile error:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Unable to update profile";
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#F4F9FB] dark:bg-[#081C27] p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1400px] animate-pulse">
          <div className="h-40 rounded-3xl bg-white dark:bg-[#102A38]" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="h-[500px] rounded-3xl bg-white dark:bg-[#102A38]" />
            <div className="h-[500px] rounded-3xl bg-white dark:bg-[#102A38]" />
          </div>
        </div>
        <ProfileVerificationModals
          email={profile?.email || form.email}
          phone={profile?.phone}
          countryCode={profile?.countryCode || "+91"}
          isEmailVerified={profile?.isEmailVerified ?? false}
          isPhoneVerified={profile?.isPhoneVerified ?? false}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          onSuccess={handleVerificationSuccess}
        />
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error && !profile) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F4F9FB] dark:bg-[#081C27] p-6">
        <div className="w-full max-w-md rounded-3xl border border-[#C7D5DC] dark:border-[#3A5F71] bg-white dark:bg-[#102A38] p-8 text-center shadow-[0_10px_35px_rgba(6,61,99,.07)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1F1] dark:bg-[#482B30] text-[#C64B4B]">
            <User size={24} />
          </div>

          <h2 className="mt-5 text-xl font-bold text-[#063D63] dark:text-[#E5F1F5]">
            {t("unableToLoadProfile")}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#7D9099] dark:text-[#8FA8B2]">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-[#063D63] dark:bg-[#0B2A3A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#042E4B] dark:hover:bg-[#12455C]"
          >
            {t("tryAgain")}
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#F4F9FB] dark:bg-[#081C27]">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(#D7E7EC 1px, transparent 1px), linear-gradient(90deg, #D7E7EC 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* =================================================
            HEADER
        ================================================= */}
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE7EC] dark:border-[#3A5F71] bg-white dark:bg-[#102A38] px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#12B8C8]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#087D8F]">
                {t("account")}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#063D63] dark:text-[#E5F1F5] sm:text-4xl">
              {t("adminProfile")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#718894] dark:text-[#9FB6C0]">
              {t("manageYourAdministratorAccount")}
            </p>
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#063D63] dark:bg-[#0B2A3A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#042E4B] dark:hover:bg-[#12455C]"
            >
              <Pencil size={16} />
              {t("editProfile")}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE8EC] dark:border-[#3D6375] bg-white dark:bg-[#102A38] px-4 text-sm font-bold text-[#607985] dark:text-[#AFC5CE] transition hover:bg-[#F5FAFB] dark:hover:bg-[#18333F] disabled:opacity-50"
              >
                <X size={16} />
                {t("cancel")}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#087D8F] dark:bg-[#0A6674] px-5 text-sm font-bold text-white transition hover:bg-[#066B7B] dark:hover:bg-[#0B5865] disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? (t("common.saving") || "Saving...") : (t("common.saveChanges") || "Save Changes")}
              </button>
            </div>
          )}
        </section>

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}
        {error && profile && (
          <div className="mt-5 rounded-xl border border-[#F0D8D8] bg-[#FFF7F7] dark:bg-[#482B30] px-4 py-3 text-sm font-semibold text-[#C64B4B]">
            {error}
          </div>
        )}

        {/* =================================================
            PROFILE HERO
        ================================================= */}
        <section className="overflow-hidden rounded-3xl border border-[#C7D5DC] dark:border-[#3A5F71] bg-white dark:bg-[#102A38] shadow-[0_8px_30px_rgba(6,61,99,.055)]">
          {/* COVER */}
          <div className="relative h-[132px] sm:h-[150px] overflow-hidden bg-gradient-to-r from-[#063D63] via-[#075776] to-[#0B91A0] dark:from-[#082A3A] dark:via-[#0D4355] dark:to-[#08777F]">
            {/* Custom Cover Image if exists */}
            {coverImagePreview ? (
              <>
                <img
                  src={coverImagePreview}
                  alt="Profile cover banner"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/25" />
              </>
            ) : (
              <>
                {/* Default Grid Pattern */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                {/* Glow */}
                <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-[#43D2E5]/20 blur-3xl" />
              </>
            )}

            {/* COVER CONTROLS (TOP RIGHT) */}
            <div className="absolute right-3.5 top-3.5 z-30 flex items-center gap-2">
              {coverImageFile ? (
                /* Confirmation Controls when preview is active */
                <div className="flex items-center gap-1.5 rounded-xl bg-black/60 p-1 backdrop-blur-md border border-white/20 shadow-lg">
                  <button
                    type="button"
                    onClick={handleCancelCoverChange}
                    disabled={savingCover}
                    title="Cancel changes"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white/90 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X size={13} />
                    <span className="hidden sm:inline">{t("common.cancel") || "Cancel"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCoverImage}
                    disabled={savingCover}
                    title={t("common.saveCover") || "Save cover image"}
                    className="flex items-center gap-1.5 rounded-lg bg-[#087D8F] px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-[#066B7B] disabled:opacity-50"
                  >
                    {savingCover ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t("common.saving") || "Saving..."}</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>{t("common.saveCover") || "Save Cover"}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Standard View: Change / Remove buttons */
                <div className="flex items-center gap-2">
                  <label
                    title={t("common.changeCover") || "Change cover image"}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-xl bg-black/45 hover:bg-black/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-md transition ${
                      savingCover ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <Camera size={14} />
                    <span>
                      {coverImagePreview ? (t("common.changeCover") || "Change Cover") : (t("common.addCover") || "Add Cover")}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleCoverImageChange}
                      disabled={savingCover}
                    />
                  </label>

                  {coverImagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      disabled={savingCover}
                      title="Reset to default gradient"
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/45 hover:bg-red-500/80 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-md transition disabled:opacity-50"
                    >
                      {savingCover ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PROFILE CONTENT */}
          <div className="relative min-h-[112px] px-5 sm:px-7 pb-6 md:pb-0">
            {/* AVATAR */}
            <div className="relative -mt-12 mb-3 md:mb-0 md:mt-0 md:absolute md:left-7 md:top-[-48px] z-20">
              <div className="relative h-24 w-24">
                {/* Avatar Display */}
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-[#12B8C8] to-[#087D8F] text-2xl font-bold text-white shadow-[0_10px_28px_rgba(6,61,99,.22)] dark:border-[#102A38]">
                  {profilePhotoPreview ? (
                    <img
                      src={profilePhotoPreview}
                      alt={getName()}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials()
                  )}

                  {/* Uploading loading overlay */}
                  {savingProfilePhoto && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-xs text-white">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Profile Photo Camera Button (Bottom-Right) */}
                <label
                  title={t("common.changeProfilePhoto") || "Change profile photo"}
                  aria-label={t("common.changeProfilePhoto") || "Change profile photo"}
                  className={`group absolute bottom-0 right-0 z-30 flex h-7 w-7 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/30 shadow-md transition-all duration-150 hover:scale-105 active:scale-95 ${
                    savingProfilePhoto ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {savingProfilePhoto ? (
                    <Loader2 size={13} className="animate-spin text-white" />
                  ) : (
                    <Camera size={14} className="text-white transition-transform group-hover:scale-110" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleProfilePhotoUpload}
                    disabled={savingProfilePhoto}
                  />
                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/85 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 border border-white/10 z-40">
                    {t("common.changeProfilePhoto") || "Change profile photo"}
                  </span>
                </label>
              </div>

              {editing && profilePhotoPreview && (
                <div className="mt-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleRemoveProfilePhoto}
                    className="text-[11px] font-bold text-[#C64B4B] transition hover:underline dark:text-[#F08080]"
                  >
                    {t("common.removePhoto") || "Remove Photo"}
                  </button>
                </div>
              )}

              {fieldErrors.profilePhoto && (
                <div className="mt-1 max-w-[160px]">
                  <ErrorMessage message={fieldErrors.profilePhoto} />
                </div>
              )}
            </div>

            {/* NAME + ROLE */}
            <div className="flex min-h-0 md:min-h-[112px] items-center">
              <div className="w-full pl-0 md:pl-[112px] md:pr-[240px]">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#063D63] dark:text-[#E5F1F5]">
                    {getName()}
                  </h2>

                  {profile?.isEmailVerified && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF9F4] dark:bg-[#123C35] px-2.5 py-1 text-[10px] font-bold text-[#159779]">
                      <BadgeCheck size={12} />
                      {t("verified")}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-sm font-medium text-[#718894] dark:text-[#9FB6C0]">
                  {getRoleLabel(profile?.role, t)}
                </p>
              </div>
            </div>

            {/* ACCESS LEVEL */}
            <div className="mt-4 md:mt-0 md:absolute md:bottom-6 md:right-7">
              <div className="flex items-center gap-3 rounded-2xl border border-[#C7D5DC] dark:border-[#3A5F71] bg-[#F8FBFC] dark:bg-[#0D2430] px-4 py-3 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF7F9] dark:bg-[#123C46] text-[#087D8F]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#91A1A9] dark:text-[#8FA8B2]">
                    {t("accessLevel")}
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {getRoleLabel(profile?.role, t)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTENT
        ================================================= */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* PERSONAL INFORMATION */}
          <section className="rounded-3xl border border-[#C7D5DC] dark:border-[#3A5F71] bg-white dark:bg-[#102A38] shadow-[0_8px_30px_rgba(6,61,99,.045)]">
            <div className="border-b border-[#CCD8DF] dark:border-[#3A5F71] px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#087D8F]">
                {t("personalInformation")}
              </p>

              <h2 className="mt-1 text-xl font-bold text-[#063D63] dark:text-[#E5F1F5]">
                {t("accountDetails")}
              </h2>

              <p className="mt-1 text-sm text-[#8A9BA3] dark:text-[#8FA8B2]">
                {t("yourPersonalAndOrganizational")}
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {/* FIRST NAME */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("firstName")}
                </label>

                {editing ? (
                  <div>
                    <input
                      value={form.firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      onBlur={() => handleFieldBlur("firstName")}
                      className={`h-12 w-full rounded-xl border px-4 text-sm font-medium outline-none transition disabled:opacity-60 ${
                        fieldErrors.firstName
                          ? "border-red-400 bg-red-50/30 text-[#102A43] focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500 dark:bg-red-950/20 dark:text-[#E2EFF4]"
                          : "border-[#DDE8EC] bg-[#FAFCFD] text-[#315364] focus:border-[#087D8F] focus:bg-white focus:ring-4 focus:ring-[#087D8F]/10 dark:border-[#3A5F71] dark:bg-[#0D2430] dark:focus:bg-[#102A38] dark:text-[#D7E7EC]"
                      }`}
                    />
                    <ErrorMessage message={fieldErrors.firstName} />
                  </div>
                ) : (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F8FBFC] dark:bg-[#0D2430] px-4">
                    <User size={16} className="text-[#087D8F]" />
                    <span className="text-sm font-semibold text-[#536B77] dark:text-[#B7CCD5]">
                      {form.firstName || t("common.notAvailable") || t("notAvailable") || "Not available"}
                    </span>
                  </div>
                )}
              </div>

              {/* LAST NAME */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("lastName")}
                </label>

                {editing ? (
                  <div>
                    <input
                      value={form.lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      onBlur={() => handleFieldBlur("lastName")}
                      className={`h-12 w-full rounded-xl border px-4 text-sm font-medium outline-none transition disabled:opacity-60 ${
                        fieldErrors.lastName
                          ? "border-red-400 bg-red-50/30 text-[#102A43] focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500 dark:bg-red-950/20 dark:text-[#E2EFF4]"
                          : "border-[#DDE8EC] bg-[#FAFCFD] text-[#315364] focus:border-[#087D8F] focus:bg-white focus:ring-4 focus:ring-[#087D8F]/10 dark:border-[#3A5F71] dark:bg-[#0D2430] dark:focus:bg-[#102A38] dark:text-[#D7E7EC]"
                      }`}
                    />
                    <ErrorMessage message={fieldErrors.lastName} />
                  </div>
                ) : (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F8FBFC] dark:bg-[#0D2430] px-4">
                    <User size={16} className="text-[#087D8F]" />
                    <span className="text-sm font-semibold text-[#536B77] dark:text-[#B7CCD5]">
                      {form.lastName || t("common.notAvailable") || t("notAvailable") || "Not available"}
                    </span>
                  </div>
                )}
              </div>

              {/* DATE OF BIRTH */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("dateOfBirth1") || "Date of Birth"}
                </label>

                {editing ? (
                  <div>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      max={maxDOB}
                      onChange={(e) => handleDobChange(e.target.value)}
                      onBlur={() => handleFieldBlur("dateOfBirth")}
                      className={`h-12 w-full rounded-xl border px-4 text-sm font-medium outline-none transition disabled:opacity-60 ${
                        fieldErrors.dateOfBirth
                          ? "border-red-400 bg-red-50/30 text-[#102A43] focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500 dark:bg-red-950/20 dark:text-[#E2EFF4]"
                          : "border-[#DDE8EC] bg-[#FAFCFD] text-[#315364] focus:border-[#087D8F] focus:bg-white focus:ring-4 focus:ring-[#087D8F]/10 dark:border-[#3A5F71] dark:bg-[#0D2430] dark:focus:bg-[#102A38] dark:text-[#D7E7EC]"
                      }`}
                    />
                    <ErrorMessage message={fieldErrors.dateOfBirth} />
                  </div>
                ) : (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F8FBFC] dark:bg-[#0D2430] px-4">
                    <CalendarDays size={16} className="text-[#087D8F]" />
                    <span className="text-sm font-semibold text-[#536B77] dark:text-[#B7CCD5]">
                      {formatDate(profile?.dateOfBirth)}
                    </span>
                  </div>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                    {t("emailAddress")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveModal("change-email")}
                    className="text-xs font-bold text-[#087D8F] transition hover:underline dark:text-[#4CD3DF]"
                  >
                    {t("common.changeEmail") || t("changeEmail") || "Change Email"}
                  </button>
                </div>

                <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#BDCED6] bg-[#F1F5F6] px-3.5 py-2 dark:border-[#3D6375] dark:bg-[#18333F]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Mail
                      size={16}
                      className="shrink-0 text-[#718894] dark:text-[#9FB6C0]"
                    />
                    <span className="truncate text-sm font-semibold text-[#315364] dark:text-[#D7E7EC]">
                      {profile?.email || form.email || t("common.notAvailable") || t("notAvailable") || "Not available"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {profile?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF9F4] px-2.5 py-1 text-[10px] font-bold text-[#159779] dark:bg-[#123C35] dark:text-[#5FE3BE]">
                        <CheckCircle2 size={12} />
                        <span>{t("common.verified") || t("verified") || "Verified"}</span>
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E8] px-2.5 py-1 text-[10px] font-bold text-[#B87916] dark:bg-[#3D2C1A] dark:text-[#F3BA65]">
                          <AlertCircle size={12} />
                          <span>{t("common.notVerified") || t("notVerified") || "Not Verified"}</span>
                        </span>
                        {!editing && (
                          <button
                            type="button"
                            onClick={() => setActiveModal("verify-email")}
                            className="rounded-lg bg-[#087D8F] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-[#066574] dark:bg-[#4CD3DF] dark:text-[#063D63]"
                          >
                            {t("common.verifyEmail") || t("verifyEmail") || "Verify Email"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MOBILE NUMBER */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                    {t("common.mobileNumber") || t("mobileNumber") || "Mobile Number"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveModal("change-phone")}
                    className="text-xs font-bold text-[#087D8F] transition hover:underline dark:text-[#4CD3DF]"
                  >
                    {t("common.changeNumber") || t("changeNumber") || "Change Number"}
                  </button>
                </div>

                <div className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#BDCED6] bg-[#F1F5F6] px-3.5 py-2 dark:border-[#3D6375] dark:bg-[#18333F]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Phone
                      size={16}
                      className="shrink-0 text-[#718894] dark:text-[#9FB6C0]"
                    />
                    <span className="truncate text-sm font-semibold text-[#315364] dark:text-[#D7E7EC]">
                      {formatDisplayPhone(profile?.phone, profile?.countryCode)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {profile?.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF9F4] px-2.5 py-1 text-[10px] font-bold text-[#159779] dark:bg-[#123C35] dark:text-[#5FE3BE]">
                        <CheckCircle2 size={12} />
                        <span>{t("common.verified") || t("verified") || "Verified"}</span>
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E8] px-2.5 py-1 text-[10px] font-bold text-[#B87916] dark:bg-[#3D2C1A] dark:text-[#F3BA65]">
                          <AlertCircle size={12} />
                          <span>{t("common.notVerified") || t("notVerified") || "Not Verified"}</span>
                        </span>
                        {!editing && profile?.phone && (
                          <button
                            type="button"
                            onClick={() => setActiveModal("verify-phone")}
                            className="rounded-lg bg-[#087D8F] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-[#066574] dark:bg-[#4CD3DF] dark:text-[#063D63]"
                          >
                            {t("common.verifyPhone") || t("verifyPhone") || "Verify Number"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("department_text")}
                </label>

                {editing ? (
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        department: e.target.value,
                        designation: "",
                      })
                    }
                    className="h-12 w-full appearance-none rounded-xl border border-[#DDE8EC] dark:border-[#3D6375] bg-[#FAFCFD] dark:bg-[#0D2430] px-4 text-sm font-medium text-[#315364] dark:text-white outline-none transition focus:border-[#087D8F] focus:bg-white dark:focus:bg-[#102A38] focus:ring-4 focus:ring-[#087D8F]/10"
                  >
                    <option value="">{t("common.selectDepartment") || t("selectDepartment") || "Select Department"}</option>
                    {Array.from(new Set([...(form.department ? [form.department] : []), ...profileDeptNames])).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F8FBFC] dark:bg-[#0D2430] px-4">
                    <Building2
                      size={16}
                      className="text-[#087D8F]"
                    />

                    <span className="text-sm font-semibold text-[#536B77] dark:text-[#B7CCD5]">
                      {form.department}
                    </span>
                  </div>
                )}
              </div>

              {/* DESIGNATION */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("designation")}
                </label>

                {editing ? (
                  <select
                    value={form.designation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        designation: e.target.value,
                      })
                    }
                    disabled={!form.department && profileDesigNames.length === 0}
                    className="h-12 w-full appearance-none rounded-xl border border-[#DDE8EC] dark:border-[#3D6375] bg-[#FAFCFD] dark:bg-[#0D2430] px-4 text-sm font-medium text-[#315364] dark:text-white outline-none transition focus:border-[#087D8F] focus:bg-white dark:focus:bg-[#102A38] focus:ring-4 focus:ring-[#087D8F]/10 disabled:opacity-50"
                  >
                    <option value="">{t("common.selectDesignation") || t("selectDesignation") || "Select Designation"}</option>
                    {Array.from(new Set([...(form.designation ? [form.designation] : []), ...profileDesigNames])).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F8FBFC] dark:bg-[#0D2430] px-4">
                    <ShieldCheck
                      size={16}
                      className="text-[#087D8F]"
                    />

                    <span className="text-sm font-semibold text-[#536B77] dark:text-[#B7CCD5]">
                      {form.designation}
                    </span>
                  </div>
                )}
              </div>

              {/* EMPLOYEE ID */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("employeeId")}
                </label>

                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F1F5F6] dark:bg-[#18333F] px-4">
                  <BadgeCheck
                    size={16}
                    className="text-[#718894] dark:text-[#9FB6C0]"
                  />

                  <span className="font-mono text-sm font-semibold text-[#607985] dark:text-[#AFC5CE]">
                    {profile?.employeeId ||
                      profile?._id ||
                      "ADMIN"}
                  </span>
                </div>
              </div>

              {/* JOINING DATE */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#718894] dark:text-[#9FB6C0]">
                  {t("joinedOrganization")}
                </label>

                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#E4EDF0] dark:border-[#3D6375] bg-[#F1F5F6] dark:bg-[#18333F] px-4">
                  <CalendarDays
                    size={16}
                    className="text-[#718894] dark:text-[#9FB6C0]"
                  />

                  <span className="text-sm font-semibold text-[#607985] dark:text-[#AFC5CE]">
                    {formatDate(profile?.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECURITY */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-[#C7D5DC] dark:border-[#3A5F71] bg-white dark:bg-[#102A38] p-5 shadow-[0_8px_30px_rgba(6,61,99,.045)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7F9] dark:bg-[#123C46] text-[#087D8F]">
                  <Lock size={18} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {t("security")}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#91A1A9] dark:text-[#8FA8B2]">
                    {t("keepYourAdministratorAccount")}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-[#E1EBEF] dark:border-[#3D6375] bg-[#FAFCFD] dark:bg-[#0D2430] p-3.5 text-left transition hover:border-[#C9E1E6] hover:bg-[#F5FAFB] dark:hover:bg-[#18333F]"
                >
                  <div className="flex items-center gap-3">
                    <KeyRound
                      size={16}
                      className="text-[#087D8F]"
                    />

                    <div>
                      <p className="text-sm font-bold text-[#536B77] dark:text-[#B7CCD5]">
                        {t("changePassword")}
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#9AAAB2] dark:text-[#8FA8B2]">
                        {t("updateYourAccountPassword")}
                      </p>
                    </div>
                  </div>

                  <span className="text-[#A2B1B7] dark:text-[#8FA8B2]">
                    →
                  </span>
                </button>

                <div className="flex items-center justify-between rounded-xl border border-[#E1EBEF] dark:border-[#3D6375] bg-[#FAFCFD] dark:bg-[#0D2430] p-3.5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      size={16}
                      className="text-[#159779]"
                    />

                    <div>
                      <p className="text-sm font-bold text-[#536B77] dark:text-[#B7CCD5]">
                        {t("accountProtection")}
                      </p>

                      <p className="mt-0.5 text-[10px] text-[#9AAAB2] dark:text-[#8FA8B2]">
                        {t("authenticationIsActive")}
                      </p>
                    </div>
                  </div>

                  <span className="h-2.5 w-2.5 rounded-full bg-[#159779]" />
                </div>
              </div>
            </section>

            {/* ACCOUNT STATUS */}
            <section className="overflow-hidden rounded-3xl bg-[#063D63] dark:bg-[#071F2B] p-5 text-white shadow-[0_8px_30px_rgba(6,61,99,.12)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#43D2E5]">
                    {t("accountStatus")}
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    {t("activeProtected")}
                  </h3>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <Check
                    size={18}
                    className="text-[#43D2E5]"
                  />
                </div>
              </div>

              <p className="mt-2 text-xs leading-5 text-white/80">
                {t("yourAdministratorAccountIsFully")}
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-[#43D2E5]" />
                {t("full System Access")}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* =================================================
          SHARED VERIFICATION MODALS & REMINDER POPUP
      ================================================= */}
      <ProfileVerificationModals
        email={profile?.email || form.email}
        phone={profile?.phone}
        countryCode={profile?.countryCode || "+91"}
        isEmailVerified={profile?.isEmailVerified ?? false}
        isPhoneVerified={profile?.isPhoneVerified ?? false}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        onSuccess={handleVerificationSuccess}
      />

      {/* =================================================
          AUTHENTICATED CHANGE PASSWORD MODAL
      ================================================= */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </main>
  );
}