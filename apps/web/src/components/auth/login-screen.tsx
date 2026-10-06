import {
  BarChart3,
  Factory,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  LoginForm,
} from "@/components/auth/login-form";

export function LoginScreen() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f1f6f5] p-3 sm:p-6 lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute -right-28 -top-24 size-80 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -left-24 size-96 rounded-full bg-cyan-100/55 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-24px)] w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_100px_rgba(15,23,42,.10)] sm:min-h-[calc(100dvh-48px)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-[#0d2928] p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -left-16 -top-20 size-72 rounded-full bg-emerald-300/10 blur-2xl" />
          <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-cyan-200/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              <Factory className="size-6" />
            </div>

            <div>
              <h2 className="text-lg font-black">
                تولیدی باقری
              </h2>

              <p className="mt-0.5 text-xs text-white/55">
                سامانه داخلی مدیریت تولید
              </p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-lg py-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-emerald-100">
              <ShieldCheck className="size-3.5" />
              دسترسی امن و اختصاصی پرسنل
            </div>

            <h1 className="text-4xl font-black leading-[1.55] tracking-[-0.04em]">
              کار روزانه، تولید و حساب
              <br />
              ساده‌تر و دقیق‌تر
            </h1>

            <p className="mt-5 max-w-md text-sm leading-8 text-white/60">
              هر نقش فقط ابزارهای موردنیاز خودش را می‌بیند؛ از ثبت کار همکار تا تأیید سرپرست و مدیریت کامل تولید.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4">
                <UsersRound className="mb-4 size-5 text-emerald-200" />

                <p className="text-sm font-black">
                  ساده
                </p>

                <p className="mt-1 text-[11px] leading-5 text-white/45">
                  مناسب استفاده روزانه
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4">
                <BarChart3 className="mb-4 size-5 text-emerald-200" />

                <p className="text-sm font-black">
                  دقیق
                </p>

                <p className="mt-1 text-[11px] leading-5 text-white/45">
                  تولید و حساب یک‌جا
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4">
                <ShieldCheck className="mb-4 size-5 text-emerald-200" />

                <p className="text-sm font-black">
                  امن
                </p>

                <p className="mt-1 text-[11px] leading-5 text-white/45">
                  ورود با کد یک‌بارمصرف
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-white/35">
            Bagheri Production Management System
          </p>
        </section>

        <section className="flex flex-col px-4 py-4 sm:px-8 sm:py-7 lg:justify-center lg:px-14 xl:px-20">
          <div className="mb-5 rounded-[24px] bg-[#102827] p-4 text-white shadow-[0_16px_35px_rgba(16,40,39,.16)] lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <Factory className="size-5" />
              </div>

              <div>
                <p className="text-sm font-black">
                  تولیدی باقری
                </p>

                <p className="mt-1 text-[11px] text-white/50">
                  ورود به پنل کاری
                </p>
              </div>
            </div>
          </div>

          <div className="my-auto w-full rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.055)] sm:p-7 lg:border-0 lg:p-0 lg:shadow-none">
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-[10px] leading-5 text-[var(--muted)] lg:hidden">
            برای ورود، شماره موبایل ثبت‌شده در سیستم را وارد کنید.
          </p>
        </section>
      </div>
    </main>
  );
}
