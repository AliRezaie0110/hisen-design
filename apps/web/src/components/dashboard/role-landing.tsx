import {
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Factory,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  AuthUser,
  UserRole,
} from "@/lib/auth";
import {
  AppShell,
} from "@/components/layout/app-shell";

type Card = {
  title: string;
  description: string;
  icon:
    typeof Factory;
  badge?: string;
};

const roleContent: Record<
  UserRole,
  {
    eyebrow: string;
    title: string;
    description: string;
    cards: Card[];
  }
> = {
  WORKER: {
    eyebrow:
      "پنل همکار",
    title:
      "کارهای من",
    description:
      "ثبت تعداد کار انجام‌شده، مشاهده وضعیت تأیید و پیگیری درآمد و پرداخت‌های شخصی.",
    cards: [
      {
        title:
          "ثبت کار امروز",
        description:
          "انتخاب سری‌کار و ثبت تعداد انجام‌شده",
        icon:
          ClipboardCheck,
        badge:
          "مرحله بعد",
      },
      {
        title:
          "وضعیت تأیید",
        description:
          "مشاهده کارهای در انتظار و تأییدشده",
        icon:
          CheckCircle2,
      },
      {
        title:
          "حساب من",
        description:
          "درآمد، پرداخت‌شده و مانده حساب",
        icon:
          WalletCards,
      },
    ],
  },

  SUPERVISOR: {
    eyebrow:
      "پنل سرپرست",
    title:
      "کنترل کارگاه",
    description:
      "بررسی کار ثبت‌شده نیروها، تأیید وردست و ثبت ساعت کاری شخصی.",
    cards: [
      {
        title:
          "تأیید کار نیروها",
        description:
          "صف کارهای ثبت‌شده و منتظر بررسی",
        icon:
          UserRoundCheck,
        badge:
          "مرحله بعد",
      },
      {
        title:
          "ثبت ساعت من",
        description:
          "ثبت ساعت ورود، خروج و توضیحات روز",
        icon:
          Clock3,
      },
      {
        title:
          "حساب من",
        description:
          "حقوق ماهانه، پرداخت‌ها و مانده",
        icon:
          WalletCards,
      },
    ],
  },

  ASSISTANT: {
    eyebrow:
      "پنل وردست",
    title:
      "روز کاری من",
    description:
      "ثبت ساعت کار روزانه و مشاهده وضعیت تأیید، حقوق و پرداخت‌های شخصی.",
    cards: [
      {
        title:
          "ثبت ساعت کاری",
        description:
          "ثبت ساعت یا مدت کار امروز",
        icon:
          Clock3,
        badge:
          "مرحله بعد",
      },
      {
        title:
          "وضعیت ثبت‌ها",
        description:
          "پیگیری تأیید یا رد ساعت‌های ثبت‌شده",
        icon:
          CheckCircle2,
      },
      {
        title:
          "حساب من",
        description:
          "حقوق ثبت‌شده، پرداختی‌ها و مانده",
        icon:
          WalletCards,
      },
    ],
  },

  MANAGER: {
    eyebrow:
      "پنل مدیریت",
    title:
      "داشبورد تولیدی",
    description:
      "مرکز کنترل پرسنل، سری‌کارها، حساب کارکنان، صاحبکارها، گزارش‌ها و خروجی‌های مالی.",
    cards: [
      {
        title:
          "پرسنل",
        description:
          "مدیریت همکار، سرپرست و وردست",
        icon:
          UsersRound,
        badge:
          "مرحله بعد",
      },
      {
        title:
          "سری‌کارها",
        description:
          "ایجاد سری و انتخاب عملیات تولید",
        icon:
          PackageCheck,
      },
      {
        title:
          "تأییدها",
        description:
          "کنترل ساعت و فعالیت‌های منتظر بررسی",
        icon:
          ShieldCheck,
      },
      {
        title:
          "حساب کارکنان",
        description:
          "درآمد، پرداخت‌ها و مانده پرسنل",
        icon:
          Banknote,
      },
      {
        title:
          "حساب صاحبکار",
        description:
          "طلب، دریافتی و مانده سری‌ها",
        icon:
          WalletCards,
      },
      {
        title:
          "گزارش‌ها",
        description:
          "گزارش مالی و خروجی Excel",
        icon:
          TrendingUp,
      },
    ],
  },
};

export function RoleLanding({
  user,
}: {
  user: AuthUser;
}) {
  const content =
    roleContent[
      user.role
    ];

  return (
    <AppShell
      user={user}
      eyebrow={
        content.eyebrow
      }
      title={
        content.title
      }
      description={
        content.description
      }
    >
      <section className="mb-5 overflow-hidden rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.035)] sm:p-6 lg:hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[var(--brand)]">
              خوش آمدید
            </p>

            <h2 className="mt-2 text-xl font-black leading-8">
              {user.fullName}
            </h2>

            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              {content.description}
            </p>
          </div>

          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Factory className="size-5" />
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-black">
            دسترسی‌های شما
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            بخش‌های اصلی پنل بر اساس نقش شما
          </p>
        </div>

        <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 sm:block">
          حساب فعال
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {content.cards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <article
                key={
                  card.title
                }
                className="group relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.025)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(15,23,42,.055)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand)] transition group-hover:bg-[var(--brand-soft)]">
                    <Icon className="size-5" />
                  </div>

                  {card.badge && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                      {card.badge}
                    </span>
                  )}
                </div>

                <h3 className="mt-5 text-sm font-black">
                  {card.title}
                </h3>

                <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                  {card.description}
                </p>
              </article>
            );
          },
        )}
      </section>

      <section className="mt-5 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-white/55 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Factory className="size-4" />
          </div>

          <div>
            <p className="text-sm font-black">
              پایه پنل آماده است
            </p>

            <p className="mt-1 max-w-3xl text-xs leading-6 text-[var(--muted)]">
              ورود، تشخیص نقش، محافظت مسیرها و خروج از حساب فعال شده‌اند. در مرحله‌های بعد هر بخش به API واقعی خودش متصل می‌شود.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}