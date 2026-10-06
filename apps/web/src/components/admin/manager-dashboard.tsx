"use client";

import type {
  LucideIcon,
} from "lucide-react";

import {
  Boxes,
  BriefcaseBusiness,
  FileSpreadsheet,
  LayoutDashboard,
  Scissors,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  AppShell,
} from "@/components/layout/app-shell";

import {
  BatchesSection,
} from "@/components/admin/batches-section";

import {
  AccountsHub,
} from "@/components/admin/accounts-hub";

import {
  ApprovalsSection,
} from "@/components/admin/approvals-section";

import {
  OperationsSection,
} from "@/components/admin/operations-section";

import {
  OwnersSection,
} from "@/components/admin/owners-section";

import {
  ReportsSection,
} from "@/components/admin/reports-section";

import {
  PersonnelSection,
} from "@/components/admin/personnel-section";

import type {
  AuthUser,
} from "@/lib/auth";

type Section =
  | "overview"
  | "personnel"
  | "owners"
  | "operations"
  | "batches"
  | "approvals"
  | "accounts"
  | "reports";

type NavItem = {
  id: Section;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    id:
      "overview",
    label:
      "داشبورد",
    icon:
      LayoutDashboard,
  },
  {
    id:
      "personnel",
    label:
      "پرسنل",
    icon:
      UsersRound,
  },
  {
    id:
      "owners",
    label:
      "صاحبکارها",
    icon:
      BriefcaseBusiness,
  },
  {
    id:
      "operations",
    label:
      "عملیات",
    icon:
      Scissors,
  },
  {
    id:
      "batches",
    label:
      "سری‌کارها",
    icon:
      Boxes,
  },
  {
    id:
      "approvals",
    label:
      "تأییدها",
    icon:
      ShieldCheck,
  },
  {
    id:
      "accounts",
    label:
      "حساب‌ها",
    icon:
      WalletCards,
  },
  {
    id:
      "reports",
    label:
      "گزارش‌ها",
    icon:
      FileSpreadsheet,
  },
];

export function ManagerDashboard({
  user,
}: {
  user: AuthUser;
}) {
  const [
    section,
    setSection,
  ] =
    useState<Section>(
      "overview",
    );

  return (
    <AppShell
      user={user}
      eyebrow="پنل مدیریت"
      title="مدیریت تولیدی"
      description="پرسنل، تولید، حساب‌ها و گزارش‌ها از همین پنل مدیریت می‌شوند."
    >
      <div className="mb-5 overflow-x-auto pb-1">
        <nav className="flex min-w-max gap-2 rounded-[22px] border border-[var(--line)] bg-white p-1.5 shadow-[0_6px_24px_rgba(15,23,42,.025)]">
          {navItems.map(
            (
              item,
            ) => {
              const Icon =
                item.icon;

              const active =
                section ===
                item.id;

              return (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={
                    () =>
                      setSection(
                        item.id,
                      )
                  }
                  className={`flex h-11 items-center gap-2 rounded-2xl px-4 text-xs font-black transition ${
                    active
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            },
          )}
        </nav>
      </div>

      {section ===
        "overview" && (
        <section>
          <div className="overflow-hidden rounded-[28px] bg-[#102827] p-6 text-white sm:p-8">
            <p className="text-xs font-black text-emerald-200/70">
              مدیریت تولیدی باقری
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              سلام {user.fullName}
            </h2>

            <p className="mt-3 max-w-2xl text-xs leading-7 text-white/55">
              پرسنل، صاحبکارها و عملیات تولید اکنون مستقیماً از همین پنل مدیریت می‌شوند.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewButton
              icon={
                UsersRound
              }
              title="پرسنل"
              description="ثبت و مدیریت نیروها"
              onClick={
                () =>
                  setSection(
                    "personnel",
                  )
              }
            />

            <OverviewButton
              icon={
                BriefcaseBusiness
              }
              title="صاحبکارها"
              description="ثبت طرف‌های تولید"
              onClick={
                () =>
                  setSection(
                    "owners",
                  )
              }
            />

            <OverviewButton
              icon={
                Scissors
              }
              title="عملیات و نرخ"
              description="کاتالوگ و تاریخچه نرخ"
              onClick={
                () =>
                  setSection(
                    "operations",
                  )
              }
            />

            <OverviewButton
              icon={
                Boxes
              }
              title="سری‌کارها"
              description="مرحله بعدی پنل مدیر"
              onClick={
                () =>
                  setSection(
                    "batches",
                  )
              }
            />
          </div>
        </section>
      )}

      {section ===
        "personnel" && (
        <PersonnelSection />
      )}

      {section ===
        "owners" && (
        <OwnersSection />
      )}

      {section ===
        "operations" && (
        <OperationsSection />
      )}

      {section ===
        "batches" && (
        <BatchesSection />
      )}

      {section ===
        "approvals" && (
        <ApprovalsSection />
      )}

      {section ===
        "accounts" && (
        <AccountsHub />
      )}

      {section ===
        "reports" && (
        <ReportsSection />
      )}
    </AppShell>
  );
}

function OverviewButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon:
    LucideIcon;
  title: string;
  description: string;
  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-[24px] border border-[var(--line)] bg-white p-5 text-right transition hover:-translate-y-0.5 hover:border-slate-300"
    >
      <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon className="size-4" />
      </div>

      <p className="mt-4 text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
        {description}
      </p>
    </button>
  );
}

function ComingSoon({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-white p-10 text-center">
      <p className="text-base font-black">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[var(--muted)]">
        {text}
      </p>
    </section>
  );
}