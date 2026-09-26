"use client";

import type { ChangeEvent, FocusEvent, Dispatch, SetStateAction } from "react";
import type { RegisterErrors, RegisterFormData } from "@/types/auth";
import ErrorMessage from "./ErrorMessage";
import { EyeIcon, EyeOffIcon } from "./icons";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  formData: RegisterFormData;
  errors: RegisterErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  setShowConfirmPassword: Dispatch<SetStateAction<boolean>>;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const inputClass = (error?: string) =>
  `w-full rounded-lg border-[1.5px] bg-white px-3 py-2.5 pr-10 text-sm text-[#102A43] outline-none transition-all duration-200 placeholder:text-[#94A3B8] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
      : "border-[#9FB5C6] hover:border-[#7F9BAD] focus:border-[#10A9D1] focus:ring-2 focus:ring-[#10A9D1]/15"
  }`;

export default function PasswordFields({
  formData,
  errors,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  onChange,
  onBlur,
}: Props) {
  const { t } = useLanguage();

  const passwordMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const confirmPasswordError = !formData.confirmPassword
    ? errors.confirmPassword
    : passwordMismatch
      ? "Passwords do not match."
      : "";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Password */}
      <PasswordField
        id="password"
        name="password"
        label={t("password")}
        placeholder={t("enterPassword")}
        value={formData.password}
        error={errors.password}
        visible={showPassword}
        onToggle={() => setShowPassword((prev) => !prev)}
        onChange={onChange}
        onBlur={onBlur}
      />

      {/* Confirm Password */}
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label={t("confirmPassword")}
        placeholder={t("confirmPassword1")}
        value={formData.confirmPassword}
        error={confirmPasswordError}
        visible={showConfirmPassword}
        onToggle={() => setShowConfirmPassword((prev) => !prev)}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  value,
  error,
  visible,
  onToggle,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-[#102A43]">
        {label}
        <span className="text-red-500"> *</span>
      </label>

      <div className="relative mt-1.5">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="new-password"
          className={inputClass(error)}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-[#64748B] transition hover:text-[#087DB5]"
        >
          {visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>

      <ErrorMessage message={error} />
    </div>
  );
}