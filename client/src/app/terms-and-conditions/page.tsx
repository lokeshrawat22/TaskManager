"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const sections = [
    {
        id: "acceptance",
        number: "01",
        title: "Acceptance of Terms",
    },
    {
        id: "eligibility",
        number: "02",
        title: "Eligibility",
    },
    {
        id: "account",
        number: "03",
        title: "Account Registration",
    },
    {
        id: "security",
        number: "04",
        title: "Account Security",
    },
    {
        id: "acceptable-use",
        number: "05",
        title: "Acceptable Use",
    },
    {
        id: "content",
        number: "06",
        title: "User Content",
    },
    {
        id: "privacy",
        number: "07",
        title: "Privacy",
    },
    {
        id: "termination",
        number: "08",
        title: "Account Termination",
    },
    {
        id: "disclaimer",
        number: "09",
        title: "Disclaimer",
    },
    {
        id: "limitation",
        number: "10",
        title: "Limitation of Liability",
    },
    {
        id: "changes",
        number: "11",
        title: "Changes to Terms",
    },
    {
        id: "contact",
        number: "12",
        title: "Contact Us",
    },
];


// ======================================================
// ICONS
// ======================================================

const DocumentIcon = () => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
    </svg>
);


const ShieldIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);


const ArrowIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);


const MailIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
        />
        <path d="m3 7 9 6 9-6" />
    </svg>
);


const CheckIcon = () => (
    <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m5 12 4 4L19 6" />
    </svg>
);


export default function TermsAndConditionsPage() {
    const { t } = useLanguage();


    return (
        <main className="min-h-screen bg-[#F4F9FC] text-[#102A43]">

            {/* =====================================================
          HEADER
      ===================================================== */}

            <header className="sticky top-0 z-50 border-b border-[#DCE8EF]/80 bg-white/90 backdrop-blur-xl">

                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">

                    {/* LOGO */}

                    <Link
                        href="/"
                        className="group flex items-center gap-2.5"
                    >

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2D63] to-[#08AFA3] text-white shadow-sm transition group-hover:scale-105">
                            <span className="text-sm font-bold">
                                M
                            </span>
                        </div>

                        <div>
                            <div className="text-[17px] font-bold leading-none tracking-tight text-[#0B2D63]">
                                {t("mind")}<span className="text-[#08AFA3]">{t("matrix")}</span>
                            </div>

                            <div className="mt-1 text-[7px] font-semibold uppercase tracking-[1.7px] text-[#94A3B8]">
                                {t("secureAuthentication")}</div>
                        </div>

                    </Link>


                    {/* BACK BUTTON */}

                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-2 rounded-xl border border-[#D7E4EE] bg-white px-4 py-2.5 text-xs font-semibold text-[#0B2D63] shadow-sm transition-all hover:-translate-y-[1px] hover:border-[#08AFA3] hover:text-[#087DB5] hover:shadow-md"
                    >
                        <span>{t("backToLogin1")}</span>

                        <ArrowIcon />
                    </Link>

                </div>

            </header>


            {/* =====================================================
          HERO
      ===================================================== */}

            <section className="relative overflow-hidden border-b border-white/10 bg-[#082752]">

                {/* BACKGROUND EFFECTS */}

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(8,175,163,0.22),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(8,125,181,0.25),transparent_32%)]" />

                <div className="absolute -right-28 top-[-100px] h-80 w-80 rounded-full border border-white/10" />

                <div className="absolute -right-16 top-[-45px] h-56 w-56 rounded-full border border-white/5" />

                <div className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-[#08AFA3]/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-[72px]">

                    <div className="max-w-3xl">

                        {/* BADGE */}

                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5BE3D7]/20 bg-[#5BE3D7]/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[2px] text-[#8CF3EA]">

                            <DocumentIcon />

                            {t("legalDocument")}</div>


                        {/* TITLE */}

                        <h1 className="text-4xl font-bold tracking-[-1px] text-white md:text-5xl lg:text-[52px]">
                            {t("terms")}{" "}
                            <span className="text-[#4EDDD0]">
                                {t("conditions")}</span>
                        </h1>


                        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#C5D6E8] md:text-[15px]">
                            {t("pleaseReadTheseTerms")}</p>


                        {/* META */}

                        <div className="mt-7 flex flex-wrap items-center gap-3">

                            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-xs text-[#D8E5F1] backdrop-blur">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#4EDDD0]" />
                                {t("lastUpdatedAugust12")}</div>

                            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-xs text-[#D8E5F1] backdrop-blur">
                                <ShieldIcon />
                                {t("secureTransparent")}</div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
          CONTENT
      ===================================================== */}

            <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">

                <div className="grid gap-7 lg:grid-cols-[255px_minmax(0,1fr)]">


                    {/* =================================================
              SIDEBAR
          ================================================= */}

                    <aside className="h-fit lg:sticky lg:top-[92px]">

                        <div className="overflow-hidden rounded-2xl border border-[#DCE8EF] bg-white shadow-[0_12px_35px_rgba(11,45,99,0.06)]">

                            {/* SIDEBAR HEADER */}

                            <div className="border-b border-[#E7EEF3] bg-[#F8FBFD] px-12 py-4">

                                <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#08AFA3]">
                                    {t("contents")}</p>

                                <p className="  mt-1 text-xs font-semibold leading-4 text-[#334E68]">
                                    {t("12Sections")}</p>

                            </div>


                            {/* NAVIGATION */}

                            <nav className="max-h-[calc(100vh-190px)] overflow-y-auto p-2">

                                {sections.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-[#F0FAFC]"
                                    >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F7] text-[9px] font-bold text-[#526B7A] transition-all group-hover:bg-[#DDF7F4] group-hover:text-[#087DB5]">
                                            {section.number}
                                        </span>

                                        <span className="text-[11px] font-semibold leading-4 text-[#334E68] transition group-hover:text-[#087DB5]">
                                            {section.title}
                                        </span>
                                    </a>
                                ))}

                            </nav>

                        </div>

                    </aside>


                    {/* =================================================
              MAIN CONTENT
          ================================================= */}

                    <article className="overflow-hidden rounded-2xl border border-[#DCE8EF] bg-white shadow-[0_12px_40px_rgba(11,45,99,0.06)]">


                        {/* INTRO */}

                        <div className="border-b border-[#E5EDF2] p-6 md:p-9">

                            <div className="flex gap-4 rounded-2xl border border-[#BFE8E4] bg-gradient-to-br from-[#F0FBFA] to-[#F7FCFE] p-5 md:p-6">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDF7F4] text-[#087DB5]">
                                    <ShieldIcon />
                                </div>

                                <div>

                                    <h2 className="text-sm font-bold text-[#0B2D63]">
                                        {t("beforeYouContinue")}</h2>

                                    <p className="mt-1.5 text-sm leading-6 text-[#64748B]">
                                        {t("theseTermsConditionsGovern")}</p>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                1. ACCEPTANCE
            ================================================= */}

                        <section
                            id="acceptance"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="01"
                                title={t("acceptanceOfTerms")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("byAccessingOrUsing")}</p>

                        </section>


                        {/* =================================================
                2. ELIGIBILITY
            ================================================= */}

                        <section
                            id="eligibility"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="02"
                                title={t("eligibility")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("youMustProvideAccurate")}</p>

                        </section>


                        {/* =================================================
                3. ACCOUNT
            ================================================= */}

                        <section
                            id="account"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="03"
                                title={t("accountRegistration")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("toAccessCertainFeatures")}</p>

                            <BulletList
                                items={[
                                    "Provide accurate registration information.",
                                    "Maintain the accuracy of your account information.",
                                    "Do not create an account using another person's identity.",
                                    "Do not create accounts for unauthorized or unlawful purposes.",
                                ]}
                            />

                        </section>


                        {/* =================================================
                4. SECURITY
            ================================================= */}

                        <section
                            id="security"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="04"
                                title={t("accountSecurity")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("youAreResponsibleFor")}</p>

                        </section>


                        {/* =================================================
                5. ACCEPTABLE USE
            ================================================= */}

                        <section
                            id="acceptable-use"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="05"
                                title={t("acceptableUse")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("youAgreeToUse")}</p>

                            <BulletList
                                items={[
                                    "Do not use the platform for unlawful activities.",
                                    "Do not attempt to gain unauthorized access to systems or accounts.",
                                    "Do not interfere with the operation or security of the platform.",
                                    "Do not upload malicious software or harmful content.",
                                    "Do not misuse another user's information or account.",
                                ]}
                            />

                        </section>


                        {/* =================================================
                6. CONTENT
            ================================================= */}

                        <section
                            id="content"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="06"
                                title={t("userContent")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("ifMindmatrixAllowsYou")}</p>

                        </section>


                        {/* =================================================
                7. PRIVACY
            ================================================= */}

                        <section
                            id="privacy"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="07"
                                title={t("privacy")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("yourUseOfMindmatrix")}</p>

                            <Link
                                href="/privacy-policy"
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#087DB5] transition hover:text-[#08AFA3]"
                            >
                                {t("viewPrivacyPolicy")}<ArrowIcon />
                            </Link>

                        </section>


                        {/* =================================================
                8. TERMINATION
            ================================================= */}

                        <section
                            id="termination"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="08"
                                title={t("accountTermination")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("weMaySuspendOr")}</p>

                        </section>


                        {/* =================================================
                9. DISCLAIMER
            ================================================= */}

                        <section
                            id="disclaimer"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="09"
                                title={t("disclaimer")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("mindmatrixIsProvidedOn")}</p>

                        </section>


                        {/* =================================================
                10. LIABILITY
            ================================================= */}

                        <section
                            id="limitation"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="10"
                                title={t("limitationOfLiability")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("toTheExtentPermitted")}</p>

                        </section>


                        {/* =================================================
                11. CHANGES
            ================================================= */}

                        <section
                            id="changes"
                            className="scroll-mt-28 border-b border-[#E8EEF2] px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="11"
                                title={t("changesToTheseTerms")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("weMayUpdateThese")}</p>

                        </section>


                        {/* =================================================
                12. CONTACT
            ================================================= */}

                        <section
                            id="contact"
                            className="scroll-mt-28 px-6 py-8 md:px-9"
                        >

                            <SectionHeading
                                number="12"
                                title={t("contactUs")}
                            />

                            <p className="mt-4 text-sm leading-7 text-[#64748B]">
                                {t("ifYouHaveQuestions")}</p>


                            {/* CONTACT CARD */}

                            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#DCE8EF] bg-gradient-to-br from-[#F7FBFD] to-[#F0FAFA] p-5 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DDF7F4] text-[#087DB5]">
                                        <MailIcon />
                                    </div>

                                    <div>

                                        <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#94A3B8]">
                                            {t("supportEmail")}</p>

                                        <a
                                            href="mailto:support@mindmatrix.com"
                                            className="mt-1 block text-sm font-bold text-[#087DB5] transition hover:text-[#08AFA3]"
                                        >
                                            {t("supportmindmatrixcom")}</a>

                                    </div>

                                </div>

                                <Link
                                    href="mailto:support@mindmatrix.com"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B2D63] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#087DB5]"
                                >
                                    {t("contactSupport")}<ArrowIcon />
                                </Link>

                            </div>

                        </section>


                        {/* =================================================
                ACKNOWLEDGEMENT
            ================================================= */}

                        <div className="mx-6 mb-8 rounded-2xl border border-[#BFE8E4] bg-gradient-to-r from-[#F0FBFA] to-[#F5FAFF] p-5 md:mx-9">

                            <div className="flex gap-3">

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DDF7F4] text-[#087DB5]">
                                    <CheckIcon />
                                </div>

                                <p className="text-sm font-medium leading-6 text-[#425466]">
                                    {t("byUsingMindmatrixYou")}</p>

                            </div>

                        </div>

                    </article>

                </div>

            </section>


            {/* =====================================================
          FOOTER
      ===================================================== */}

            <footer className="border-t border-[#DCE8EF] bg-white">

                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-center md:flex-row md:items-center md:justify-between md:px-8 md:text-left">

                    <div>

                        <p className="text-sm font-bold text-[#0B2D63]">
                            {t("mind")}<span className="text-[#08AFA3]">{t("matrix")}</span>
                        </p>

                        <p className="mt-1 text-[11px] text-[#94A3B8]">
                            {t("secureAuthenticationForModern")}</p>

                    </div>


                    <div className="flex justify-center gap-5 text-xs md:justify-end">

                        <Link
                            href="/privacy-policy"
                            className="text-[#64748B] transition hover:text-[#087DB5]"
                        >
                            {t("privacyPolicy")}</Link>

                        <Link
                            href="/terms-and-conditions"
                            className="font-semibold text-[#087DB5]"
                        >
                            {t("termsConditions")}</Link>

                    </div>


                    <p className="text-[11px] text-[#94A3B8]">
                        {t("2026MindmatrixAllRights")}</p>

                </div>

            </footer>

        </main>
    );
}


// ======================================================
// SECTION HEADING
// ======================================================

function SectionHeading({
    number,
    title,
}: {
    number: string;
    title: string;
}) {

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


// ======================================================
// BULLET LIST
// ======================================================

function BulletList({
    items,
}: {
    items: string[];
}) {

    return (
        <ul className="mt-5 space-y-2.5">

            {items.map((item) => (
                <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-6 text-[#64748B]"
                >

                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#08AFA3]" />

                    <span>{item}</span>

                </li>
            ))}

        </ul>
    );
}