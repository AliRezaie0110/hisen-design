"use client";

import {
  BriefcaseBusiness,
  UsersRound,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  EmployeeAccountsSection,
} from "@/components/admin/employee-accounts-section";

import {
  OwnerAccountsSection,
} from "@/components/admin/owner-accounts-section";

export function AccountsHub() {
  const [
    tab,
    setTab,
  ] =
    useState<
      "employees" |
      "owners"
    >(
      "employees",
    );

  return (
    <section>
      <div className="mb-5 flex gap-2 rounded-[20px] border border-[var(--line)] bg-white p-1.5">
        <button
          type="button"
          onClick={
            () =>
              setTab(
                "employees",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black ${
            tab ===
            "employees"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <UsersRound className="size-4" />
          حساب کارکنان
        </button>

        <button
          type="button"
          onClick={
            () =>
              setTab(
                "owners",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black ${
            tab ===
            "owners"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <BriefcaseBusiness className="size-4" />
          حساب صاحبکارها
        </button>
      </div>

      {tab ===
      "employees" ? (
        <EmployeeAccountsSection />
      ) : (
        <OwnerAccountsSection />
      )}
    </section>
  );
}