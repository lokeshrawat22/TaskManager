"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const features = [
  {
    number: "01",
    title: "Innovation Driven",
    description: "Transforming ideas into meaningful digital solutions.",
  },
  {
    number: "02",
    title: "Technology Focused",
    description: "Built with modern, reliable and scalable technology.",
  },
  {
    number: "03",
    title: "Growth Together",
    description: "Helping people collaborate, learn and achieve more.",
  },
];

export default function AuthSidebar() {
    const { t } = useLanguage();


  return (
    <aside className="relative hidden min-h-screen w-[48%] shrink-0 overflow-hidden bg-[#063D63] lg:block">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      {/* Main gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#073D63_0%,#075F7E_50%,#078D92_100%)]" />

      {/* Top glow */}
      <div className="pointer-events-none absolute -left-44 -top-44 h-[520px] w-[520px] rounded-full bg-white/[0.055]" />

      {/* Bottom glow */}
      <div className="pointer-events-none absolute -bottom-56 -right-44 h-[560px] w-[560px] rounded-full bg-[#19D4D2]/20" />

      {/* Large circle */}
      <div className="pointer-events-none absolute -right-20 top-[44%] h-[260px] w-[260px] rounded-full border border-white/[0.09]" />

      {/* Inner circle */}
      <div className="pointer-events-none absolute right-2 top-[50%] h-[150px] w-[150px] rounded-full border border-white/[0.055]" />

      {/* Small glow */}
      <div className="pointer-events-none absolute bottom-[20%] left-[25%] h-36 w-36 rounded-full bg-[#00D4C7]/10 blur-3xl" />

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* =====================================================
          MAIN CONTENT WRAPPER
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen flex-col px-8 py-8 xl:px-12 xl:py-9 2xl:px-16">
        {/* This keeps everything visually centered */}
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[570px] flex-1 flex-col">
          {/* =================================================
              LOGO
          ================================================== */}

          <div className="mb-9">
            <div className="relative inline-flex h-[118px] w-[168px] items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/[0.96] shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
              {/* Logo glow */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#42D9E0]/15 blur-3xl" />

              <Image src="/MindMatrix.svg" alt="MindMatrix" width={165} height={100} priority className="relative z-10 h-auto w-[150px] object-contain" />
            </div>
          </div>

          {/* =================================================
              HERO CONTENT
          ================================================== */}

          <div className="w-full">
            {/* Eyebrow */}
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[2px] w-8 shrink-0 rounded-full bg-[#70E8E2]" />

              <p className="text-[10px] font-bold uppercase tracking-[3.4px] text-[#79E9E2]">{t("innovationTechnologyGrowth1")}</p>
            </div>

            {/* Heading */}
            <h1 className="max-w-[520px] text-[42px] font-bold leading-[1.08] tracking-[-1.4px] text-white xl:text-[46px] 2xl:text-[50px]">
              {t("buildSmarter")}<br />

              <span className="bg-gradient-to-r from-white via-[#D7FFFC] to-[#7BEAE4] bg-clip-text text-transparent">{t("growTogether")}</span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-[490px] text-[14px] leading-[1.75] text-white/75 xl:text-[15px]">
              {t("mindmatrixBringsPeopleIdeas")}</p>

            {/* =================================================
                FEATURES
            ================================================== */}

            <div className="mt-9 max-w-[500px] space-y-2.5">
              {features.map((feature) => (
                <div key={feature.number} className="group flex items-center gap-4 rounded-xl border border-transparent px-2 py-3 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.045]">
                  {/* Number */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-[11px] font-bold text-[#78E9E2] transition-all duration-300 group-hover:border-[#78E9E2]/25 group-hover:bg-[#78E9E2]/10">
                    {feature.number}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-5 text-white xl:text-[14px]">{feature.title}</p>

                    <p className="mt-0.5 max-w-[400px] text-[11px] leading-[18px] text-white/55 xl:text-[12px]">{feature.description}</p>
                  </div>

                  {/* Arrow */}
                  <span className="mr-1 translate-x-1 text-[16px] text-[#75E6DF]/50 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">→</span>
                </div>
              ))}
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

          <div className="mt-auto pt-8">
            {/* Divider */}
            <div className="mb-4 h-px w-full bg-gradient-to-r from-white/15 via-white/10 to-transparent" />

            <div className="flex items-center justify-between gap-4">
              {/* Copyright */}
              <p className="text-[10px] text-white/45 xl:text-[11px]">{t("2026MindmatrixAllRights")}</p>

              {/* Secure */}
              <div className="flex items-center gap-2 text-[10px] font-medium text-white/45">
                <span className="h-1.5 w-1.5 rounded-full bg-[#75E6DF] shadow-[0_0_8px_rgba(117,230,223,0.9)]" />

                {t("secureAccess")}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}