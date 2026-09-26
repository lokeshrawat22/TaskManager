"use client";

import type { ChangeEvent, FocusEvent } from "react";
import type { RegisterErrors, RegisterFormData } from "@/types/auth";
import ErrorMessage from "./ErrorMessage";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  formData: RegisterFormData;
  errors: RegisterErrors;
  maxDOB: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function DobGenderSection({ formData, errors, maxDOB, onChange, onBlur }: Props) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
      <div>
        <label htmlFor="dob" className="block text-sm font-medium text-[#102A43] mb-1.5">
          {t("dateOfBirth")} <span className="text-xs font-normal text-[#526671]">({t("optional") || "Optional"})</span>
        </label>
        <input
          id="dob"
          name="dob"
          type="date"
          value={formData.dob}
          onChange={onChange}
          onBlur={onBlur}
          onClick={(e) => {
            try { e.currentTarget.showPicker(); } catch {}
          }}
          max={maxDOB}
          className="w-full cursor-pointer rounded-lg border-[1.5px] border-[#9FB5C6] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-all duration-200 focus:border-[#10A9D1] focus:ring-2 focus:ring-[#10A9D1]/15"
        />
        <ErrorMessage message={errors.dob} />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-[#102A43]">
          {t("gender")} <span className="text-xs font-normal text-[#526671]">({t("optional") || "Optional"})</span>
        </p>
        <div className="flex min-h-[42px] items-center flex-wrap gap-3 sm:gap-5">
          {["male", "female", "other"].map((gender) => (
            <label key={gender} className="flex cursor-pointer items-center gap-1.5 text-sm text-[#102A43]">
              <input type="radio" name="gender" value={gender} checked={formData.gender === gender} onChange={onChange} onBlur={onBlur} className="h-4 w-4 cursor-pointer accent-[#087DB5]" />
              <span className="capitalize">{gender}</span>
            </label>
          ))}
        </div>
        <ErrorMessage message={errors.gender} />
      </div>
    </div>
  );
}
