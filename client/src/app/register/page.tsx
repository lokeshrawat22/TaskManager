import AuthSidebar from "@/components/auth/AuthSidebar";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen w-full overflow-x-hidden">
      {/* =====================================================
          LEFT SIDEBAR
      ====================================================== */}

      <AuthSidebar />

      {/* =====================================================
          RIGHT REGISTER SECTION
      ====================================================== */}

      <section
        className="
          relative
          flex
          min-h-screen
          min-w-0
          flex-1
          items-center
          justify-center
          overflow-y-auto
          overflow-x-hidden
          bg-gradient-to-br
          from-[#F8FBFF]
          via-[#F2F8FC]
          to-[#EAF8F7]
          px-4
          py-5
          md:px-6
        "
      >
        {/* Background Decoration */}

        <div
          className="
            pointer-events-none
            absolute
            -right-28
            -top-28
            h-80
            w-80
            rounded-full
            bg-[#10A9D1]/10
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-32
            -left-32
            h-80
            w-80
            rounded-full
            bg-[#10B8A8]/10
            blur-3xl
          "
        />

        {/* Register Form */}

        <RegisterForm />
      </section>
    </main>
  );
}