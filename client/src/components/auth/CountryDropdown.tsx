"use client";

import type { ChangeEvent, FocusEvent, RefObject } from "react";
import ReactCountryFlag from "react-country-flag";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import type { RegisterErrors, RegisterFormData } from "@/types/auth";
import ErrorMessage from "./ErrorMessage";
import { useLanguage } from "@/context/LanguageContext";

export type CountryOption = {
  code: CountryCode;
  name: string;
  callingCode: string;
};

interface Props {
  formData: RegisterFormData;
  errors: RegisterErrors;
  filteredCountries: CountryOption[];
  selectedCountry?: CountryOption;
  countrySearch: string;
  showCountryDropdown: boolean;
  countryDropdownRef: RefObject<HTMLDivElement | null>;
  onCountryToggle: () => void;
  onCountryChange: (country: CountryCode) => void;
  onCountrySearch: (value: string) => void;
  onClose: () => void;
  onPhoneChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function CountryDropdown({
  formData,
  errors,
  filteredCountries,
  selectedCountry,
  countrySearch,
  showCountryDropdown,
  countryDropdownRef,
  onCountryToggle,
  onCountryChange,
  onCountrySearch,
  onClose,
  onPhoneChange,
  onBlur,
}: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <label htmlFor="phone" className="text-sm font-medium text-[#102A43]">
        {t("mobilePhoneNumber")}<span className="text-red-500"> *</span>
      </label>

      <div className="mt-1.5 flex">
        <div ref={countryDropdownRef} className="relative w-[105px] shrink-0">
          <button
            type="button"
            onClick={onCountryToggle}
            className="flex h-[42px] w-full cursor-pointer items-center gap-3 rounded-l-lg border border-r-0 border-[#D7E4EE] bg-[#EDF6FA] px-3 text-left text-sm text-[#0B2D63] outline-none transition hover:bg-[#E5F2F8] focus:border-[#10A9D1]"
          >
            <ReactCountryFlag
              countryCode={formData.country}
              svg
              style={{
                width: "20px",
                height: "15px",
              }}
            />

            <span className="shrink-0 font-medium">
              +
              {selectedCountry?.callingCode ??
                getCountryCallingCode(formData.country)}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 transition-transform duration-200 ${showCountryDropdown ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showCountryDropdown && (
            <div className="absolute top-[46px] left-0 z-50 w-[190px] overflow-hidden rounded-xl border border-[#D7E4EE] bg-white shadow-[0_12px_35px_rgba(15,23,42,0.15)]">
              <div className="border-b border-[#E2E8F0] bg-white px-2 py-1.5">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t("searchCountry")}
                    value={countrySearch}
                    onChange={(e) => onCountrySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-[34px] w-full rounded-md border border-[#D7E4EE] bg-[#F8FBFD] pl-8 pr-2.5 text-[12px] text-[#102A43] outline-none placeholder:text-[#94A3B8] focus:border-[#10A9D1] focus:bg-white"
                  />
                </div>
              </div>

              <div className="max-h-[215px] overflow-y-auto py-1.5">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => {
                    const isSelected = country.code === formData.country;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          onCountryChange(country.code);
                          onClose();
                        }}
                        className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${isSelected ? "bg-[#E8F7FA] text-[#087DB5]" : "text-[#102A43] hover:bg-[#F3F8FB]"}`}
                      >
                        <ReactCountryFlag
                          countryCode={country.code}
                          svg
                          style={{ width: "22px", height: "16px" }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {country.name}
                        </span>
                        <span className="shrink-0 text-xs text-[#64748B]">
                          +{country.callingCode}
                        </span>
                        {isSelected && (
                          <span className="font-bold text-[#08AFA3]">✓</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[#475569]">
                      {t("noCountryFound")}</p>
                    <p className="mt-1 text-xs text-[#94A3B8]">
                      {t("tryAnotherCountryName")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder={t("enterPhoneNumber")}
          value={formData.phone}
          onChange={onPhoneChange}
          onBlur={onBlur}
          autoComplete="tel"
          className={`min-w-0 w-full rounded-r-lg border-[1.5px] border-[#9FB5C6] bg-white px-3 py-2.5 text-sm text-[#102A43] outline-none transition-all placeholder:text-[#94A3B8] ${errors.phone ? "border-red-400 focus:border-red-500" : "border-[#9FB5C6] hover:border-[#7F9BAD] focus:border-[#10A9D1]"}`}
        />
      </div>

      <ErrorMessage message={errors.phone} />
    </div>
  );
}
