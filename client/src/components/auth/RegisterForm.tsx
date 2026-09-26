"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { showToast } from "@/lib/toast";

import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

import { registerUser, RegisterPayload } from "@/service/auth.service";

import type { RegisterErrors, RegisterFormData } from "@/types/auth";

import { validateRegisterForm } from "@/utils/RegisterValidation";

import ErrorMessage from "@/components/auth/ErrorMessage";

import CountryDropdown, {
  type CountryOption,
} from "@/components/auth/CountryDropdown";

import PasswordFields from "@/components/auth/PasswordFields";

import DobGenderSection from "@/components/auth/DobGenderSection";

import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";

// =====================================================
// REGISTER FORM
// =====================================================

export default function RegisterForm() {
    const { t } = useLanguage();


  const router = useRouter();

  // ===================================================
  // FORM DATA
  // ===================================================

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    email: "",
    country: "IN",
    phone: "",
    dob: "",
    gender: "",
    qualification: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  // ===================================================
  // ERRORS
  // ===================================================

  const [errors, setErrors] = useState<RegisterErrors>({});

  // ===================================================
  // UI STATE
  // ===================================================

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [countrySearch, setCountrySearch] = useState("");

  const [countries, setCountries] = useState<CountryOption[]>([]);

  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // ===================================================
  // PROFILE PHOTO
  // ===================================================

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>("");

  const [profilePhotoError, setProfilePhotoError] = useState("");

  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // ===================================================
  // COUNTRY LIST
  // ===================================================

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  useEffect(() => {
    const regionNames = new Intl.DisplayNames(["en"], {
      type: "region",
    });

    const countryList: CountryOption[] = getCountries()
      .map((code) => ({
        code,
        name: regionNames.of(code) || code,
        callingCode: getCountryCallingCode(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setCountries(countryList);
  }, []);

  const selectedCountry = countries.find(
    (country) => country.code === formData.country,
  );

  // ===================================================
  // CLOSE COUNTRY DROPDOWN
  // ===================================================

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
        setCountrySearch("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // ===================================================
  // MAX DOB
  // ===================================================

  const maxDOB = useMemo(() => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  // ===================================================
  // PROFILE PHOTO CLEANUP
  // ===================================================

  useEffect(() => {
    return () => {
      if (profilePhotoPreview) {
        URL.revokeObjectURL(profilePhotoPreview);
      }
    };
  }, [profilePhotoPreview]);

  // ===================================================
  // PROFILE PHOTO CHANGE
  // ===================================================

  const handleProfilePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // -----------------------------------------------
    // ALLOWED TYPES
    // -----------------------------------------------

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setProfilePhotoError("Only JPG, PNG and WebP images are allowed.");

      setProfilePhoto(null);
      setProfilePhotoPreview("");

      e.target.value = "";

      return;
    }

    // -----------------------------------------------
    // MAX 5 MB
    // -----------------------------------------------

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setProfilePhotoError("Profile photo must be less than 5 MB.");

      setProfilePhoto(null);
      setProfilePhotoPreview("");

      e.target.value = "";

      return;
    }

    // -----------------------------------------------
    // VALID PHOTO
    // -----------------------------------------------

    setProfilePhotoError("");

    setProfilePhoto(file);

    // Remove previous preview
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setProfilePhotoPreview(previewUrl);
  };

  // ===================================================
  // REMOVE PROFILE PHOTO
  // ===================================================

  const handleRemoveProfilePhoto = () => {
    if (profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }

    setProfilePhoto(null);

    setProfilePhotoPreview("");

    setProfilePhotoError("");

    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = "";
    }
  };

  // ===================================================
  // NORMAL CHANGE
  // ===================================================

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  // ===================================================
  // BLUR VALIDATION
  // ===================================================

  const handleBlur = (e?: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!e) {
      const validationErrors = validateRegisterForm(formData);

      setErrors(validationErrors);

      return;
    }

    const fieldName = e.target.name as keyof RegisterErrors;

    if (!fieldName) {
      return;
    }

    const validationErrors = validateRegisterForm(formData);

    setErrors((prev) => {
      const updatedErrors = {
        ...prev,
      };

      const fieldError = validationErrors[fieldName];

      if (fieldError) {
        updatedErrors[fieldName] = fieldError;
      } else {
        delete updatedErrors[fieldName];
      }

      return updatedErrors;
    });
  };

  // ===================================================
  // FIRST NAME
  // ===================================================

  const handleFirstNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z]/g, "");

    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    setFormData((prev) => ({
      ...prev,
      firstName: value,
    }));

    setErrors((prev) => ({
      ...prev,
      firstName: undefined,
    }));
  };

  // ===================================================
  // LAST NAME
  // ===================================================

  const handleLastNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^A-Za-z\s]/g, "");

    value = value.replace(/^\s+/, "");

    value = value.replace(/\s{2,}/g, " ");

    value = value
      .split(" ")
      .map((word) => {
        if (!word) {
          return "";
        }

        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");

    setFormData((prev) => ({
      ...prev,
      lastName: value,
    }));

    setErrors((prev) => ({
      ...prev,
      lastName: undefined,
    }));
  };

  // ===================================================
  // EMAIL
  // ===================================================

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9@._%+-]/g, "");

    setFormData((prev) => ({
      ...prev,
      email: value,
    }));

    setErrors((prev) => ({
      ...prev,
      email: undefined,
    }));
  };

  // ===================================================
  // COUNTRY CHANGE
  // ===================================================

  const handleCountryChange = (country: CountryCode) => {
    setFormData((prev) => ({
      ...prev,
      country,
      phone: "",
    }));

    setErrors((prev) => ({
      ...prev,
      phone: undefined,
    }));

    setShowCountryDropdown(false);

    setCountrySearch("");
  };

  // ===================================================
  // PHONE CHANGE
  // ===================================================

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");

    value = value.slice(0, formData.country === "IN" ? 10 : 15);

    setFormData((prev) => ({
      ...prev,
      phone: value,
    }));

    setErrors((prev) => ({
      ...prev,
      phone: undefined,
    }));
  };

  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // -----------------------------------------------
    // VALIDATE FORM
    // -----------------------------------------------

    const validationErrors = validateRegisterForm(formData);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];

      const element = document.getElementById(firstErrorField);

      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    // -----------------------------------------------
    // FULL PHONE NUMBER
    // -----------------------------------------------

    const fullPhoneNumber = `+${getCountryCallingCode(
      formData.country,
    )}${formData.phone}`;

    // -----------------------------------------------
    // REGISTRATION DATA
    // -----------------------------------------------

    const registrationData: RegisterPayload = {
      firstName: formData.firstName,

      lastName: formData.lastName,

      email: formData.email,

      country: formData.country,

      countryCode: `+${getCountryCallingCode(formData.country)}`,

      phone: fullPhoneNumber,

      dateOfBirth: formData.dob,

      gender:
        formData.gender.toLowerCase() === "male"
          ? "Male"
          : formData.gender.toLowerCase() === "female"
            ? "Female"
            : "Other",

      password: formData.password,

      confirmPassword: formData.confirmPassword,

      qualification: formData.qualification,

      termsAccepted: formData.terms,
    };

    // =================================================
    // API REQUEST
    // =================================================

    try {
      setLoading(true);

      const response = await registerUser(registrationData, profilePhoto);

      console.log("Registration successful:", response);

      // =================================================
      // SAVE VERIFICATION STATE
      // =================================================

      const otpData = response?.data;

      // Store verification context in sessionStorage instead of
      // exposing email/phone in the verification URL.
      sessionStorage.setItem("verificationEmail", formData.email);

      sessionStorage.setItem("verificationPhone", fullPhoneNumber);

      sessionStorage.setItem("verificationSource", "register");

      const verificationStateKey = "verificationState";

      sessionStorage.setItem(
        verificationStateKey,
        JSON.stringify({
          currentStep: "email",

          emailVerified: false,

          phoneVerified: false,

          emailBlockedUntil: 0,

          phoneBlockedUntil: 0,

          emailOtpExpiresAt:
            otpData?.emailOtpExpiresAt ?? Date.now() + 10 * 60 * 1000,

          phoneOtpExpiresAt:
            otpData?.phoneOtpExpiresAt ?? Date.now() + 10 * 60 * 1000,
        }),
      );

      // =================================================
      // RESET RESEND TIMER
      // =================================================

      localStorage.removeItem(`emailOtpResendExpiry_${formData.email}`);

      localStorage.removeItem(`emailOtpResendInitialized_${formData.email}`);

      localStorage.removeItem(`phoneOtpResendExpiry_${fullPhoneNumber}`);

      localStorage.removeItem(`phoneOtpResendInitialized_${fullPhoneNumber}`);

      // =================================================
      // SUCCESS
      // =================================================

      showToast.success(t("accountCreatedSuccessfully") || "Account created successfully!");

      // =================================================
      // GO TO VERIFICATION
      // =================================================

      setTimeout(() => {
        // Do not put email or phone in the URL.
        // VerificationPage reads them from sessionStorage.
        window.location.assign("/verification");
      }, 1000);
    } catch (error: any) {
      // =================================================
      // FIELD ERRORS
      // =================================================

      if (error?.errors) {
        setErrors((prev) => ({
          ...prev,
          ...error.errors,
        }));

        return;
      }

      const message =
        error instanceof Error ? error.message : "Registration failed";

      // =================================================
      // EMAIL ALREADY REGISTERED
      // =================================================

      if (message === "Email is already registered") {
        setErrors((prev) => ({
          ...prev,
          email: message,
        }));
        showToast.error(message);
        return;
      }

      // =================================================
      // PHONE ALREADY REGISTERED
      // =================================================

      if (message === "Phone number is already registered") {
        setErrors((prev) => ({
          ...prev,
          phone: message,
        }));
        showToast.error(message);
        return;
      }

      // =================================================
      // OTHER ERROR
      // =================================================

      console.error("Registration error:", error);

      showToast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // INPUT STYLE
  // ===================================================

  const inputBaseStyle =
    "w-full mt-1.5 px-3 py-2.5 text-sm rounded-lg border bg-white text-[#102A43] outline-none transition-all duration-200 placeholder:text-[#94A3B8]";

  const getInputStyle = (error?: string) =>
    `${inputBaseStyle} ${
      error
        ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
        : "border-[1.5px] border-[#9FB5C6] hover:border-[#B8D2E3] focus:border-[#10A9D1] focus:ring-2 focus:ring-[#10A9D1]/15"
    }`;

  // ===================================================
  // FORM COMPLETION
  // ===================================================

  const isFormComplete =
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.dob !== "" &&
    formData.gender !== "" &&
    formData.qualification !== "" &&
    formData.password !== "" &&
    formData.confirmPassword !== "" &&
    formData.terms;

  // ===================================================
  // BUTTON STYLE
  // ===================================================

  const buttonBaseStyle =
    "w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer";

  const buttonClass = isFormComplete
    ? `${buttonBaseStyle} bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3] text-white shadow-md hover:-translate-y-[1px] hover:shadow-lg`
    : `${buttonBaseStyle} bg-[#DCE5EC] text-[#94A3B8] shadow-none`;

  // ===================================================
  // JSX
  // ===================================================

  return (
    <div className="relative z-10 w-full max-w-[650px]">
      <div className="overflow-hidden rounded-2xl border border-[#B8CCDA] bg-white/95 shadow-[0_16px_50px_rgba(11,45,99,0.10)] backdrop-blur-xl">
        {/* TOP GRADIENT */}

        <div className="h-1 bg-gradient-to-r from-[#0B2D63] via-[#087DB5] to-[#08AFA3]" />

        <div className="p-5 md:p-6">
          {/* HEADER */}

          <div className="mb-7 text-center">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[2px] text-[#08AFA3]">
              {t("auth.startJourney")}
            </p>

            <h1 className="text-2xl font-bold text-[#0B2D63] md:text-[28px]">
              {t("auth.createAccount")}
            </h1>

            <p className="mt-1.5 text-sm text-[#64748B]">
            </p>
          </div>

          {/* FORM */}

          <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
            {/* =================================================
    PROFILE PHOTO
================================================= */}

            <div className="mb-3 flex items-center gap-4">
              {/* HIDDEN FILE INPUT */}
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />

              {/* PROFILE IMAGE */}
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="group relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-full border-2 border-[#B8CCDA] bg-[#F1F6FA] transition-all duration-200 hover:border-[#08AFA3] hover:shadow-md"
                aria-label={t("uploadProfilePhoto")}
              >
                {profilePhotoPreview ? (
                  <img
                    src={profilePhotoPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#64748B]">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="8" r="4" />

                      <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
                    </svg>
                  </div>
                )}

                {/* UPLOAD LABEL */}
                <span className="absolute bottom-0 left-0 right-0 bg-[#0B2D63]/85 py-[3px] text-[9px] font-semibold text-white">
                  {profilePhotoPreview ? "Change" : "Upload"}
                </span>
              </button>

              {/* PHOTO INFORMATION */}
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[#102A43]">
                  {t("profilePhoto")}{" "}
                  <span className="text-xs font-normal text-[#94A3B8]">
                    {t("optional")}</span>
                </p>

                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  {t("jpgPngOrWebp")}</p>

                {profilePhotoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveProfilePhoto}
                    className="mt-1 w-fit cursor-pointer text-[11px] font-semibold text-red-500 hover:underline"
                  >
                    {t("removePhoto")}</button>
                )}

                {profilePhotoError && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {profilePhotoError}
                  </p>
                )}
              </div>
            </div>

            {/* =================================================
                NAME
            ================================================= */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* FIRST NAME */}

              <div>
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-[#102A43]"
                >
                  {t("firstName")}<span className="text-red-500">*</span>
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={t("enterFirstName")}
                  value={formData.firstName}
                  onChange={handleFirstNameChange}
                  onBlur={handleBlur}
                  maxLength={30}
                  autoComplete="given-name"
                  className={getInputStyle(errors.firstName)}
                />

                <ErrorMessage message={errors.firstName} />
              </div>

              {/* LAST NAME */}

              <div>
                <label
                  htmlFor="lastName"
                  className="text-sm font-medium text-[#102A43]"
                >
                  {t("lastName")}<span className="text-red-500">*</span>
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder={t("enterLastName")}
                  value={formData.lastName}
                  onChange={handleLastNameChange}
                  onBlur={handleBlur}
                  maxLength={50}
                  autoComplete="family-name"
                  className={getInputStyle(errors.lastName)}
                />

                <ErrorMessage message={errors.lastName} />
              </div>
            </div>

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#102A43]"
              >
                {t("workEmail")}<span className="text-red-500">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder={t("namecompanycom")}
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleBlur}
                autoComplete="email"
                className={getInputStyle(errors.email)}
              />

              <ErrorMessage message={errors.email} />
            </div>

            {/* =================================================
                PHONE + COUNTRY
            ================================================= */}

            <CountryDropdown
              formData={formData}
              errors={errors}
              filteredCountries={filteredCountries}
              selectedCountry={selectedCountry}
              countrySearch={countrySearch}
              showCountryDropdown={showCountryDropdown}
              countryDropdownRef={countryDropdownRef}
              onCountryToggle={() => {
                setShowCountryDropdown((prev) => {
                  const next = !prev;

                  if (!next) {
                    setCountrySearch("");
                  }

                  return next;
                });
              }}
              onCountryChange={handleCountryChange}
              onCountrySearch={setCountrySearch}
              onClose={() => {
                setShowCountryDropdown(false);

                setCountrySearch("");
              }}
              onPhoneChange={handlePhoneChange}
              onBlur={handleBlur}
            />

            {/* =================================================
                DOB + GENDER
            ================================================= */}

            <DobGenderSection
              formData={formData}
              errors={errors}
              maxDOB={maxDOB}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* =================================================
                PASSWORDS
            ================================================= */}

            <PasswordFields
              formData={formData}
              errors={errors}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            {/* =================================================
                QUALIFICATION
            ================================================= */}

            <div className="flex w-full flex-col">
              <label
                htmlFor="qualification"
                className="text-sm font-medium text-[#102A43]"
              >
                {t("highestQualification")}<span className="text-red-500">*</span>
              </label>

              <select
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getInputStyle(errors.qualification)}
              >
                <option value="">{t("selectQualification")}</option>

                <option value="high-school">{t("highSchool")}</option>

                <option value="diploma">{t("diploma")}</option>

                <option value="bachelors">{t("bachelorsDegree")}</option>

                <option value="masters">{t("mastersDegree")}</option>

                <option value="phd">{t("phd")}</option>
              </select>

              <ErrorMessage message={errors.qualification} />
            </div>

            {/* =================================================
                TERMS
            ================================================= */}

            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="h-4 w-4 accent-[#08AFA3]"
                />

                <span className="text-xs text-[#64748B]">
                  {t("auth.agreeTo")}{" "}
                  <span className="font-semibold text-[#087DB5]">
                    <Link
                      href="/terms-and-conditions"
                      target="_blank"
                      className="font-medium text-[#087DB5] hover:underline"
                    >
                      {t("auth.termsConditions")}
                    </Link>
                  </span>
                </span>
              </label>

              <ErrorMessage message={errors.terms} />
            </div>

            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              disabled={loading || !isFormComplete}
              className={buttonClass}
            >
              {loading ? t("common.loading") : t("auth.continueVerification")}
            </button>

            {/* =================================================
                LOGIN
            ================================================= */}

            <p className="text-center text-xs text-[#64748B]">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                href="/login"
                className="font-semibold text-[#087DB5] transition hover:text-[#08AFA3]"
              >
                {t("auth.login")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
