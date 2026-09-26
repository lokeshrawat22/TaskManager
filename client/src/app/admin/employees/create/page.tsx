"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { apiRequest } from "@/service/api.service";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/context/LanguageContext";
import { getRoleLabel } from "@/constants/rbac";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { invalidateMasterData } from "@/service/masterData.service";

export default function CreateEmployeePage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    role: "employee",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { departmentNames: masterDeptNames, loading: loadingDepts } = useDepartments({
    status: "ACTIVE",
  });

  const { designationNames: activeDesigNames, loading: loadingDesigs } = useDesignations({
    department: formData.department,
    status: "ACTIVE",
  });

  useEffect(() => {
    if (!formData.department && masterDeptNames.length > 0) {
      setFormData((prev) => ({ ...prev, department: masterDeptNames[0] }));
    }
  }, [masterDeptNames, formData.department]);

  const handleDepartmentChange = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      department: dept,
      designation: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim()) {
      const msg = language === "hi"
        ? "कृपया सभी आवश्यक फ़ील्ड (पहला नाम, अंतिम नाम, ईमेल, पासवर्ड) भरें।"
        : "Please fill in all required fields (First Name, Last Name, Email, Password).";
      setError(msg);
      showToast.error(msg);
      return;
    }

    if (formData.password.length < 8) {
      const msg = language === "hi"
        ? "पासवर्ड कम से कम 8 वर्णों का होना चाहिए।"
        : "Password must be at least 8 characters long.";
      setError(msg);
      showToast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const res = await apiRequest<{ success?: boolean; message?: string }>("/api/admin/administrators", {
        method: "POST",
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          department: formData.department,
          designation: formData.designation.trim() || "Employee",
          role: formData.role,
          password: formData.password,
        }),
      });

      if (res?.success) {
        showToast.success(res.message || (language === "hi" ? "कर्मचारी सफलतापूर्वक बनाया गया।" : "Employee created successfully."));
        invalidateMasterData("all");
        router.push("/admin/employees");
      } else {
        throw new Error(res?.message || (language === "hi" ? "कर्मचारी बनाने में विफल।" : "Failed to create employee."));
      }
    } catch (err: any) {
      const errorMsg = err?.message || (language === "hi" ? "कर्मचारी बनाने में विफल।" : "Failed to create employee.");
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/employees")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6E2EB] bg-white text-[#536B77] transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] cursor-pointer"
            aria-label={t("common.back") || "Back"}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5FC] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]">
                <UserPlus size={12} /> {language === "hi" ? "कार्यबल प्रविष्टि" : "Workforce Entry"}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-[#07365A] dark:text-white">
              {t("employees.addEmployee") || "Create New Employee"}
            </h1>
            <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "कर्मचारी क्रेडेंशियल, संगठनात्मक इकाई और भूमिका असाइनमेंट का प्रावधान करें।" : "Provision employee credentials, organization unit, and assignment role."}
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]"
      >
        <div className="border-b border-[#EDF3F7] px-6 py-5 dark:border-[#1A3D56]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#07365A] dark:text-white">
            {language === "hi" ? "कर्मचारी विवरण" : "Employee Details"}
          </h2>
          <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
            {language === "hi" ? "विभाग और पद केंद्रीय मास्टर डेटा से समन्वयित हैं।" : "Departments and designations are dynamically synced from centralized master data."}
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-6 flex items-center justify-between rounded-xl border border-[#F0D8D8] bg-[#FFF8F8] px-4 py-3 text-xs font-semibold text-[#EF5350] dark:border-[#5C3838] dark:bg-[#321F25] dark:text-[#F87171]">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-[#EF5350] hover:opacity-75"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* First & Last Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "पहला नाम" : "First Name"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Aarav"
                  className="h-11 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-3 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "अंतिम नाम" : "Last Name"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Sharma"
                  className="h-11 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-3 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "कार्य ईमेल" : "Work Email"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="aarav.sharma@company.com"
                  className="h-11 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-3 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "फ़ोन नंबर" : "Phone Number"}
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="h-11 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-3 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Department & Designation (Dynamic Master Data) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {t("employees.department") || "Department"}
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0879D9] dark:text-[#00C2E8]" />
                <select
                  value={formData.department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  disabled={loadingDepts}
                  className="h-11 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-9 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60"
                >
                  <option value="" disabled>{language === "hi" ? "विभाग चुनें" : "Select Department"}</option>
                  {masterDeptNames.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {t("employees.designation") || "Designation"}
              </label>
              <div className="relative">
                <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0879D9] dark:text-[#00C2E8]" />
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  disabled={!formData.department || (activeDesigNames.length === 0 && !loadingDesigs)}
                  className="h-11 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-9 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-50"
                >
                  <option value="">{language === "hi" ? "पद चुनें" : "Select Designation"}</option>
                  {activeDesigNames.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
            </div>
          </div>

          {/* Role & Initial Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "भूमिका स्तर" : "Role Level"}
              </label>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="h-11 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] px-3.5 pr-9 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                >
                  <option value="employee">{getRoleLabel("employee", t)}</option>
                  <option value="administrator">{getRoleLabel("administrator", t)}</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
                {language === "hi" ? "प्रारंभिक पासवर्ड" : "Initial Password"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={language === "hi" ? "न्यूनतम 8 वर्ण" : "Min. 8 characters"}
                  className="h-11 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-3 text-xs font-semibold text-[#07365A] outline-none transition focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#EDF3F7] bg-[#F8FBFC] px-6 py-4 dark:border-[#1A3D56] dark:bg-[#0D2A3E]">
          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push("/admin/employees")}
            className="rounded-xl border border-[#D6E2EB] bg-white px-5 py-2.5 text-xs font-semibold text-[#536B77] transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40 cursor-pointer"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-6 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>{language === "hi" ? "कर्मचारी बनाया जा रहा है..." : "Creating Employee..."}</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{language === "hi" ? "कर्मचारी बनाएं" : "Create Employee"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
