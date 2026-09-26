"use client";

import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  User,
  UserRound,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getEmployeeDashboard } from "@/service/dashboard.service";
import { apiRequest } from "@/service/api.service";
import {
  uploadCoverImage,
  removeCoverImage,
  uploadProfilePhoto,
} from "@/service/auth.service";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";
import ErrorMessage from "@/components/auth/ErrorMessage";
import ProfileVerificationModals, {
  formatDisplayPhone,
  VerificationModalType,
  getPendingVerification,
} from "@/components/profile/ProfileVerificationModals";
import { Modal } from "@/components/ui/Modal";
import {
  PageHeader,
  SectionCard,
  ProgressBar,
  LoadingState,
  ErrorState,
} from "@/components/employee/SharedUI";

// Local validators keep this production page independent of the optional
// RegisterValidation module.
const validateFirstName = (value: string): string => {
  const name = value.trim();
  if (!name) return "Please enter your first name.";
  if (name.length < 2) return "First name must contain at least 2 characters.";
  if (!/^[A-Za-z]+$/.test(name)) {
    return "First name can contain letters only.";
  }
  if (!/^[A-Z]/.test(name)) {
    return "First name must start with a capital letter.";
  }
  return "";
};

const validateDOB = (value: string): string => {
  if (!value) return "Please enter your date of birth.";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Please enter a valid date of birth.";
  if (date > new Date()) return "Date of birth cannot be in the future.";
  return "";
};

// Local last-name validator: multi-word allowed, alpha+spaces only, no length cap
const validateEditLastName = (value: string): string => {
  const name = value.trim();
  if (!name) return "Please enter your last name.";
  if (name.length < 2) return "Last name must contain at least 2 characters.";
  if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(name))
    return "Last name can contain letters and spaces only.";
  const words = name.split(/\s+/);
  if (words.some((w) => !/^[A-Z][a-zA-Z]*$/.test(w))) {
    return "Each word in last name must start with a capital letter.";
  }
  return "";
};

// =====================================================
// TYPES
// =====================================================

type UserProfile = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  country?: string;
  countryCode?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  designation?: string;
  department?: string;
  employeeId?: string;
  employeeCode?: string;
  profilePhoto?: string | null | { url?: string; path?: string; secure_url?: string };
  profileImage?: string;
  avatar?: string;
  image?: string;
  coverImage?: string;
  coverImagePublicId?: string;
  status?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  data?: {
    user?: UserProfile;
    profile?: UserProfile;
    overview?: {
      totalTasks?: number;
      pendingTasks?: number;
      inProgressTasks?: number;
      completedTasks?: number;
      overdueTasks?: number;
      completionRate?: number;
    };
  };
};

// =====================================================
// HELPERS
// =====================================================

function getProfilePhotoValue(user?: UserProfile | null): string {
  const photo = user?.profilePhoto;
  if (typeof photo === "string") return photo.trim();
  if (photo && typeof photo === "object") {
    return (photo.url || photo.secure_url || photo.path || "").trim();
  }
  return (user?.profileImage || user?.avatar || user?.image || "").trim();
}

function getName(user?: UserProfile) {
  if (!user) return "Employee";
  if (user.fullName?.trim()) return user.fullName.trim();
  if (user.name?.trim()) return user.name.trim();

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "Employee";
}

function getInitials(user?: UserProfile) {
  const name = getName(user);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "EM";
}

function formatDate(date?: string) {
  if (!date) return "Not provided";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not provided";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeStatus(status?: string) {
  return status?.toUpperCase().replace(/\s+/g, "_") || "ACTIVE";
}

function getStatusLabel(status?: string) {
  const value = normalizeStatus(status);
  if (value === "INACTIVE" || value === "DISABLED") return "Inactive";
  if (value === "AWAY" || value === "ON_LEAVE") return "Away";
  return "Active";
}

// =====================================================
// MAIN PROFILE PAGE
// =====================================================

export default function ProfilePage() {
  const { t } = useLanguage();
  const { currentUser, updateCurrentUser } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(
    (currentUser as UserProfile | null) || null
  );
  const [overview, setOverview] = useState<
    NonNullable<DashboardResponse["data"]>["overview"]
  >({});
  const [loading, setLoading] = useState(!currentUser);
  const [error, setError] = useState("");

  const [activeModal, setActiveModal] = useState<VerificationModalType>(() => {
    if (typeof window !== "undefined") {
      const pending = getPendingVerification();
      if (pending?.type) {
        return pending.type;
      }
    }
    return null;
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profilePhotoRemoved, setProfilePhotoRemoved] = useState(false);
  const [profileImageVersion, setProfileImageVersion] = useState(() => Date.now());
  const [savingProfilePhoto, setSavingProfilePhoto] = useState<boolean>(false);

  // Cover Image State
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [savingCover, setSavingCover] = useState<boolean>(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState("");
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    profilePhoto?: string;
  }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("edit") === "true") {
        setEditOpen(true);
      }
    }
  }, []);

  const maxDOB = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const UPDATE_PROFILE_ENDPOINT = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "")}/api/auth/profile`;

  const getDateInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const fetchLatestProfile = async (): Promise<UserProfile | null> => {
    try {
      const json = await apiRequest<any>("/api/auth/profile", {
        method: "GET",
      });

      if (!json?.success) return null;

      const userObj =
        json?.data?.user ||
        json?.data?.profile ||
        json?.data ||
        json?.user ||
        json?.profile ||
        null;

      if (!userObj) return null;

      const isEmailVerified = Boolean(
        userObj.isEmailVerified ?? userObj.emailVerified
      );
      const isPhoneVerified = Boolean(
        userObj.isPhoneVerified ?? userObj.phoneVerified
      );

      return {
        ...userObj,
        isEmailVerified,
        isPhoneVerified,
        emailVerified: isEmailVerified,
        phoneVerified: isPhoneVerified,
      };
    } catch {
      return null;
    }
  };

  const fetchProfile = async (isMounted = true) => {
    try {
      if (!user && !currentUser) {
        setLoading(true);
      }
      setError("");

      const [dashRes, latestUser] = await Promise.allSettled([
        getEmployeeDashboard() as Promise<DashboardResponse>,
        fetchLatestProfile(),
      ]);

      if (!isMounted) return;

      let userObj: any = null;
      if (latestUser.status === "fulfilled" && latestUser.value) {
        userObj = latestUser.value;
      }

      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        const data = dashRes.value.data;
        setOverview(data?.overview || {});
        userObj = {
          ...(data?.user || data?.profile || {}),
          ...(userObj || {}),
        };
      }

      if (
        !userObj &&
        dashRes.status === "rejected" &&
        latestUser.status === "rejected"
      ) {
        throw new Error("Failed to load profile");
      }

      if (userObj) {
        const isEmailVerified = Boolean(
          userObj.isEmailVerified ?? userObj.emailVerified
        );
        const isPhoneVerified = Boolean(
          userObj.isPhoneVerified ?? userObj.phoneVerified
        );
        const normalized: UserProfile = {
          ...userObj,
          isEmailVerified,
          isPhoneVerified,
          emailVerified: isEmailVerified,
          phoneVerified: isPhoneVerified,
        };
        setUser(normalized);
        setCoverImagePreview(normalized.coverImage || "");
        updateCurrentUser(normalized);
      }
    } catch (err: any) {
      if (!isMounted) return;
      console.error("Profile error:", err);
      setError(t("unableToLoadYour") || "Unable to load your profile.");
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const openEditProfile = () => {
    const currentImage = getProfilePhotoValue(user);

    setEditFirstName(user?.firstName || "");
    setEditLastName(user?.lastName || "");
    setEditDepartment(user?.department || "");
    setEditDesignation(user?.designation || "");
    setEditDateOfBirth(getDateInputValue(user?.dateOfBirth));
    setProfilePhotoFile(null);
    setProfilePhotoPreview(currentImage);
    setProfilePhotoRemoved(false);
    setFieldErrors({});
    setProfileUpdateError("");
    setProfileUpdateSuccess("");
    setEditOpen(true);
  };

  const handleProfilePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      showToast.warning("Profile photo must be less than 5 MB.");
      if (e.target) e.target.value = "";
      return;
    }

    try {
      setSavingProfilePhoto(true);
      const res = await uploadProfilePhoto(file);
      const rawUser = res?.data?.user || res?.data;
      if (rawUser) {
        const isEmailVerified = Boolean(
          rawUser.isEmailVerified ?? rawUser.emailVerified
        );
        const isPhoneVerified = Boolean(
          rawUser.isPhoneVerified ?? rawUser.phoneVerified
        );
        const updated: UserProfile = {
          ...rawUser,
          isEmailVerified,
          isPhoneVerified,
          emailVerified: isEmailVerified,
          phoneVerified: isPhoneVerified,
        };
        setUser((prev) => (prev ? { ...prev, ...updated } : updated));
        setProfilePhotoPreview(getProfilePhotoValue(updated));
        updateCurrentUser(updated);
      }
      setProfileImageVersion(Date.now());
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
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const msg = "Only JPG, PNG and WebP images are allowed.";
      setFieldErrors((prev) => ({ ...prev, profilePhoto: msg }));
      setProfileUpdateError(msg);
      showToast.warning(msg);
      setProfilePhotoFile(null);
      setProfilePhotoPreview("");
      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const msg = "Profile photo must be less than 5 MB.";
      setFieldErrors((prev) => ({ ...prev, profilePhoto: msg }));
      setProfileUpdateError(msg);
      showToast.warning(msg);
      setProfilePhotoFile(null);
      setProfilePhotoPreview("");
      event.target.value = "";
      return;
    }

    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.profilePhoto;
      return updated;
    });
    setProfileUpdateError("");
    setProfilePhotoFile(file);
    setProfilePhotoRemoved(false);

    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
  };

  const removeProfilePhoto = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview("");
    setProfilePhotoRemoved(true);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated.profilePhoto;
      return updated;
    });
  };

  const handleFieldBlur = (fieldName: "firstName" | "lastName" | "dateOfBirth") => {
    let err = "";
    if (fieldName === "firstName") err = validateFirstName(editFirstName);
    else if (fieldName === "lastName") err = validateEditLastName(editLastName);
    else if (fieldName === "dateOfBirth") err = validateDOB(editDateOfBirth);

    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) updated[fieldName] = err;
      else delete updated[fieldName];
      return updated;
    });
  };

  const handleFirstNameChange = (value: string) => {
    const letters = value.replace(/[^A-Za-z]/g, "");
    const sanitized =
      letters.length > 0 ? letters.charAt(0).toUpperCase() + letters.slice(1) : "";
    setEditFirstName(sanitized);
    const err = validateFirstName(sanitized);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) updated.firstName = err;
      else delete updated.firstName;
      return updated;
    });
  };

  const handleLastNameChange = (value: string) => {
    let s = value.replace(/[^A-Za-z ]/g, "");
    s = s.replace(/^ +/, "");
    s = s.replace(/ {2,}/g, " ");
    s = s.replace(/(^| )([a-z])/g, (_, space, letter) => space + letter.toUpperCase());
    setEditLastName(s);
    const err = validateEditLastName(s);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) updated.lastName = err;
      else delete updated.lastName;
      return updated;
    });
  };

  const handleDobChange = (value: string) => {
    setEditDateOfBirth(value);
    const err = validateDOB(value);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) updated.dateOfBirth = err;
      else delete updated.dateOfBirth;
      return updated;
    });
  };

  const handleUpdateProfile = async () => {
    const firstNameErr = validateFirstName(editFirstName);
    const lastNameErr = validateEditLastName(editLastName);
    const dobErr = validateDOB(editDateOfBirth);

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
      const firstError =
        firstNameErr ||
        lastNameErr ||
        dobErr ||
        fieldErrors.profilePhoto ||
        "Please fix the validation errors.";
      setProfileUpdateError(firstError);
      showToast.warning(firstError);
      return;
    }

    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();
    const department = editDepartment.trim();
    const designation = editDesignation.trim();

    try {
      setSavingProfile(true);
      setProfileUpdateError("");
      setProfileUpdateSuccess("");

      const formData = new FormData();
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("department", department);
      formData.append("designation", designation);

      if (editDateOfBirth) {
        formData.append("dateOfBirth", editDateOfBirth);
      }

      if (profilePhotoFile) {
        formData.append("profilePhoto", profilePhotoFile);
      } else if (profilePhotoRemoved) {
        formData.append("removeProfilePhoto", "true");
      }

      const result = await apiRequest<any>("/api/auth/profile", {
        method: "PUT",
        body: formData,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to update your profile.");
      }

      const rawUser = result.data?.user || result.data || result.user || {};
      const isEmailVerified = Boolean(
        rawUser.isEmailVerified ?? rawUser.emailVerified
      );
      const isPhoneVerified = Boolean(
        rawUser.isPhoneVerified ?? rawUser.phoneVerified
      );
      const updatedUser: UserProfile = {
        ...rawUser,
        isEmailVerified,
        isPhoneVerified,
        emailVerified: isEmailVerified,
        phoneVerified: isPhoneVerified,
      };

      setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
      updateCurrentUser(updatedUser);

      setProfilePhotoFile(null);
      setProfilePhotoRemoved(false);
      setProfilePhotoPreview(getProfilePhotoValue(updatedUser));
      setProfileImageVersion(Date.now());

      const successMsg = result?.message || "Profile updated successfully.";
      setProfileUpdateSuccess(successMsg);
      showToast.success(successMsg);

      setTimeout(() => {
        setEditOpen(false);
        setProfileUpdateSuccess("");
      }, 700);
    } catch (err: any) {
      console.error("Update profile error:", err);
      const errorMsg = err?.message || "Unable to update your profile.";
      setProfileUpdateError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

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
    setCoverImagePreview(user?.coverImage || "");
  };

  const handleSaveCoverImage = async () => {
    if (!coverImageFile) return;

    try {
      setSavingCover(true);
      const res = await uploadCoverImage(coverImageFile);
      const newCoverUrl = res?.data?.coverImage || res?.data?.user?.coverImage || "";

      setUser((prev) => (prev ? { ...prev, coverImage: newCoverUrl } : prev));
      setCoverImagePreview(newCoverUrl);
      setCoverImageFile(null);
      updateCurrentUser?.({ coverImage: newCoverUrl } as any);
      showToast.success(res?.message || "Cover image updated successfully.");
    } catch (err: any) {
      console.error("Cover image upload error:", err);
      showToast.error(err?.message || "Failed to upload cover image.");
      setCoverImagePreview(user?.coverImage || "");
      setCoverImageFile(null);
    } finally {
      setSavingCover(false);
    }
  };

  const handleRemoveCoverImage = async () => {
    try {
      setSavingCover(true);
      const res = await removeCoverImage();
      setUser((prev) => (prev ? { ...prev, coverImage: undefined } : prev));
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

  useEffect(() => {
    let isMounted = true;
    fetchProfile(isMounted);

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading employee profile..." rows={6} />;
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-md py-12">
        <ErrorState message={error || "Profile not found"} onRetry={fetchProfile} />
      </div>
    );
  }

  const name = getName(user);
  const initials = getInitials(user);
  const profileImage = getProfilePhotoValue(user);

  const profileImageUrl = (() => {
    if (!profileImage) return "";
    const value = profileImage.trim();
    const version = encodeURIComponent(
      `${user.updatedAt || "latest"}-${profileImageVersion}`
    );

    if (/^(https?:)?\/\//i.test(value)) {
      return `${value}${value.includes("?") ? "&" : "?"}v=${version}`;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    const absoluteUrl = apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;

    return `${absoluteUrl}${absoluteUrl.includes("?") ? "&" : "?"}v=${version}`;
  })();

  const formatRoleLabel = (r?: string) => {
    if (!r) return "Employee";
    const lower = r.toLowerCase().trim();
    if (lower === "user" || lower === "employee") return "Employee";
    if (lower === "admin") return "Administrator";
    return r;
  };

  const role = formatRoleLabel(user.designation || user.role);
  const department = user.department || "Not specified";
  const status = getStatusLabel(user.status);

  const completedTasks = overview?.completedTasks || 0;
  const overdueTasks = overview?.overdueTasks || 0;
  const completionRate = overview?.completionRate || 0;
  const employeeId =
    user.employeeId || user.employeeCode || user._id || user.id || "Not assigned";

  const isEmailVerified = Boolean(
    user.isEmailVerified ?? (user as any).emailVerified
  );
  const isPhoneVerified = Boolean(
    user.isPhoneVerified ?? (user as any).phoneVerified
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <PageHeader
        title={t("employeeProfile") || "Employee Profile"}
        subtitle="Manage your personal information, credentials, and track your performance records"
        eyebrow="ACCOUNT"
        icon={UserRound}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile" },
        ]}
        actions={
          <button
            type="button"
            onClick={openEditProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1D4ED8] transition-colors cursor-pointer"
          >
            <Pencil size={14} />
            <span>{t("editProfile") || "Edit Profile"}</span>
          </button>
        }
      />

      {/* =================================================
          PROFILE HERO BANNER
      ================================================= */}
      <section className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="relative h-[180px] overflow-hidden bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#2563EB] dark:from-[#05131C] dark:via-[#0B202B] dark:to-[#0C3345] sm:h-[180px]">
          {coverImagePreview ? (
            <>
              <img src={coverImagePreview} alt="Profile cover banner" className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-[#0F172A]/25" />
            </>
          ) : (
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
          )}

          <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 sm:py-4">
            <span className="hidden min-[400px]:inline-block rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              Employee Workspace
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {coverImageFile ? (
                <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-black/45 p-1 backdrop-blur-md">
                  <button type="button" onClick={handleCancelCoverChange} disabled={savingCover} className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveCoverImage} disabled={savingCover} className="inline-flex items-center gap-1.5 rounded-md bg-[#2563EB] px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60">
                    {savingCover ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md transition hover:bg-black/50">
                    <Camera size={13} />
                    {coverImagePreview ? "Change Cover" : "Add Cover"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverImageChange} disabled={savingCover} />
                  </label>
                  {coverImagePreview && (
                    <button type="button" onClick={handleRemoveCoverImage} disabled={savingCover} title="Remove custom cover" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/35 text-white backdrop-blur-md transition hover:bg-red-500/80 disabled:opacity-60">
                      <RotateCcw size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-5">
              <div className="relative shrink-0">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#EFF6FF] text-3xl font-bold text-[#2563EB] shadow-md dark:border-[#0B202B] dark:bg-[#0C3345] dark:text-[#38BDF8] sm:h-32 sm:w-32">
                  {profileImage ? (
                    <img src={profileImageUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                  {savingProfilePhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white backdrop-blur-sm">
                      <Loader2 size={22} className="animate-spin" />
                    </div>
                  )}
                </div>
                <label title="Change profile photo" className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#1E3A47]">
                  <Camera size={14} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhotoUpload} disabled={savingProfilePhoto} />
                </label>
              </div>

              <div className="min-w-0 pb-1 sm:pb-2 translate-y-0 sm:translate-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[28px] sm:text-[30px] leading-[1.1] font-extrabold tracking-tight text-[#0F172A] dark:text-white">{name}</h2>
                  {isEmailVerified && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-bold text-[#16A34A] dark:border-[#14532D] dark:bg-[#052E16] dark:text-[#4ADE80]">
                      <BadgeCheck size={11} /> Verified
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[14px] leading-5 font-medium text-[#64748B] dark:text-[#94A3B8]">
                  {role}{department !== "Not specified" ? ` · ${department}` : ""}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B] dark:text-[#94A3B8]">
                  Employee ID: <span className="font-mono font-semibold text-[#0F172A] dark:text-[#CBD5E1]">{employeeId}</span>
                </p>
              </div>
            </div>

            <span className="mb-2 inline-flex w-fit translate-y-3 sm:translate-y-4 items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-1.5 text-[11px] font-bold text-[#16A34A] dark:border-[#14532D] dark:bg-[#052E16] dark:text-[#4ADE80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
              {status}
            </span>
          </div>
        </div>
      </section>

      {/* =================================================
          TWO COLUMN CONTENT (INFO + STATS)
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: PERSONAL & PROFESSIONAL DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <SectionCard
            title={t("personalInformation") || "Personal Information"}
            subtitle="Account credentials and contact channels"
            icon={User}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Full Name
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {name}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                    Email Address
                  </span>
                  {isEmailVerified ? (
                    <span className="text-[10.5px] font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      ✓ Verified
                    </span>
                  ) : (
                    user.email && (
                      <button
                        type="button"
                        onClick={() => setActiveModal("verify-email")}
                        className="text-[10.5px] font-bold text-[#2563EB] hover:underline dark:text-[#38BDF8]"
                      >
                        Verify Now
                      </button>
                    )
                  )}
                </div>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white truncate">
                  {user.email || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                    Mobile Phone
                  </span>
                  {isPhoneVerified ? (
                    <span className="text-[10.5px] font-bold text-[#16A34A] dark:text-[#4ADE80]">
                      ✓ Verified
                    </span>
                  ) : (
                    user.phone && (
                      <button
                        type="button"
                        onClick={() => setActiveModal("verify-phone")}
                        className="text-[10.5px] font-bold text-[#2563EB] hover:underline dark:text-[#38BDF8]"
                      >
                        Verify Now
                      </button>
                    )
                  )}
                </div>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {formatDisplayPhone(user.phone, user.countryCode)}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Date of Birth
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {formatDate(user.dateOfBirth)}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Gender
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {user.gender || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Country
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {user.country || "Not specified"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Professional Information */}
          <SectionCard
            title="Professional Assignment"
            subtitle="Organizational placement, role, and tenure"
            icon={Building2}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Employee ID
                </span>
                <p className="mt-1 text-sm font-mono font-bold text-[#0F172A] dark:text-white">
                  {employeeId}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Assigned Department
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {department}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Designation / Role
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {role}
                </p>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E3A47] dark:bg-[#071923]">
                <span className="font-semibold uppercase text-[#64748B] dark:text-[#94A3B8] text-[10.5px] tracking-wider">
                  Joined Organization
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A] dark:text-white">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT 1 COL: PERFORMANCE & SECURITY SUMMARY */}
        <div className="space-y-6">
          <SectionCard
            title="Performance Summary"
            subtitle="Individual delivery record"
            icon={TrendingUp}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Completion Rate
                  </span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {completionRate}%
                  </span>
                </div>
                <ProgressBar percentage={completionRate} color="blue" size="md" />
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2 text-xs dark:border-[#1E3A47] dark:bg-[#071923]">
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Tasks Completed:</span>
                  <span className="font-bold text-[#16A34A] dark:text-[#4ADE80]">
                    {completedTasks}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Overdue Tasks:</span>
                  <span className="font-bold text-[#DC2626] dark:text-[#F87171]">
                    {overdueTasks}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/reports"
                className="block text-center rounded-xl border border-[#CBD5E1] bg-white py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8] dark:hover:bg-[#0C3345] transition-colors"
              >
                View Detailed Reports
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Account Security"
            subtitle="Verification & credentials"
            icon={ShieldCheck}
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Email Verification</span>
                {isEmailVerified ? (
                  <span className="font-bold text-[#16A34A] dark:text-[#4ADE80]">Verified</span>
                ) : (
                  <span className="font-bold text-[#D97706] dark:text-[#FBBF24]">Pending</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Phone Verification</span>
                {isPhoneVerified ? (
                  <span className="font-bold text-[#16A34A] dark:text-[#4ADE80]">Verified</span>
                ) : (
                  <span className="font-bold text-[#D97706] dark:text-[#FBBF24]">Pending</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-[#94A3B8]">Password Protection</span>
                <span className="font-bold text-[#16A34A] dark:text-[#4ADE80]">Active</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}
      <Modal
        isOpen={editOpen}
        onClose={() => {
          if (!savingProfile) setEditOpen(false);
        }}
        className="w-[calc(100vw-32px)] max-w-[740px]"
        style={{ maxWidth: "740px", width: "calc(100vw - 32px)" }}
      >
        <div
          className="flex max-h-[88vh] w-full max-w-[740px] flex-col overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-2xl dark:border-[#1E3A47] dark:bg-[#0B202B]"
          style={{ maxWidth: "740px", width: "calc(100vw - 32px)" }}
        >
          {/* MODAL HEADER */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5 dark:border-[#1E3A47]">
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-white">
                Edit Profile
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Update employee information and profile details.
              </p>
            </div>

            <button
              type="button"
              disabled={savingProfile}
              onClick={() => setEditOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors dark:hover:bg-[#1E3A47] dark:hover:text-white disabled:opacity-50 cursor-pointer"
              aria-label="Close edit profile modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* MODAL SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {profileUpdateError && (
              <div className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#DC2626] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171]">
                <AlertCircle size={14} className="shrink-0" />
                <span>{profileUpdateError}</span>
              </div>
            )}

            {profileUpdateSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#16A34A] dark:border-[#14532D] dark:bg-[#052E16] dark:text-[#4ADE80]">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{profileUpdateSuccess}</span>
              </div>
            )}

            {/* PROFILE AVATAR SECTION */}
            <div className="flex items-center gap-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#1E3A47] dark:bg-[#071923]">
              <div className="relative shrink-0">
                {profilePhotoPreview ? (
                  <img
                    src={profilePhotoPreview}
                    alt="Profile Avatar"
                    className="h-14 w-14 rounded-xl object-cover border border-[#CBD5E1] shadow-xs dark:border-[#1E3A47]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#EFF6FF] text-sm font-bold text-[#2563EB] border border-[#BFDBFE] dark:border-[#1E3A47] dark:bg-[#0C3345] dark:text-[#38BDF8]">
                    {initials}
                  </div>
                )}
                <label
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#2563EB] text-white shadow-xs hover:bg-[#1D4ED8] transition-colors"
                  title="Change photo"
                >
                  <Camera size={10} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleProfilePhotoChange}
                    disabled={savingProfile}
                  />
                </label>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">Profile Photo</h4>
                    {user?.role && (
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569] dark:bg-[#1E3A47] dark:text-[#CBD5E1]">
                        {user.role.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    JPG, PNG or WebP • Max 5MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white transition-colors">
                    <span>{profilePhotoPreview ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleProfilePhotoChange}
                      disabled={savingProfile}
                    />
                  </label>
                  {profilePhotoPreview && (
                    <button
                      type="button"
                      onClick={removeProfilePhoto}
                      disabled={savingProfile}
                      className="inline-flex items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] dark:border-[#591B21] dark:bg-[#341417] dark:text-[#F87171] transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Personal Information
                </span>
                <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#1E3A47]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                    First Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    onBlur={() => handleFieldBlur("firstName")}
                    disabled={savingProfile}
                    placeholder="First name"
                    className="h-10 sm:h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-xs sm:text-[13px] font-medium text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#1E3A47] dark:bg-[#071923] dark:text-white"
                  />
                  <ErrorMessage message={fieldErrors.firstName} />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                    Last Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    onBlur={() => handleFieldBlur("lastName")}
                    disabled={savingProfile}
                    placeholder="Last name"
                    className="h-10 sm:h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-xs sm:text-[13px] font-medium text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#1E3A47] dark:bg-[#071923] dark:text-white"
                  />
                  <ErrorMessage message={fieldErrors.lastName} />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                    Date of Birth <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => handleDobChange(e.target.value)}
                    onBlur={() => handleFieldBlur("dateOfBirth")}
                    disabled={savingProfile}
                    max={maxDOB}
                    className="h-10 sm:h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 text-xs sm:text-[13px] font-medium text-[#0F172A] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 dark:border-[#1E3A47] dark:bg-[#071923] dark:text-white"
                  />
                  <ErrorMessage message={fieldErrors.dateOfBirth} />
                </div>

                {/* Gender (Read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Gender
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      <Lock size={10} /> Read-only
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.gender || "Not specified"}
                    className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3.5 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: WORK INFORMATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Work Information
                </span>
                <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#1E3A47]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Department */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Department
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      <Lock size={10} /> Admin managed
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={user?.department || "General"}
                      className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] pl-3.5 pr-8 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed"
                    />
                    <Building2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                {/* Designation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Designation
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      <Lock size={10} /> Admin managed
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={user?.designation || "Employee"}
                      className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] pl-3.5 pr-8 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed"
                    />
                    <ShieldCheck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>

                {/* Employee ID */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Employee ID
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      <Lock size={10} /> System ID
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.employeeId || user?.employeeCode || (user?._id ? `EMP-${user._id.slice(-6).toUpperCase()}` : "Not assigned")}
                    className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3.5 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: CONTACT INFORMATION */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Contact Information
                </span>
                <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#1E3A47]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Email Address
                    </label>
                    {isEmailVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] dark:text-[#4ADE80]">
                        <BadgeCheck size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={user?.email || "No email"}
                        className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] pl-3.5 pr-8 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed truncate"
                      />
                      <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => {
                        setEditOpen(false);
                        setActiveModal("change-email");
                      }}
                      className="shrink-0 h-10 sm:h-11 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#2563EB] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8] dark:hover:bg-[#0C3345] transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      Mobile Number
                    </label>
                    {isPhoneVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] dark:text-[#4ADE80]">
                        <BadgeCheck size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={user?.phone ? formatDisplayPhone(user.phone, user.countryCode) : "No mobile"}
                        className="h-10 sm:h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] pl-3.5 pr-8 text-xs sm:text-[13px] font-medium text-[#64748B] dark:border-[#1E3A47] dark:bg-[#071923]/60 dark:text-[#94A3B8] cursor-not-allowed truncate"
                      />
                      <Phone size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => {
                        setEditOpen(false);
                        setActiveModal("change-phone");
                      }}
                      className="shrink-0 h-10 sm:h-11 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#2563EB] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8] dark:hover:bg-[#0C3345] transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODAL STICKY FOOTER */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 dark:border-[#1E3A47] dark:bg-[#0B202B]">
            <button
              type="button"
              disabled={savingProfile}
              onClick={() => setEditOpen(false)}
              className="h-10 rounded-xl border border-[#CBD5E1] bg-white px-4 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={savingProfile}
              onClick={handleUpdateProfile}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {savingProfile ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* VERIFICATION MODALS */}
      <ProfileVerificationModals
        email={user.email}
        phone={user.phone}
        countryCode={user.countryCode || "+91"}
        isEmailVerified={isEmailVerified}
        isPhoneVerified={isPhoneVerified}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        onSuccess={({ type, value, countryCode: newCC, isVerified }) => {
          if (type === "email") {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    email: value,
                    isEmailVerified: isVerified,
                    emailVerified: isVerified,
                  }
                : prev
            );
            updateCurrentUser?.({ email: value, isEmailVerified: isVerified } as any);
          } else if (type === "phone") {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    phone: value,
                    countryCode: newCC || prev.countryCode,
                    isPhoneVerified: isVerified,
                    phoneVerified: isVerified,
                  }
                : prev
            );
            updateCurrentUser?.({ phone: value, countryCode: newCC, isPhoneVerified: isVerified } as any);
          }
        }}
      />
    </div>
  );
}