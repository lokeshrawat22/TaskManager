"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const sections = [
  { id: "overview", number: "01", title: "Overview & Statutory Notice" },
  { id: "data-controller", number: "02", title: "Data Fiduciary & Contact" },
  { id: "data-collection", number: "03", title: "Personal Data We Collect" },
  { id: "purposes", number: "04", title: "Purposes of Processing" },
  { id: "consent", number: "05", title: "Consent & Legal Grounds" },
  { id: "security-measures", number: "06", title: "Security & Protection" },
  { id: "data-retention", number: "07", title: "Retention & Storage" },
  { id: "user-rights", number: "08", title: "Your Statutory Rights (DPDP Act 2023)" },
  { id: "grievance", number: "09", title: "Grievance Redressal & DPO" },
  { id: "updates", number: "10", title: "Policy Updates" },
];

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#F4F9FC] text-[#102A43]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#DCE8EF]/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2D63] to-[#08AFA3] text-white shadow-sm transition group-hover:scale-105">
              <span className="text-sm font-bold">M</span>
            </div>
            <div>
              <div className="text-[17px] font-bold leading-none tracking-tight text-[#0B2D63]">
                {t("mind")}<span className="text-[#08AFA3]">{t("matrix")}</span>
              </div>
              <div className="mt-1 text-[7px] font-semibold uppercase tracking-[1.7px] text-[#94A3B8]">
                {t("secureAuthentication") || "SECURE TASK MANAGEMENT"}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-xl border border-[#DCE8EF] bg-white px-4 py-2 text-xs font-semibold text-[#0B2D63] shadow-sm transition hover:border-[#087DB5] hover:text-[#087DB5]"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="border-b border-[#DCE8EF] bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#08AFA3]/30 bg-[#08AFA3]/10 px-3.5 py-1 text-xs font-semibold text-[#08AFA3]">
            <ShieldIcon />
            <span>Digital Personal Data Protection Act, 2023 Compliant</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B2D63] md:text-4xl">
            Privacy Policy & Notice
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#526671] md:text-base">
            MindMatrix (&quot;TaskManager&quot;) is committed to safeguarding personal data in accordance with the
            Digital Personal Data Protection Act, 2023 (DPDP Act) and international information security best practices.
            This notice sets forth how we collect, process, protect, and fulfill your rights regarding your digital personal data.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#526671]">
            <span><strong>Effective Date:</strong> September 5, 2026</span>
            <span>&bull;</span>
            <span><strong>Version:</strong> 1.0 (DPDP-2023 Aligned)</span>
            <span>&bull;</span>
            <span><strong>Jurisdiction:</strong> Republic of India</span>
          </div>
        </div>
      </div>

      {/* BODY CONTENT & SIDEBAR */}
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 rounded-2xl border border-[#DCE8EF] bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Table of Contents
              </h2>
              <nav className="mt-4 space-y-1">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-[#526671] transition hover:bg-[#F4F9FC] hover:text-[#087DB5]"
                  >
                    <span className="font-mono text-[10px] font-semibold text-[#08AFA3]">
                      {sec.number}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </a>
                ))}
              </nav>

              <div className="mt-6 rounded-xl border border-[#08AFA3]/20 bg-[#08AFA3]/5 p-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0B2D63]">
                  <LockIcon />
                  <span>Data Minimization</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#526671]">
                  We only request information strictly necessary for task assignment and authentication. Date of Birth and Gender are strictly optional.
                </p>
              </div>
            </div>
          </aside>

          {/* Detailed Policy Sections */}
          <div className="space-y-12 lg:col-span-8">
            {/* Section 1 */}
            <section id="overview" className="scroll-mt-28">
              <SectionHeading number="01" title="Overview & Statutory Notice" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                This Privacy Policy serves as statutory notice under Section 5 of the Digital Personal Data Protection Act, 2023
                (&quot;DPDP Act&quot;). It describes the categories of personal data collected, the specified purposes for which it is
                processed, how consent may be withdrawn, and the mechanisms available to exercise statutory data principal rights.
              </p>
            </section>

            {/* Section 2 */}
            <section id="data-controller" className="scroll-mt-28">
              <SectionHeading number="02" title="Data Fiduciary & Contact Information" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                For the purposes of the DPDP Act, MindMatrix operates as the <strong>Data Fiduciary</strong> determining the purpose
                and means of processing personal data for the TaskManager enterprise application.
              </p>
              <div className="mt-4 rounded-xl border border-[#DCE8EF] bg-white p-4">
                <div className="text-xs font-semibold text-[#0B2D63]">Data Fiduciary Details</div>
                <div className="mt-2 text-xs leading-5 text-[#526671]">
                  MindMatrix Task Management Platform<br />
                  Information Technology Department<br />
                  Inquiry Email: <a href="mailto:privacy@mindmatrix.local" className="text-[#087DB5] hover:underline">privacy@mindmatrix.local</a>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="data-collection" className="scroll-mt-28">
              <SectionHeading number="03" title="Personal Data We Collect" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                In adherence to Section 6 (Data Minimization) of the DPDP Act, we collect only the personal data reasonably necessary
                to deliver task management services:
              </p>
              <BulletList
                items={[
                  "Account Identity: First Name, Last Name, Work Email Address, and Mobile Phone Number.",
                  "Organizational Data: Assigned role (Admin or Employee/User), Qualification, and Task activity records.",
                  "Voluntary Data: Date of Birth and Gender may be provided voluntarily but are not required to access the platform.",
                  "System & Security Metadata: IP addresses, access timestamps, authentication attempt outcomes, and session tokens for security telemetry and audit logging.",
                ]}
              />
            </section>

            {/* Section 4 */}
            <section id="purposes" className="scroll-mt-28">
              <SectionHeading number="04" title="Purposes of Processing" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                Your personal data is processed solely for lawful, specific, and legitimate operational purposes:
              </p>
              <BulletList
                items={[
                  "Account Authentication & Access Control: To verify your identity, maintain authenticated sessions, and protect against unauthorized access.",
                  "Task Allocation & Project Collaboration: To assign tasks, track deadlines, process status transitions, and facilitate team workflow.",
                  "Platform Notifications: To send critical account security notices, OTP verification codes, and task assignments via verified channels.",
                  "Information Security & Fraud Prevention: To monitor authentication failures, prevent brute-force attacks, and maintain non-repudiable audit trails.",
                ]}
              />
            </section>

            {/* Section 5 */}
            <section id="consent" className="scroll-mt-28">
              <SectionHeading number="05" title="Consent & Legal Grounds" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                Processing is carried out based on your free, specific, informed, unconditional, and unambiguous consent obtained at
                registration, or for certain legitimate uses as recognized under Section 7 of the DPDP Act (e.g., employment-related
                activity and platform integrity).
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#526671]">
                Consent records are immutably captured with timestamps and version identifiers. You have the right to withdraw your
                consent at any time by requesting account deletion through your account Settings page.
              </p>
            </section>

            {/* Section 6 */}
            <section id="security-measures" className="scroll-mt-28">
              <SectionHeading number="06" title="Security & Protection (SOC 2 Controls)" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                In accordance with SOC 2 Common Criteria and Section 8(5) of the DPDP Act, MindMatrix implements robust technical and
                organizational measures:
              </p>
              <BulletList
                items={[
                  "Cryptographic Hashing: Passwords are irreversibly hashed using salted bcrypt prior to database storage.",
                  "Data in Transit: All client-server communications are enforced over TLS/HTTPS with strict certificate validation.",
                  "Cookie Protection: Authentication tokens are stored in SameSite=Lax, HttpOnly cookies with strict CSRF verification.",
                  "Brute Force & Rate Limiting: Strict rate limits and automated account lockouts trigger after repeated failed login attempts.",
                  "Data Sanitization: All user exports are sanitized to prevent spreadsheet formula injection attacks.",
                ]}
              />
            </section>

            {/* Section 7 */}
            <section id="data-retention" className="scroll-mt-28">
              <SectionHeading number="07" title="Retention & Storage" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                Personal data is retained only for as long as your account remains active or as required to fulfill statutory legal
                obligations. When an employee deletes their account via the Settings portal, personal identification records are
                promptly removed, and active tasks are unassigned in accordance with our data erasure schedule.
              </p>
            </section>

            {/* Section 8 */}
            <section id="user-rights" className="scroll-mt-28">
              <SectionHeading number="08" title="Your Statutory Rights (DPDP Act 2023)" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                As a Data Principal under the DPDP Act 2023, you possess enforceable rights:
              </p>
              <BulletList
                items={[
                  "Right to Access: You may request a machine-readable summary of your personal data processed by the platform via the self-service export API.",
                  "Right to Correction & Erasure: You may edit your profile information at any time or permanently delete your account through Account Settings.",
                  "Right of Grievance Redressal: You are entitled to a timely and transparent resolution of any privacy concerns through our Grievance Officer.",
                  "Right to Nominate: In the event of death or incapacity, you may nominate an individual to exercise your privacy rights.",
                ]}
              />
            </section>

            {/* Section 9 */}
            <section id="grievance" className="scroll-mt-28">
              <SectionHeading number="09" title="Grievance Redressal & Data Protection Officer" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                Pursuant to Section 8(9) of the DPDP Act 2023, MindMatrix has appointed a Grievance Officer to resolve any inquiries
                or complaints regarding your personal data:
              </p>
              <div className="mt-4 rounded-xl border border-[#087DB5]/30 bg-[#087DB5]/5 p-5">
                <div className="flex items-center gap-2 font-bold text-[#0B2D63]">
                  <MailIcon />
                  <span>Office of the Data Protection & Grievance Officer</span>
                </div>
                <div className="mt-3 text-xs leading-6 text-[#526671]">
                  <strong>Designation:</strong> Data Protection & Grievance Officer<br />
                  <strong>Organization:</strong> MindMatrix Technologies<br />
                  <strong>Email:</strong> <a href="mailto:grievance-officer@mindmatrix.local" className="text-[#087DB5] font-semibold hover:underline">grievance-officer@mindmatrix.local</a><br />
                  <strong>Response SLA:</strong> Inquiries are acknowledged within 24 hours and addressed within 7 business days.
                </div>
              </div>
            </section>

            {/* Section 10 */}
            <section id="updates" className="scroll-mt-28">
              <SectionHeading number="10" title="Policy Updates & Notices" />
              <p className="mt-4 text-sm leading-relaxed text-[#526671]">
                We may periodically update this policy to reflect changes in regulatory standards or security practices. Material
                revisions will be communicated through platform notifications or at subsequent authentication points before continued
                processing.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#DCE8EF] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-center md:flex-row md:items-center md:justify-between md:px-8 md:text-left">
          <div>
            <p className="text-sm font-bold text-[#0B2D63]">
              {t("mind")}<span className="text-[#08AFA3]">{t("matrix")}</span>
            </p>
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              {t("secureAuthenticationForModern") || "Secure task management for modern teams"}
            </p>
          </div>

          <div className="flex justify-center gap-5 text-xs md:justify-end">
            <Link href="/privacy-policy" className="font-semibold text-[#087DB5]">
              {t("privacyPolicy") || "Privacy Policy"}
            </Link>
            <Link href="/terms-and-conditions" className="text-[#64748B] transition hover:text-[#087DB5]">
              {t("termsConditions") || "Terms & Conditions"}
            </Link>
          </div>

          <p className="text-[11px] text-[#94A3B8]">
            {t("2026MindmatrixAllRights") || "© 2026 MindMatrix. All rights reserved."}
          </p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2D63] to-[#087DB5] text-[10px] font-bold text-white shadow-sm">
        {number}
      </span>
      <h2 className="text-lg font-bold tracking-tight text-[#0B2D63] md:text-xl">
        {title}
      </h2>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#526671]">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#08AFA3]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
