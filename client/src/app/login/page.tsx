import AuthSidebar from "@/components/auth/AuthSidebar";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full overflow-x-hidden">
      {/* =====================================================
          LEFT SIDE
      ====================================================== */}

      <AuthSidebar />

      {/* =====================================================
          RIGHT SIDE
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
          py-6
          md:px-6
        "
      >
        {/* =====================================================
            DECORATIVE BACKGROUND
        ====================================================== */}

        {/* Top right glow */}
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

        {/* Bottom left glow */}
        <div
          className="
            pointer-events-none
            absolute
            -bottom-32
            left-10
            h-72
            w-72
            rounded-full
            bg-[#087DB5]/5
            blur-3xl
          "
        />

        {/* Small decorative circle */}
        <div
          className="
            pointer-events-none
            absolute
            right-[12%]
            top-[18%]
            h-32
            w-32
            rounded-full
            border
            border-[#087DB5]/5
          "
        />

        {/* =====================================================
            LOGIN FORM
        ====================================================== */}

        <LoginForm />
      </section>
    </main>
  );
}