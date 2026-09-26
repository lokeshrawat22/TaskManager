"use client";

import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { invalidateMasterData } from "@/service/masterData.service";
import { useDepartments } from "@/hooks/useDepartments";
import {
  validateMasterDataName,
  normalizeMasterDataName,
  toLookupKey,
} from "@/utils/masterData.validation";
import { Modal } from "@/components/ui/Modal";
import { GoToPage } from "@/components/ui/GoToPage";

// =====================================================
// TYPES
// =====================================================

interface Employee {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  department?: string;
  status?: string;
  totalTasks?: number;
  completedTasks?: number;
  completionRate?: number;
}

interface EmployeeResponse {
  success?: boolean;
  message?: string;
  data?:
    | Employee[]
    | {
        employees?: Employee[];
      };
}

interface DeptRecord {
  _id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  employeeCount?: number;
  designationCount?: number;
  createdAt?: string;
}

interface DesigRecord {
  _id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  department?: { _id: string; name: string; status: string } | null;
  departmentName?: string;
  employeeCount?: number;
  createdAt?: string;
}

type PageTab = "departments" | "designations" | "assignments";

// =====================================================
// HELPERS
// =====================================================

function employeeName(employee: Employee) {
  return (
    employee.name ||
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Unnamed Employee"
  );
}

function initials(employee: Employee) {
  const name = employeeName(employee);
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "EM"
  );
}

function getStatus(employee: Employee) {
  const value = employee.status?.toLowerCase();
  return value === "inactive" || value === "disabled" || value === "blocked"
    ? "Inactive"
    : "Active";
}

// =====================================================
// STAT SEGMENT COMPONENT
// =====================================================

function DepartmentStatSegment({
  icon, label, value, description, iconClass, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  iconClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group relative flex min-h-[96px] min-w-0 flex-1 cursor-pointer items-center gap-3.5 px-5 py-4 text-left transition-all ${
        active ? "bg-[#FBFDFE] dark:bg-white/[0.025]" : "hover:bg-[#FBFDFE] dark:hover:bg-white/[0.018]"
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#66829A] dark:text-[#8CB0C7]">{label}</p>
        <p className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight text-[#07365A] dark:text-white">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#66829A] dark:text-[#8CB0C7]">{description}</p>
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 left-5 right-5 h-[3px] rounded-full transition-all duration-200 ${
          active
            ? "scale-x-100 bg-[#0879D9] opacity-100 dark:bg-[#00C2E8]"
            : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:bg-[#D6E2EB] group-hover:opacity-60 dark:group-hover:bg-[#1E435E]"
        }`}
      />
    </button>
  );
}

// =====================================================
// DEPARTMENT FORM MODAL
// =====================================================

function DepartmentFormModal({
  mode, initial, onClose, onSaved,
}: {
  mode: "create" | "edit";
  initial?: Partial<DeptRecord>;
  onClose: () => void;
  onSaved: (dept: DeptRecord) => void;
}) {
  const { t, language } = useLanguage();
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(initial?.status || "ACTIVE");
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; archived?: boolean } | null>(
    mode === "edit" && initial?.name ? { available: true } : null
  );
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const validation = useMemo(() => {
    return validateMasterDataName(name);
  }, [name]);

  useEffect(() => {
    if (!validation.isValid) {
      setChecking(false);
      setAvailabilityResult(null);
      return;
    }

    if (initial?.name && toLookupKey(name) === toLookupKey(initial.name)) {
      setChecking(false);
      setAvailabilityResult({ available: true });
      return;
    }

    setChecking(true);
    setAvailabilityResult(null);

    const timer = setTimeout(async () => {
      try {
        const excludeParam = initial?._id ? `&excludeId=${encodeURIComponent(initial._id)}` : "";
        const res = await apiRequest<{ available: boolean; archived?: boolean; reason?: string }>(
          `/api/admin/departments/check-name?name=${encodeURIComponent(validation.normalized)}${excludeParam}`
        );
        const data = (res as any)?.data ?? res;
        setAvailabilityResult({ available: Boolean(data?.available), archived: Boolean(data?.archived) });
      } catch {
        setAvailabilityResult(null);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [name, validation.isValid, validation.normalized, initial?._id, initial?.name]);

  const isDuplicate = availabilityResult !== null && !availabilityResult.available;
  const isArchivedDuplicate = isDuplicate && Boolean(availabilityResult?.archived);
  const isValidAndAvailable = validation.isValid && !checking && availabilityResult?.available === true;
  const showError = touched && (!validation.isValid || isDuplicate);

  const errorMessage = useMemo(() => {
    if (!validation.isValid) {
      switch (validation.code) {
        case "EMPTY":
          return t("departments.deptNameRequired") || (language === "hi" ? "विभाग का नाम आवश्यक है।" : "Department name is required.");
        case "TOO_SHORT":
          return t("departments.deptNameTooShort") || (language === "hi" ? "विभाग का नाम कम से कम 2 अक्षरों का होना चाहिए।" : "Department name must be at least 2 characters.");
        case "TOO_LONG":
          return t("departments.deptNameTooLong") || (language === "hi" ? "विभाग का नाम 80 वर्णों से अधिक नहीं हो सकता।" : "Department name cannot exceed 80 characters.");
        case "INVALID_CHARACTERS":
          return t("departments.deptNameInvalidChars") || (language === "hi" ? "केवल अक्षर, एकल स्थान, और &, -, ' मान्य हैं। संख्याएं या विशेष वर्ण अनुमत नहीं हैं।" : "Only letters, single spaces, and &, -, ' are allowed. Numbers and special characters are not permitted.");
        case "INVALID_SEPARATORS":
          return t("departments.deptNameInvalidSeparators") || (language === "hi" ? "चिह्न (&, -, ') शब्दों के बीच में आने चाहिए और दोहराए नहीं जा सकते।" : "Separators (&, -, ') must connect valid words and cannot be placed at the edges or repeated.");
        default:
          return validation.message;
      }
    }
    if (isArchivedDuplicate) {
      return t("departments.deptArchivedExists") || (language === "hi" ? "इस नाम का एक विभाग संग्रह (आर्काइव) में मौजूद है। कृपया इसे पुनर्स्थापित करें या दूसरा नाम चुनें।" : "A department with this name exists in archive. Please restore it or choose another name.");
    }
    if (isDuplicate) {
      return t("departments.deptAlreadyExists") || (language === "hi" ? "इस नाम का विभाग पहले से मौजूद है।" : "A department with this name already exists.");
    }
    return "";
  }, [validation, isDuplicate, isArchivedDuplicate, t, language]);

  const isSubmitDisabled = saving || checking || !validation.isValid || isDuplicate;

  let inputBorderClass = "border-[#D6E2EB] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430]";
  if (showError) {
    inputBorderClass = "border-[#EF5350] focus:border-[#EF5350] bg-[#FFF8F8] dark:bg-[#2F1A1E] dark:border-[#EF5350]";
  } else if (isValidAndAvailable && touched) {
    inputBorderClass = "border-[#10B981] focus:border-[#10B981] bg-[#F4FDF8] dark:bg-[#0E291D] dark:border-[#10B981]";
  }

  const handleSubmit = async () => {
    setTouched(true);
    if (!validation.isValid || isDuplicate) {
      return;
    }
    const cleanName = validation.normalized;
    try {
      setSaving(true);
      setServerError("");
      let res: any;
      if (mode === "create") {
        res = await apiRequest<any>("/api/admin/departments", {
          method: "POST",
          body: JSON.stringify({ name: cleanName, description: description.trim(), status }),
        });
      } else {
        res = await apiRequest<any>(`/api/admin/departments/${initial?._id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: cleanName, description: description.trim(), status }),
        });
      }
      const data = res?.data?.data ?? res?.data ?? res;
      onSaved(data as DeptRecord);
      invalidateMasterData("departments");
      showToast.success(
        mode === "create"
          ? (language === "hi" ? `विभाग "${cleanName}" बनाया गया।` : `Department "${cleanName}" created.`)
          : (language === "hi" ? `विभाग "${cleanName}" अपडेट किया गया।` : `Department "${cleanName}" updated.`)
      );
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("archive") || err?.code === "ARCHIVED_NAME") {
        setAvailabilityResult({ available: false, archived: true });
      } else if (errMsg.includes("already exists") || err?.code === "DUPLICATE_NAME") {
        setAvailabilityResult({ available: false, archived: false });
      } else {
        setServerError(errMsg || (language === "hi" ? "विभाग सहेजने में विफल।" : "Failed to save department."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={() => { if (!saving) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="flex items-center justify-between border-b border-[#EDF3F7] px-5 py-4 dark:border-[#1A3D56]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]"><Building2 size={18} strokeWidth={2} /></div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#00A9C7]">
                {mode === "create" ? (t("departments.newDepartment") || "New Department") : (t("departments.editDepartment") || "Edit Department")}
              </p>
              <p className="text-[13px] font-bold text-[#07365A] dark:text-white">
                {mode === "create" ? (t("departments.addDepartment") || "Create department") : initial?.name}
              </p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={onClose} aria-label={t("common.close") || "Close"} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430] disabled:opacity-40"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {serverError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F0D8D8] bg-[#FFF8F8] px-4 py-3 text-xs font-semibold text-[#EF5350] dark:border-[#5C3838] dark:bg-[#321F25] dark:text-[#F87171]">
              <X size={14} /><span>{serverError}</span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("departments.departmentName") || "Department Name"} <span className="text-[#EF5350]">*</span>
            </label>
            <div className="relative">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setTouched(true);
                }}
                onBlur={() => setTouched(true)}
                placeholder={language === "hi" ? "उदा. इंजीनियरिंग" : "e.g. Engineering"}
                disabled={saving}
                maxLength={80}
                className={`h-10 w-full rounded-xl border px-3.5 pr-10 text-xs font-semibold text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] dark:text-white disabled:opacity-60 ${inputBorderClass}`}
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {checking && <Loader2 size={16} className="animate-spin text-[#0879D9] dark:text-[#00C2E8]" />}
                {!checking && showError && <AlertCircle size={16} className="text-[#EF5350]" />}
                {!checking && isValidAndAvailable && touched && <CheckCircle2 size={16} className="text-[#10B981]" />}
              </div>
            </div>
            <div className="mt-1.5 min-h-[18px]">
              {checking && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#0879D9] dark:text-[#00C2E8]">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t("departments.checkingAvailability") || (language === "hi" ? "उपलब्धता की जांच की जा रही है..." : "Checking availability...")}</span>
                </p>
              )}
              {!checking && showError && (
                <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#EF5350]">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              )}
              {!checking && isValidAndAvailable && touched && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#10B981]">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{t("departments.deptNameValid") || (language === "hi" ? "विभाग का नाम मान्य और उपलब्ध है।" : "Department name is valid and available.")}</span>
                </p>
              )}
              {!checking && !showError && (!touched || !isValidAndAvailable) && (
                <p className="text-[11px] text-[#8A9AA3] dark:text-[#66829A]">
                  {language === "hi" ? "मान्य: केवल अक्षर, एकल स्थान, &, -, ' (2-80 वर्ण)" : "Allowed: Letters, single space, &, -, ' (2–80 characters)"}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("departments.description") || "Description"}
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("departments.optionalDescription") || "Optional description..."} disabled={saving} rows={3} className="w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] px-3.5 py-2.5 text-xs font-medium text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60 resize-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("common.status") || "Status"}
            </label>
            <div className="relative">
              <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")} disabled={saving} className="h-10 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] px-3.5 pr-9 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60">
                <option value="ACTIVE">{t("common.active") || "Active"}</option>
                <option value="INACTIVE">{t("common.inactive") || "Inactive"}</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1A3D56] dark:bg-[#0D2A3E]">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-[#D6E2EB] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40">
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>{t("common.saving") || "Saving..."}</span></>
            ) : (
              <><Check size={14} /><span>{mode === "create" ? (t("departments.addDepartment") || "Create Department") : (t("common.saveChanges") || "Save Changes")}</span></>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =====================================================
// DESIGNATION FORM MODAL
// =====================================================

function DesignationFormModal({
  mode, initial, departments, onClose, onSaved,
}: {
  mode: "create" | "edit";
  initial?: Partial<DesigRecord>;
  departments: DeptRecord[];
  onClose: () => void;
  onSaved: (desig: DesigRecord) => void;
}) {
  const { t, language } = useLanguage();
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [departmentId, setDepartmentId] = useState(initial?.department?._id || "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(initial?.status || "ACTIVE");
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; archived?: boolean } | null>(
    mode === "edit" && initial?.name ? { available: true } : null
  );
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const validation = useMemo(() => {
    return validateMasterDataName(name);
  }, [name]);

  useEffect(() => {
    if (!validation.isValid) {
      setChecking(false);
      setAvailabilityResult(null);
      return;
    }

    if (initial?.name && toLookupKey(name) === toLookupKey(initial.name)) {
      setChecking(false);
      setAvailabilityResult({ available: true });
      return;
    }

    setChecking(true);
    setAvailabilityResult(null);

    const timer = setTimeout(async () => {
      try {
        const excludeParam = initial?._id ? `&excludeId=${encodeURIComponent(initial._id)}` : "";
        const res = await apiRequest<{ available: boolean; archived?: boolean; reason?: string }>(
          `/api/admin/designations/check-name?name=${encodeURIComponent(validation.normalized)}${excludeParam}`
        );
        const data = (res as any)?.data ?? res;
        setAvailabilityResult({ available: Boolean(data?.available), archived: Boolean(data?.archived) });
      } catch {
        setAvailabilityResult(null);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [name, validation.isValid, validation.normalized, initial?._id, initial?.name]);

  const isDuplicate = availabilityResult !== null && !availabilityResult.available;
  const isArchivedDuplicate = isDuplicate && Boolean(availabilityResult?.archived);
  const isValidAndAvailable = validation.isValid && !checking && availabilityResult?.available === true;
  const showError = touched && (!validation.isValid || isDuplicate);

  const errorMessage = useMemo(() => {
    if (!validation.isValid) {
      switch (validation.code) {
        case "EMPTY":
          return t("departments.desigNameRequired") || (language === "hi" ? "पदनाम शीर्षक आवश्यक है।" : "Designation title is required.");
        case "TOO_SHORT":
          return t("departments.desigNameTooShort") || (language === "hi" ? "पदनाम शीर्षक कम से कम 2 अक्षरों का होना चाहिए।" : "Designation title must be at least 2 characters.");
        case "TOO_LONG":
          return t("departments.desigNameTooLong") || (language === "hi" ? "पदनाम शीर्षक 80 वर्णों से अधिक नहीं हो सकता।" : "Designation title cannot exceed 80 characters.");
        case "INVALID_CHARACTERS":
          return t("departments.desigNameInvalidChars") || (language === "hi" ? "केवल अक्षर, एकल स्थान, और &, -, ' मान्य हैं। संख्याएं या विशेष वर्ण अनुमत नहीं हैं।" : "Only letters, single spaces, and &, -, ' are allowed. Numbers and special characters are not permitted.");
        case "INVALID_SEPARATORS":
          return t("departments.desigNameInvalidSeparators") || (language === "hi" ? "चिह्न (&, -, ') शब्दों के बीच में आने चाहिए और दोहराए नहीं जा सकते।" : "Separators (&, -, ') must connect valid words and cannot be placed at the edges or repeated.");
        default:
          return validation.message;
      }
    }
    if (isArchivedDuplicate) {
      return t("departments.desigArchivedExists") || (language === "hi" ? "इस नाम का एक पदनाम संग्रह (आर्काइव) में मौजूद है। कृपया इसे पुनर्स्थापित करें या दूसरा नाम चुनें।" : "A designation with this name exists in archive. Please restore it or choose another name.");
    }
    if (isDuplicate) {
      return t("departments.desigAlreadyExists") || (language === "hi" ? "इस नाम का पदनाम पहले से मौजूद है।" : "A designation with this name already exists.");
    }
    return "";
  }, [validation, isDuplicate, isArchivedDuplicate, t, language]);

  const isSubmitDisabled = saving || checking || !validation.isValid || isDuplicate;

  let inputBorderClass = "border-[#D6E2EB] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430]";
  if (showError) {
    inputBorderClass = "border-[#EF5350] focus:border-[#EF5350] bg-[#FFF8F8] dark:bg-[#2F1A1E] dark:border-[#EF5350]";
  } else if (isValidAndAvailable && touched) {
    inputBorderClass = "border-[#10B981] focus:border-[#10B981] bg-[#F4FDF8] dark:bg-[#0E291D] dark:border-[#10B981]";
  }

  const handleSubmit = async () => {
    setTouched(true);
    if (!validation.isValid || isDuplicate) {
      return;
    }
    const cleanName = validation.normalized;
    try {
      setSaving(true);
      setServerError("");
      const payload: Record<string, any> = { name: cleanName, description: description.trim(), status };
      if (departmentId) payload.department = departmentId;
      let res: any;
      if (mode === "create") {
        res = await apiRequest<any>("/api/admin/designations", { method: "POST", body: JSON.stringify(payload) });
      } else {
        res = await apiRequest<any>(`/api/admin/designations/${initial?._id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      const data = res?.data?.data ?? res?.data ?? res;
      onSaved(data as DesigRecord);
      invalidateMasterData("designations");
      showToast.success(
        mode === "create"
          ? (language === "hi" ? `पदनाम "${cleanName}" बनाया गया।` : `Designation "${cleanName}" created.`)
          : (language === "hi" ? `पदनाम "${cleanName}" अपडेट किया गया।` : `Designation "${cleanName}" updated.`)
      );
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("archive") || err?.code === "ARCHIVED_NAME") {
        setAvailabilityResult({ available: false, archived: true });
      } else if (errMsg.includes("already exists") || err?.code === "DUPLICATE_NAME") {
        setAvailabilityResult({ available: false, archived: false });
      } else {
        setServerError(errMsg || (language === "hi" ? "पदनाम सहेजने में विफल।" : "Failed to save designation."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={() => { if (!saving) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="flex items-center justify-between border-b border-[#EDF3F7] px-5 py-4 dark:border-[#1A3D56]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]"><Tag size={18} strokeWidth={2} /></div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#00A9C7]">
                {mode === "create" ? (t("departments.newDesignation") || "New Designation") : (t("departments.editDesignation") || "Edit Designation")}
              </p>
              <p className="text-[13px] font-bold text-[#07365A] dark:text-white">
                {mode === "create" ? (t("departments.addDesignation") || "Create designation") : initial?.name}
              </p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={onClose} aria-label={t("common.close") || "Close"} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430] disabled:opacity-40"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {serverError && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F0D8D8] bg-[#FFF8F8] px-4 py-3 text-xs font-semibold text-[#EF5350] dark:border-[#5C3838] dark:bg-[#321F25] dark:text-[#F87171]">
              <X size={14} /><span>{serverError}</span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("departments.designationTitle") || "Designation Title"} <span className="text-[#EF5350]">*</span>
            </label>
            <div className="relative">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setTouched(true);
                }}
                onBlur={() => setTouched(true)}
                placeholder={language === "hi" ? "उदा. सॉफ्टवेयर इंजीनियर" : "e.g. Software Engineer"}
                disabled={saving}
                maxLength={80}
                className={`h-10 w-full rounded-xl border px-3.5 pr-10 text-xs font-semibold text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] dark:text-white disabled:opacity-60 ${inputBorderClass}`}
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {checking && <Loader2 size={16} className="animate-spin text-[#0879D9] dark:text-[#00C2E8]" />}
                {!checking && showError && <AlertCircle size={16} className="text-[#EF5350]" />}
                {!checking && isValidAndAvailable && touched && <CheckCircle2 size={16} className="text-[#10B981]" />}
              </div>
            </div>
            <div className="mt-1.5 min-h-[18px]">
              {checking && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#0879D9] dark:text-[#00C2E8]">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t("departments.checkingAvailability") || (language === "hi" ? "उपलब्धता की जांच की जा रही है..." : "Checking availability...")}</span>
                </p>
              )}
              {!checking && showError && (
                <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#EF5350]">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </p>
              )}
              {!checking && isValidAndAvailable && touched && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#10B981]">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{t("departments.desigNameValid") || (language === "hi" ? "पदनाम शीर्षक मान्य और उपलब्ध है।" : "Designation title is valid and available.")}</span>
                </p>
              )}
              {!checking && !showError && (!touched || !isValidAndAvailable) && (
                <p className="text-[11px] text-[#8A9AA3] dark:text-[#66829A]">
                  {language === "hi" ? "मान्य: केवल अक्षर, एकल स्थान, &, -, ' (2-80 वर्ण)" : "Allowed: Letters, single space, &, -, ' (2–80 characters)"}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("departments.department") || "Department"}
            </label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66829A] dark:text-[#8CB0C7]" />
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={saving} className="h-10 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-9 pr-9 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60">
                <option value="">{t("departments.noDepartment") || "No department"}</option>
                {departments.filter((d) => d.status === "ACTIVE").map((d) => (<option key={d._id} value={d._id}>{d.name}</option>))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("departments.description") || "Description"}
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("departments.optionalDescription") || "Optional description..."} disabled={saving} rows={3} className="w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] px-3.5 py-2.5 text-xs font-medium text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60 resize-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7] mb-1.5">
              {t("common.status") || "Status"}
            </label>
            <div className="relative">
              <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")} disabled={saving} className="h-10 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] px-3.5 pr-9 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60">
                <option value="ACTIVE">{t("common.active") || "Active"}</option>
                <option value="INACTIVE">{t("common.inactive") || "Inactive"}</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1A3D56] dark:bg-[#0D2A3E]">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-[#D6E2EB] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40">
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>{t("common.saving") || "Saving..."}</span></>
            ) : (
              <><Check size={14} /><span>{mode === "create" ? (t("departments.addDesignation") || "Create Designation") : (t("common.saveChanges") || "Save Changes")}</span></>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =====================================================
// CONFIRM DELETE MODAL
// =====================================================

function ConfirmDeleteModal({
  title, message, onClose, onConfirm, onArchive, loading,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  onArchive?: () => void;
  loading: boolean;
}) {
  const { t, language } = useLanguage();
  return (
    <Modal isOpen={true} onClose={() => { if (!loading) onClose(); }}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1F1] text-[#EF5350] dark:bg-[#3A2024] dark:text-[#F87171]"><Trash2 size={20} strokeWidth={2} /></div>
          <h3 className="mt-3 text-[15px] font-bold text-[#07365A] dark:text-white">{title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">{message}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1A3D56] dark:bg-[#0D2A3E]">
          <button type="button" disabled={loading} onClick={onClose} className="rounded-xl border border-[#D6E2EB] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40">
            {t("common.cancel") || "Cancel"}
          </button>
          {onArchive && (
            <button type="button" disabled={loading} onClick={onArchive} className="rounded-xl border border-[#D6E2EB] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40">
              {t("common.archiveInstead") || (language === "hi" ? "इसके बजाय संग्रह करें" : "Archive instead")}
            </button>
          )}
          <button type="button" disabled={loading} onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-xl bg-[#EF5350] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>{t("common.deleting") || "Deleting..."}</span></>
            ) : (
              <><Trash2 size={13} /><span>{t("common.delete") || "Delete"}</span></>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// =====================================================
// DEPARTMENTS MANAGEMENT TAB
// =====================================================

function DepartmentsManagementView() {
  const { t, language } = useLanguage();
  const [departments, setDepartments] = useState<DeptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DeptRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeptRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await apiRequest<any>(`/api/admin/departments?${params.toString()}`, { method: "GET" });
      const data = res?.data?.data ?? res?.data ?? res;
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast.error(err?.message || (language === "hi" ? "विभाग लोड करने में विफल।" : "Failed to load departments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDepartments(); }, [statusFilter]); // eslint-disable-line

  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? departments.filter((d) => d.name.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q)) : departments;
  }, [departments, search]);

  const handleDelete = async (action: "delete" | "archive") => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const url = action === "archive" ? `/api/admin/departments/${deleteTarget._id}?action=archive` : `/api/admin/departments/${deleteTarget._id}`;
      await apiRequest<any>(url, { method: "DELETE" });
      if (action === "archive") {
        setDepartments((prev) => prev.map((d) => d._id === deleteTarget._id ? { ...d, status: "INACTIVE" } : d));
        showToast.success(language === "hi" ? `विभाग "${deleteTarget.name}" संग्रहीत किया गया।` : `Department "${deleteTarget.name}" archived.`);
      } else {
        setDepartments((prev) => prev.filter((d) => d._id !== deleteTarget._id));
        showToast.success(language === "hi" ? `विभाग "${deleteTarget.name}" हटा दिया गया।` : `Department "${deleteTarget.name}" deleted.`);
      }
      invalidateMasterData("departments");
      setDeleteTarget(null);
    } catch (err: any) {
      showToast.error(err?.message || (language === "hi" ? "विभाग हटाने में विफल।" : "Failed to delete department."));
    } finally {
      setDeleting(false);
    }
  };

  const activeDepts = departments.filter((d) => d.status === "ACTIVE").length;
  const inactiveDepts = departments.filter((d) => d.status === "INACTIVE").length;
  const totalEmp = departments.reduce((s, d) => s + (d.employeeCount || 0), 0);
  const totalDesig = departments.reduce((s, d) => s + (d.designationCount || 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPI Strip */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-[#E2ECF2] dark:divide-[#1A415C] lg:grid-cols-4 lg:divide-x">
          {[
            { icon: <Building2 size={20} strokeWidth={2} />, label: t("departments.activeDepartments") || "Active Departments", value: activeDepts, description: `${inactiveDepts} ${language === "hi" ? "निष्क्रिय" : "inactive"}`, iconClass: "bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]" },
            { icon: <Users size={20} strokeWidth={2} />, label: t("departments.totalEmployees") || "Total Employees", value: totalEmp, description: language === "hi" ? "सभी विभागों में" : "Across all departments", iconClass: "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" },
            { icon: <Tag size={20} strokeWidth={2} />, label: t("departments.totalDesignations") || "Total Designations", value: totalDesig, description: language === "hi" ? "विभागों से जुड़े" : "Linked to departments", iconClass: "bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]" },
            { icon: <Layers size={20} strokeWidth={2} />, label: t("departments.totalDepartments") || "Total Departments", value: departments.length, description: language === "hi" ? "सभी विभाग" : "All departments", iconClass: "bg-[#FEF7EB] text-[#F5A623] dark:bg-[#3D2C17] dark:text-[#F8BA56]" },
          ].map((kpi) => (
            <div key={kpi.label} className="flex min-h-[88px] items-center gap-3.5 px-5 py-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.iconClass}`}>{kpi.icon}</div>
              <div>
                <p className="text-xs font-semibold text-[#66829A] dark:text-[#8CB0C7]">{kpi.label}</p>
                <p className="text-[28px] font-bold leading-tight text-[#07365A] dark:text-white">{kpi.value}</p>
                <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">{kpi.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Department Directory */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="border-b border-[#EDF3F7] px-5 py-4 sm:px-6 sm:py-5 dark:border-[#1A3D56]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#00A9C7]">
                {t("departments.departmentRegistry") || "DEPARTMENT REGISTRY"}
              </p>
              <h2 className="mt-0.5 text-[17px] font-bold text-[#07365A] dark:text-white">
                {t("departments.manageDepartments") || "Manage Departments"}
              </h2>
              <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                {language === "hi" ? "संगठन विभागों को बनाएं, संपादित करें, संग्रहीत करें या हटाएं।" : "Create, edit, archive or delete organization departments."}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="relative w-full sm:w-[190px]">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("departments.searchDepartments") || "Search departments..."} className="h-9 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-8 pr-3 text-xs font-medium text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")} className="h-9 appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white">
                  <option value="ALL">{t("common.allStatuses") || "All Status"}</option>
                  <option value="ACTIVE">{t("common.active") || "Active"}</option>
                  <option value="INACTIVE">{t("common.inactive") || "Inactive"}</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
              <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#063B61] px-3.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]">
                <Plus size={14} strokeWidth={2.4} /><span>{t("departments.addDepartment") || "Add Department"}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="w-full overflow-x-auto responsive-table-scroll">
          <table className="enterprise-table w-full min-w-[640px] text-left border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
            <thead className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
              <tr className="border-b border-[#D8DEE8] bg-[#F8FAFC] text-[10.5px] font-bold uppercase tracking-wider text-[#66829A] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8CB0C7]">
                <th className="px-5 sm:px-6 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colDepartmentName") || "DEPARTMENT"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colEmployees") || "EMPLOYEES"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colDesignations") || "DESIGNATIONS"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.status") || "STATUS"}</th>
                <th className="px-5 sm:px-6 py-3 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.actions") || "ACTIONS"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#D6E2EB] border-t-[#0879D9]" /><p className="mt-3 text-xs text-[#66829A]">{language === "hi" ? "विभाग लोड हो रहे हैं..." : "Loading departments..."}</p></td></tr>
              ) : filteredDepts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"><Building2 size={20} /></div>
                  <p className="mt-3 text-sm font-bold text-[#07365A] dark:text-white">{t("departments.noDepartmentsFound") || "No departments found"}</p>
                  <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                    {search ? (language === "hi" ? "अपनी खोज बदलने का प्रयास करें।" : "Try changing your search.") : (language === "hi" ? 'आरंभ करने के लिए "विभाग जोड़ें" पर क्लिक करें।' : 'Click "Add Department" to get started.')}
                  </p>
                </td></tr>
              ) : filteredDepts.map((dept) => (
                <tr key={dept._id} className="group h-[68px] transition-colors hover:bg-[#F8FBFC] dark:hover:bg-[#0E2838]">
                  <td className="px-5 sm:px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]"><Building2 size={16} strokeWidth={2} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-[#07365A] dark:text-white">{dept.name}</p>
                        {dept.description && <p className="truncate text-[11.5px] text-[#66829A] dark:text-[#8CB0C7]">{dept.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Users size={13} className="text-[#66829A]" /><span className="text-[13px] font-bold text-[#07365A] dark:text-white">{dept.employeeCount ?? 0}</span></div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Tag size={13} className="text-[#66829A]" /><span className="text-[13px] font-bold text-[#07365A] dark:text-white">{dept.designationCount ?? 0}</span></div></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${dept.status === "ACTIVE" ? "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" : "bg-[#FFF1F1] text-[#EF5350] dark:bg-[#3A2024] dark:text-[#F87171]"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />{dept.status === "ACTIVE" ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                    </span>
                  </td>
                  <td className="px-5 sm:px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditTarget(dept)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#EAF5FC] hover:text-[#0879D9] dark:hover:bg-[#0F354D] dark:hover:text-[#00C2E8] transition" title={t("common.edit") || "Edit"}><Edit2 size={14} strokeWidth={2.2} /></button>
                      <button type="button" onClick={() => setDeleteTarget(dept)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#FFF1F1] hover:text-[#EF5350] dark:hover:bg-[#3A2024] dark:hover:text-[#F87171] transition" title={t("common.delete") || "Delete"}><Trash2 size={14} strokeWidth={2.2} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && <DepartmentFormModal mode="create" onClose={() => setShowCreate(false)} onSaved={(dept) => setDepartments((prev) => [dept, ...prev])} />}
      {editTarget && <DepartmentFormModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSaved={(updated) => { setDepartments((prev) => prev.map((d) => d._id === updated._id ? { ...d, ...updated } : d)); setEditTarget(null); }} />}
      {deleteTarget && (
        <ConfirmDeleteModal
          title={language === "hi" ? `"${deleteTarget.name}" हटाएं?` : `Delete "${deleteTarget.name}"?`}
          message={(deleteTarget.employeeCount ?? 0) > 0 ? (language === "hi" ? `इस विभाग में ${deleteTarget.employeeCount} कर्मचारी सौंपे गए हैं। आप इसे सीधे हटा नहीं सकते — इसके बजाय इसे संग्रहीत करें, या पहले कर्मचारियों को पुनः सौंपें।` : `This department has ${deleteTarget.employeeCount} assigned employee(s). You cannot delete it directly — archive it instead, or reassign employees first.`) : (language === "hi" ? `यह "${deleteTarget.name}" को स्थायी रूप से हटा देगा और सभी संबंधित पदनामों को अनलिंक कर देगा। इस क्रिया को पूर्ववत नहीं किया जा सकता है।` : `This will permanently remove "${deleteTarget.name}" and unlink all associated designations. This action cannot be undone.`)}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete("delete")}
          onArchive={(deleteTarget.employeeCount ?? 0) > 0 ? () => handleDelete("archive") : undefined}
        />
      )}
    </div>
  );
}

// =====================================================
// DESIGNATIONS MANAGEMENT TAB
// =====================================================

function DesignationsManagementView() {
  const { t, language } = useLanguage();
  const [designations, setDesignations] = useState<DesigRecord[]>([]);
  const [departments, setDepartments] = useState<DeptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DesigRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DesigRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (deptFilter !== "ALL") params.set("department", deptFilter);
      const [desigRes, deptRes] = await Promise.all([
        apiRequest<any>(`/api/admin/designations?${params.toString()}`, { method: "GET" }),
        apiRequest<any>("/api/admin/departments", { method: "GET" }),
      ]);
      setDesignations(Array.isArray(desigRes?.data?.data ?? desigRes?.data ?? desigRes) ? desigRes?.data?.data ?? desigRes?.data ?? desigRes : []);
      setDepartments(Array.isArray(deptRes?.data?.data ?? deptRes?.data ?? deptRes) ? deptRes?.data?.data ?? deptRes?.data ?? deptRes : []);
    } catch (err: any) {
      showToast.error(err?.message || (language === "hi" ? "पदनाम लोड करने में विफल।" : "Failed to load designations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); setPage(1); }, [statusFilter, deptFilter]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? designations.filter((d) => d.name.toLowerCase().includes(q) || (d.department?.name || d.departmentName || "").toLowerCase().includes(q)) : designations;
  }, [designations, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiRequest<any>(`/api/admin/designations/${deleteTarget._id}`, { method: "DELETE" });
      setDesignations((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      invalidateMasterData("designations");
      showToast.success(language === "hi" ? `पदनाम "${deleteTarget.name}" हटा दिया गया।` : `Designation "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast.error(err?.message || (language === "hi" ? "पदनाम हटाने में विफल।" : "Failed to delete designation."));
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = designations.filter((d) => d.status === "ACTIVE").length;
  const totalEmp = designations.reduce((s, d) => s + (d.employeeCount || 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KPI Strip */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="grid w-full grid-cols-2 divide-y divide-[#E2ECF2] dark:divide-[#1A415C] sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {[
            { icon: <Tag size={20} strokeWidth={2} />, label: t("departments.totalDesignations") || "Total Designations", value: designations.length, description: language === "hi" ? "सभी पदनाम" : "All titles", iconClass: "bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]" },
            { icon: <Check size={20} strokeWidth={2} />, label: t("common.active") || "Active", value: activeCount, description: `${designations.length - activeCount} ${language === "hi" ? "निष्क्रिय" : "inactive"}`, iconClass: "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" },
            { icon: <Building2 size={20} strokeWidth={2} />, label: t("departments.tabDepartments") || "Departments", value: departments.filter((d) => d.status === "ACTIVE").length, description: language === "hi" ? "सक्रिय विभाग" : "Active depts", iconClass: "bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]" },
            { icon: <Users size={20} strokeWidth={2} />, label: t("departments.assignedEmployees") || "Assigned Employees", value: totalEmp, description: language === "hi" ? "पदनाम के साथ" : "With designations", iconClass: "bg-[#FEF7EB] text-[#F5A623] dark:bg-[#3D2C17] dark:text-[#F8BA56]" },
          ].map((kpi) => (
            <div key={kpi.label} className="flex min-h-[88px] items-center gap-3.5 px-5 py-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.iconClass}`}>{kpi.icon}</div>
              <div>
                <p className="text-xs font-semibold text-[#66829A] dark:text-[#8CB0C7]">{kpi.label}</p>
                <p className="text-[28px] font-bold leading-tight text-[#07365A] dark:text-white">{kpi.value}</p>
                <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">{kpi.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Designation Directory */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="border-b border-[#EDF3F7] px-5 py-4 sm:px-6 sm:py-5 dark:border-[#1A3D56]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#00A9C7]">
                {t("departments.designationRegistry") || "DESIGNATION REGISTRY"}
              </p>
              <h2 className="mt-0.5 text-[17px] font-bold text-[#07365A] dark:text-white">
                {t("departments.manageDesignations") || "Manage Designations"}
              </h2>
              <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                {language === "hi" ? "सभी विभागों में पदनामों को परिभाषित और प्रबंधित करें।" : "Define and manage job titles across all departments."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="relative w-full sm:w-[170px]">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search") || "Search..."} className="h-9 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-8 pr-3 text-xs font-medium text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white" />
              </div>
              <div className="relative">
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-9 appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white">
                  <option value="ALL">{t("common.allDepartments") || "All Departments"}</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")} className="h-9 appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white">
                  <option value="ALL">{t("common.allStatuses") || "All Status"}</option>
                  <option value="ACTIVE">{t("common.active") || "Active"}</option>
                  <option value="INACTIVE">{t("common.inactive") || "Inactive"}</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
              <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#063B61] px-3.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]">
                <Plus size={14} strokeWidth={2.4} /><span>{t("departments.addDesignation") || "Add Designation"}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full text-left border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
            <thead className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
              <tr className="border-b border-[#D8DEE8] bg-[#F8FAFC] text-[10.5px] font-bold uppercase tracking-wider text-[#66829A] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8CB0C7]">
                <th className="px-5 sm:px-6 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colDesignationTitle") || "DESIGNATION"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colDepartmentName") || "DEPARTMENT"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("departments.colEmployees") || "EMPLOYEES"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.status") || "STATUS"}</th>
                <th className="px-5 sm:px-6 py-3 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.actions") || "ACTIONS"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#D6E2EB] border-t-[#0879D9]" /><p className="mt-3 text-xs text-[#66829A]">{language === "hi" ? "पदनाम लोड हो रहे हैं..." : "Loading designations..."}</p></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]"><Tag size={20} /></div>
                  <p className="mt-3 text-sm font-bold text-[#07365A] dark:text-white">{t("departments.noDesignationsFound") || "No designations found"}</p>
                  <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                    {search || deptFilter !== "ALL" || statusFilter !== "ALL" ? (language === "hi" ? "अपने फ़िल्टर बदलने का प्रयास करें।" : "Try changing your filters.") : (language === "hi" ? 'आरंभ करने के लिए "पदनाम जोड़ें" पर क्लिक करें।' : 'Click "Add Designation" to get started.')}
                  </p>
                </td></tr>
              ) : paginated.map((desig) => {
                const deptName = desig.department?.name || desig.departmentName || "";
                return (
                  <tr key={desig._id} className="group h-[68px] transition-colors hover:bg-[#F8FBFC] dark:hover:bg-[#0E2838]">
                    <td className="px-5 sm:px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]"><Briefcase size={15} strokeWidth={2} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#07365A] dark:text-white">{desig.name}</p>
                          {desig.description && <p className="truncate text-[11.5px] text-[#66829A] dark:text-[#8CB0C7]">{desig.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {deptName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5FC] px-2.5 py-1 text-xs font-semibold text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"><span className="h-1.5 w-1.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />{deptName}</span>
                      ) : (
                        <span className="text-xs text-[#66829A] dark:text-[#8CB0C7]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Users size={13} className="text-[#66829A]" /><span className="text-[13px] font-bold text-[#07365A] dark:text-white">{desig.employeeCount ?? 0}</span></div></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${desig.status === "ACTIVE" ? "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" : "bg-[#FFF1F1] text-[#EF5350] dark:bg-[#3A2024] dark:text-[#F87171]"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{desig.status === "ACTIVE" ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setEditTarget(desig)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#EEF4FF] hover:text-[#2F7BE5] dark:hover:bg-[#142A4A] dark:hover:text-[#6FA2F4] transition" title={t("common.edit") || "Edit"}><Edit2 size={14} strokeWidth={2.2} /></button>
                        <button type="button" onClick={() => setDeleteTarget(desig)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#FFF1F1] hover:text-[#EF5350] dark:hover:bg-[#3A2024] dark:hover:text-[#F87171] transition" title={t("common.delete") || "Delete"}><Trash2 size={14} strokeWidth={2.2} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > pageSize && (
          <div className="flex flex-col justify-between gap-3 border-t border-[#EDF3F7] px-5 py-3.5 sm:px-6 sm:py-4 dark:border-[#1A3D56] sm:flex-row sm:items-center">
            <p className="text-xs font-semibold text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi"
                ? `${filtered.length} में से ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} पदनाम दिखाए जा रहे हैं`
                : `Showing ${(safePage - 1) * pageSize + 1} – ${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length} designations`}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} className="inline-flex h-[32px] items-center gap-1 rounded-lg border border-[#D6E2EB] bg-white px-2.5 text-xs font-semibold text-[#536B77] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"><ChevronLeft size={13} /><span>{t("common.previous") || "Previous"}</span></button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pn) => (
                  <button key={pn} type="button" onClick={() => setPage(pn)} className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${safePage === pn ? "bg-[#063B61] text-white dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"}`}>{pn}</button>
                ))}
                {safePage > 5 && safePage < totalPages && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button type="button" className="flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold bg-[#063B61] text-white dark:bg-[#0879D9]">{safePage}</button>
                  </>
                )}
                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button type="button" onClick={() => setPage(totalPages)} className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${safePage === totalPages ? "bg-[#063B61] text-white dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"}`}>{totalPages}</button>
                  </>
                )}
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(p + 1, totalPages))} className="inline-flex h-[32px] items-center gap-1 rounded-lg border border-[#D6E2EB] bg-white px-2.5 text-xs font-semibold text-[#536B77] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"><span>{t("common.next") || "Next"}</span><ChevronRight size={13} /></button>
              </div>

              <GoToPage
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </section>

      {showCreate && <DesignationFormModal mode="create" departments={departments} onClose={() => setShowCreate(false)} onSaved={(desig) => setDesignations((prev) => [desig, ...prev])} />}
      {editTarget && <DesignationFormModal mode="edit" initial={editTarget} departments={departments} onClose={() => setEditTarget(null)} onSaved={(updated) => { setDesignations((prev) => prev.map((d) => d._id === updated._id ? { ...d, ...updated } : d)); setEditTarget(null); }} />}
      {deleteTarget && (
        <ConfirmDeleteModal
          title={language === "hi" ? `"${deleteTarget.name}" हटाएं?` : `Delete "${deleteTarget.name}"?`}
          message={(deleteTarget.employeeCount ?? 0) > 0 ? (language === "hi" ? `इस पदनाम में ${deleteTarget.employeeCount} कर्मचारी हैं। इसे हटाने से मास्टर रिकॉर्ड अनलिंक हो जाएगा लेकिन उनका पदनाम बना रहेगा।` : `This designation has ${deleteTarget.employeeCount} employee(s). Deleting it will unlink the master record but their designation text will remain.`) : (language === "hi" ? `यह स्थायी रूप से पदनाम "${deleteTarget.name}" को हटा देगा। इस क्रिया को पूर्ववत नहीं किया जा सकता है।` : `This will permanently delete the designation "${deleteTarget.name}". This action cannot be undone.`)}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// =====================================================
// EMPLOYEE ASSIGNMENT TAB (existing functionality)
// =====================================================

function EmployeeAssignmentView() {
  const { t, language } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedStat, setSelectedStat] = useState<"DEPARTMENTS" | "ASSIGNED" | "UNASSIGNED" | "EMPLOYEES">("DEPARTMENTS");
  const [assignmentEmployee, setAssignmentEmployee] = useState<Employee | null>(null);
  const [newDepartment, setNewDepartment] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });

  useEffect(() => { setPage(1); }, [search, selectedDepartment, selectedStat]);

  const departments = useMemo(() => {
    const extra = employees
      .map((e) => e.department?.trim())
      .filter((d): d is string => typeof d === "string" && d.length > 0 && !masterDeptNames.includes(d));
    return [...masterDeptNames, ...Array.from(new Set(extra))];
  }, [employees, masterDeptNames]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest<EmployeeResponse>("/api/users/employees", { method: "GET" });
      const data = response?.data;
      const list = Array.isArray(data) ? data : data?.employees ?? [];
      setEmployees(list);
    } catch (err: any) {
      const errorMsg = err?.message || (language === "hi" ? "कर्मचारी विभाग डेटा लोड करने में असमर्थ।" : "Unable to load employee department data.");
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const departmentRows = useMemo(() => {
    return departments.map((department) => {
      const members = employees.filter((e) => e.department?.trim() === department);
      const active = members.filter((e) => getStatus(e) === "Active").length;
      const tasks = members.reduce((total, e) => total + Number(e.totalTasks ?? 0), 0);
      const completed = members.reduce((total, e) => total + Number(e.completedTasks ?? 0), 0);
      return { department, members, active, tasks, completed, completion: tasks > 0 ? Math.round((completed / tasks) * 100) : 0 };
    });
  }, [departments, employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const name = employeeName(employee).toLowerCase();
      const matchesSearch = !query || name.includes(query) || employee.email?.toLowerCase().includes(query) || employee.employeeId?.toLowerCase().includes(query);
      const matchesDepartment = selectedDepartment === "ALL" || employee.department === selectedDepartment;
      const hasDepartment = Boolean(employee.department?.trim());
      const matchesSegment = selectedStat === "DEPARTMENTS" ? true : selectedStat === "ASSIGNED" ? hasDepartment : selectedStat === "UNASSIGNED" ? !hasDepartment : true;
      return matchesSearch && matchesDepartment && matchesSegment;
    });
  }, [employees, search, selectedDepartment, selectedStat]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedEmployees = useMemo(() => filteredEmployees.slice((safePage - 1) * pageSize, safePage * pageSize), [filteredEmployees, safePage]);

  const assignedCount = employees.filter((e) => Boolean(e.department)).length;
  const unassignedCount = employees.length - assignedCount;
  const activeDepartments = departmentRows.filter((d) => d.members.length > 0).length;

  const handleAssign = async () => {
    if (!assignmentEmployee || !newDepartment) return;
    const id = assignmentEmployee._id || assignmentEmployee.id;
    if (!id) {
      const msg = t("employeeIdIsMissing") || (language === "hi" ? "कर्मचारी आईडी गायब है।" : "Employee ID is missing.");
      setError(msg); showToast.warning(msg); return;
    }
    try {
      setSavingId(id); setError(""); setSuccess("");
      const res = await apiRequest(`/api/users/${id}/department`, { method: "PATCH", body: JSON.stringify({ department: newDepartment }) });
      setEmployees((current) => current.map((e) => { const eId = e._id || e.id; return eId !== id ? e : { ...e, department: newDepartment }; }));
      const employeeNameValue = employeeName(assignmentEmployee);
      setAssignmentEmployee(null); setNewDepartment("");
      invalidateMasterData("all");
      const successMsg = (res as any)?.message || (language === "hi" ? `${employeeNameValue} को ${newDepartment} में सौंपा गया।` : `${employeeNameValue} assigned to ${newDepartment}.`);
      setSuccess(successMsg); showToast.success(successMsg);
      window.setTimeout(() => setSuccess(""), 3500);
    } catch (err: any) {
      const errorMsg = err?.message || (language === "hi" ? "विभाग सौंपने में विफल।" : "Failed to assign department.");
      setError(errorMsg); showToast.error(errorMsg);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-24 rounded-2xl bg-white dark:bg-[#0B2538]" />
        <div className="h-[480px] rounded-2xl bg-white dark:bg-[#0B2538]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F0D8D8] bg-[#FFF8F8] px-4 py-3 text-xs font-semibold text-[#EF5350] dark:border-[#5C3838] dark:bg-[#321F25] dark:text-[#F87171]">
          <span>{error}</span>
          <button type="button" aria-label={t("common.close") || "Close"} onClick={() => setError("")} className="text-[#EF5350] hover:opacity-75"><X size={15} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-[#CFEDE2] bg-[#F4FCF9] px-4 py-3 text-xs font-semibold text-[#00A878] dark:border-[#28574B] dark:bg-[#102F2A] dark:text-[#38DFBE]">
          <Check size={15} /><span>{success}</span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="grid w-full grid-cols-2 divide-y divide-[#E2ECF2] dark:divide-[#1A415C] lg:grid-cols-4 lg:divide-y-0 lg:divide-x">
          <DepartmentStatSegment icon={<Building2 size={20} strokeWidth={2} />} label={t("departments.tabDepartments") || "Departments"} value={activeDepartments} description={language === "hi" ? "कर्मचारियों वाले विभाग" : "Departments with employees"} iconClass="bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]" active={selectedStat === "DEPARTMENTS"} onClick={() => { setSelectedStat("DEPARTMENTS"); setSelectedDepartment("ALL"); }} />
          <DepartmentStatSegment icon={<Users size={20} strokeWidth={2} />} label={t("departments.assignedEmployees") || "Assigned Employees"} value={assignedCount} description={language === "hi" ? "विभाग वाले कर्मचारी" : "Employees with a department"} iconClass="bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" active={selectedStat === "ASSIGNED"} onClick={() => { setSelectedStat("ASSIGNED"); setSelectedDepartment("ALL"); }} />
          <DepartmentStatSegment icon={<UserRound size={20} strokeWidth={2} />} label={t("departments.unassignedEmployees") || "Unassigned Employees"} value={unassignedCount} description={language === "hi" ? "विभाग असाइनमेंट की आवश्यकता है" : "Need department assignment"} iconClass="bg-[#FEF7EB] text-[#F5A623] dark:bg-[#3D2C17] dark:text-[#F8BA56]" active={selectedStat === "UNASSIGNED"} onClick={() => { setSelectedStat("UNASSIGNED"); setSelectedDepartment("ALL"); }} />
          <DepartmentStatSegment icon={<Users size={20} strokeWidth={2} />} label={t("departments.totalEmployees") || "Total Employees"} value={employees.length} description={language === "hi" ? "कुल कार्यबल" : "Total workforce"} iconClass="bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]" active={selectedStat === "EMPLOYEES"} onClick={() => { setSelectedStat("EMPLOYEES"); setSelectedDepartment("ALL"); }} />
        </div>
      </section>

      {/* Workforce Directory */}
      <section className="overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="border-b border-[#EDF3F7] px-5 py-4 sm:px-6 sm:py-5 dark:border-[#1A3D56]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#00A9C7]">
                {language === "hi" ? "कार्यबल निर्देशिका" : "WORKFORCE DIRECTORY"}
              </p>
              <h2 className="mt-0.5 text-[17px] font-bold text-[#07365A] dark:text-white">
                {language === "hi" ? "कर्मचारियों को सौंपें" : "Assign employees"}
              </h2>
              <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                {language === "hi" ? "एक कर्मचारी का चयन करें और उचित विभाग सौंपें।" : "Select an employee and assign the appropriate department."}
              </p>
            </div>
            <div className="relative w-full sm:w-[270px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.searchEmployees") || "Search employees..."} className="h-10 w-full rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-9 pr-3 text-xs font-medium text-[#07365A] outline-none transition placeholder:text-[#8A9AA3] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 overflow-x-auto pb-0.5">
            <button type="button" onClick={() => { setSelectedDepartment("ALL"); setSelectedStat("EMPLOYEES"); }} className={`h-[34px] rounded-lg px-3.5 text-xs font-semibold transition-all ${selectedDepartment === "ALL" ? "bg-[#063B61] text-white shadow-2xs dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF] dark:hover:bg-[#123142]"}`}>
              {language === "hi" ? "सभी कर्मचारी" : "All Employees"}
            </button>
            {departments.map((department) => (
              <button type="button" key={department} onClick={() => { setSelectedDepartment(department); setSelectedStat("DEPARTMENTS"); }} className={`h-[34px] rounded-lg px-3.5 text-xs font-semibold transition-all ${selectedDepartment === department ? "bg-[#063B61] text-white shadow-2xs dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF] dark:hover:bg-[#123142]"}`}>{department}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table w-full text-left border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
            <thead className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
              <tr className="border-b border-[#D8DEE8] bg-[#F8FAFC] text-[10.5px] font-bold uppercase tracking-wider text-[#66829A] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8CB0C7]">
                <th className="px-5 sm:px-6 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("employees.colEmployee") || "EMPLOYEE"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{language === "hi" ? "वर्तमान विभाग" : "CURRENT DEPARTMENT"}</th>
                <th className="px-4 py-3 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.status") || "STATUS"}</th>
                <th className="px-5 sm:px-6 py-3 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("common.actions") || "ACTION"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
              {filteredEmployees.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"><Users size={20} /></div>
                  <p className="mt-3 text-sm font-bold text-[#07365A] dark:text-white">{t("employees.noEmployeesFound") || "No employees found"}</p>
                  <p className="mt-0.5 text-xs text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "अपनी खोज या विभाग फ़िल्टर बदलने का प्रयास करें।" : "Try changing your search or department filter."}</p>
                </td></tr>
              ) : paginatedEmployees.map((employee) => {
                const id = employee._id || employee.id || "";
                const name = employeeName(employee);
                const init = initials(employee);
                const status = getStatus(employee);
                return (
                  <tr key={id} className="group h-[68px] transition-colors hover:bg-[#F8FBFC] dark:hover:bg-[#0E2838]">
                    <td className="px-5 sm:px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#EAF5FC] text-xs font-bold text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]">{init}</div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-[#07365A] dark:text-white">{name}</p>
                          <p className="mt-0.5 truncate text-[11.5px] text-[#66829A] dark:text-[#8CB0C7]">{employee.email || (language === "hi" ? "कोई ईमेल नहीं" : "No email")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {employee.department ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5FC] px-2.5 py-1 text-xs font-semibold text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"><span className="h-1.5 w-1.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />{employee.department}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8EA] px-2.5 py-1 text-xs font-semibold text-[#B47716] dark:bg-[#3A2E1D] dark:text-[#E6AA4D]"><span className="h-1.5 w-1.5 rounded-full bg-[#E39A22] dark:bg-[#E6AA4D]" />{language === "hi" ? "असाइन नहीं" : "Unassigned"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Active" ? "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]" : "bg-[#FFF1F1] text-[#EF5350] dark:bg-[#3A2024] dark:text-[#F87171]"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{status === "Active" ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-right">
                      <button type="button" onClick={() => { setAssignmentEmployee(employee); setNewDepartment(employee.department || ""); }} className="inline-flex h-[32px] items-center gap-1.5 rounded-lg bg-[#063B61] px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#042B47] active:scale-[0.99] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]">
                        <Building2 size={13} strokeWidth={2.2} /><span>{language === "hi" ? "बदलें" : "Change"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-[#EDF3F7] px-5 py-3.5 sm:px-6 sm:py-4 dark:border-[#1A3D56] sm:flex-row sm:items-center">
          <p className="text-xs font-semibold text-[#66829A] dark:text-[#8CB0C7]">
            {language === "hi"
              ? `${filteredEmployees.length} में से ${filteredEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredEmployees.length)} कर्मचारी दिखाए जा रहे हैं`
              : `Showing ${filteredEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1} – ${Math.min(safePage * pageSize, filteredEmployees.length)} of ${filteredEmployees.length} employees`}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))} className="inline-flex h-[32px] items-center gap-1 rounded-lg border border-[#D6E2EB] bg-white px-2.5 text-xs font-semibold text-[#536B77] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"><ChevronLeft size={13} /><span>{t("common.previous") || "Previous"}</span></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${safePage === pageNumber ? "bg-[#063B61] text-white shadow-2xs dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"}`}>{pageNumber}</button>
              ))}
              {safePage > 5 && safePage < totalPages && (
                <>
                  <span className="px-1 text-xs text-[#66829A]">…</span>
                  <button type="button" className="flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold bg-[#063B61] text-white shadow-2xs dark:bg-[#0879D9]">{safePage}</button>
                </>
              )}
              {totalPages > 5 && (
                <>
                  <span className="px-1 text-xs text-[#66829A]">…</span>
                  <button type="button" onClick={() => setPage(totalPages)} className={`flex h-[32px] min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${safePage === totalPages ? "bg-[#063B61] text-white shadow-2xs dark:bg-[#0879D9]" : "border border-[#D6E2EB] bg-white text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"}`}>{totalPages}</button>
                </>
              )}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} className="inline-flex h-[32px] items-center gap-1 rounded-lg border border-[#D6E2EB] bg-white px-2.5 text-xs font-semibold text-[#536B77] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#C7D9DF]"><span>{t("common.next") || "Next"}</span><ChevronRight size={13} /></button>
            </div>

            <GoToPage
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </section>

      {/* Assignment Modal */}
      {assignmentEmployee && (
        <Modal
          isOpen={Boolean(assignmentEmployee)}
          onClose={() => { if (!savingId) setAssignmentEmployee(null); }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D6E2EB] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="border-b border-[#EDF3F7] px-5 py-4 dark:border-[#1A3D56]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EAF5FC] text-xs font-bold text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]">{initials(assignmentEmployee)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#07365A] dark:text-white">{employeeName(assignmentEmployee)}</p>
                    <p className="truncate text-xs text-[#66829A] dark:text-[#8CB0C7]">{assignmentEmployee.email || (language === "hi" ? "कर्मचारी खाता" : "Employee account")}</p>
                  </div>
                </div>
                <button type="button" disabled={Boolean(savingId)} onClick={() => setAssignmentEmployee(null)} aria-label={t("common.close") || "Close"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430] disabled:opacity-40"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                {t("departments.assignDepartment") || "Assign Department"}
              </label>
              <div className="relative mt-2">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0879D9] dark:text-[#00C2E8]" />
                <select value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} disabled={Boolean(savingId)} className="h-11 w-full appearance-none rounded-xl border border-[#D6E2EB] bg-[#F8FBFC] pl-10 pr-10 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white disabled:opacity-60">
                  <option value="">{language === "hi" ? "विभाग चुनें" : "Select Department"}</option>
                  {masterDeptNames.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66829A]" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                {language === "hi" ? "कर्मचारी का विभाग असाइनमेंट तुरंत सभी कार्यबल रिकॉर्ड और अनुमतियों में अपडेट हो जाएगा।" : "The employee's department assignment will be updated across all workforce records and permissions immediately."}
              </p>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1A3D56] dark:bg-[#0D2A3E]">
              <button type="button" disabled={Boolean(savingId)} onClick={() => setAssignmentEmployee(null)} className="rounded-xl border border-[#D6E2EB] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF] disabled:opacity-40">
                {t("common.cancel") || "Cancel"}
              </button>
              <button type="button" disabled={!newDepartment || Boolean(savingId)} onClick={handleAssign} className="inline-flex items-center gap-1.5 rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#042B47] dark:bg-[#0879D9] dark:hover:bg-[#0665B6] disabled:cursor-not-allowed disabled:opacity-50">
                {savingId ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>{t("common.saving") || "Saving..."}</span></>
                ) : (
                  <><Check size={14} /><span>{language === "hi" ? "असाइनमेंट सहेजें" : "Save Assignment"}</span></>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<PageTab>("departments");

  return (
    <div className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 dark:bg-[#071F2C]">
      <div className="mx-auto max-w-[1300px] space-y-5 sm:space-y-6">

        {/* PAGE HEADER */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <button type="button" onClick={() => router.push("/admin/employees")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879D9] hover:underline dark:text-[#00C2E8] mb-2">
              <ArrowLeft size={13} strokeWidth={2.4} /><span>{language === "hi" ? "कर्मचारियों पर वापस जाएं" : "Back to Employees"}</span>
            </button>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#00A9C7]">
              {language === "hi" ? "संगठन संरचना" : "ORGANIZATION STRUCTURE"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#07365A] dark:text-white sm:text-[28px]">
              {t("departments.departmentsTitle") || "Departments & Designations"}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
              {t("departments.departmentsSubtitle") || "Manage your organization's departments and designation titles — the single source of truth for workforce structure."}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#D6E2EB] bg-white px-4 py-3 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538] shrink-0 self-start sm:self-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"><ShieldCheck size={18} strokeWidth={2.2} /></div>
            <div>
              <p className="text-xs font-bold text-[#07365A] dark:text-white">{language === "hi" ? "व्यवस्थापक नियंत्रित" : "Admin controlled"}</p>
              <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "मास्टर डेटा प्रबंधन" : "Master data management"}</p>
            </div>
          </div>
        </section>

        {/* TAB NAVIGATION */}
        <section className="flex items-center gap-1 rounded-2xl border border-[#D6E2EB] bg-white p-1.5 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
          {([
            { id: "departments", label: t("departments.tabDepartments") || "Departments", icon: <Building2 size={15} strokeWidth={2.2} /> },
            { id: "designations", label: t("departments.tabDesignations") || "Designations", icon: <Tag size={15} strokeWidth={2.2} /> },
            { id: "assignments", label: t("departments.tabAssignments") || "Employee Assignments", icon: <Users size={15} strokeWidth={2.2} /> },
          ] as { id: PageTab; label: string; icon: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#063B61] text-white shadow-sm dark:bg-[#0879D9]"
                  : "text-[#536B77] hover:bg-[#F5F9FC] dark:text-[#8CB0C7] dark:hover:bg-[#0D2430]"
              }`}
            >
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </section>

        {/* TAB CONTENT */}
        {activeTab === "departments" && <DepartmentsManagementView />}
        {activeTab === "designations" && <DesignationsManagementView />}
        {activeTab === "assignments" && <EmployeeAssignmentView />}

        {/* FOOTER */}
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#D6E2EB] py-5 text-xs text-[#7A93A4] dark:border-[#1E435E] dark:text-[#66829A] sm:flex-row">
          <p>© 2026 MindMatrix. {language === "hi" ? "कार्यबल प्रबंधन।" : "Workforce Management."}</p>
          <div className="flex items-center gap-1.5 font-medium"><ShieldCheck size={14} className="text-[#00A878]" /><span>{language === "hi" ? "सुरक्षित प्रशासनिक वातावरण" : "Secure administrative environment"}</span></div>
        </footer>
      </div>
    </div>
  );
}
