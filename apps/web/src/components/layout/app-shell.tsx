"use client";

import {
  ReactNode,
  useState,
} from "react";
import {
  Factory,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  logout,
} from "@/lib/api";
import {
  AuthUser,
  ROLE_LABEL,
} from "@/lib/auth";

export function AppShell({
  user,
  eyebrow,
  title,
  description,
  children,
}: {
  user: AuthUser;
  eyebrow: string;
  title: string;
  description: string;
  children:
    ReactNode;
}) {
  const router =
    useRouter();

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    mobileMenu,
    setMobileMenu,
  ] =
    useState(false);

  async function handleLogout() {
    if (
      loggingOut
    ) {
      return;
    }

    setLoggingOut(
      true,
    );

    try {
      await logout();
    } catch {
      // Even if API logout fails,
      // login page will re-check the session.
    } finally {
      router.replace(
        "/login",
      );

      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[264px] border-l border-white/10 bg-[#102827] text-white lg:flex lg:flex-col">
        <div className="flex h-[86px] items-center gap-3 border-b border-white/10 px-6">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <Factory className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black">
              تولیدی باقری
            </p>

            <p className="mt-1 text-[11px] text-white/45">
              مدیریت تولید
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[.065] p-3.5 ring-1 ring-white/10">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-200/10 text-emerald-100">
              <UserRound className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                {user.fullName}
              </p>

              <p className="mt-1 text-[11px] text-white/45">
                {ROLE_LABEL[
                  user.role
                ]}
              </p>
            </div>
          </div>
        </div>

        <nav className="px-4">
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-emerald-300/10 px-4 text-sm font-black text-emerald-50">
            <LayoutDashboard className="size-[18px]" />
            نمای اصلی
          </div>
        </nav>

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={
              () => {
                void handleLogout();
              }
            }
            disabled={
              loggingOut
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-bold text-white/70 transition hover:bg-white/[.08] hover:text-white disabled:opacity-50"
          >
            {loggingOut ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}

            خروج از حساب
          </button>
        </div>
      </aside>

      <div className="lg:mr-[264px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[var(--line)] bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:h-[86px] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={
                () =>
                  setMobileMenu(
                    true,
                  )
              }
              className="flex size-10 items-center justify-center rounded-xl border border-[var(--line)] bg-white lg:hidden"
              aria-label="باز کردن منو"
            >
              <Menu className="size-5" />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-black text-[var(--brand)] sm:text-xs">
                {eyebrow}
              </p>

              <h1 className="mt-0.5 truncate text-base font-black sm:text-lg">
                {title}
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex lg:hidden">
            <div className="text-left">
              <p className="text-xs font-black">
                {user.fullName}
              </p>

              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {ROLE_LABEL[
                  user.role
                ]}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          <div className="mb-6 hidden lg:block">
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              {description}
            </p>
          </div>

          {children}
        </main>

        <div className="fixed inset-x-3 bottom-3 z-30 rounded-[22px] border border-[var(--line)] bg-white/95 p-2 shadow-[0_15px_45px_rgba(15,23,42,.12)] backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-xs font-black text-white">
              <LayoutDashboard className="size-4" />
              پنل من
            </div>

            <button
              type="button"
              onClick={
                () => {
                  void handleLogout();
                }
              }
              disabled={
                loggingOut
              }
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--surface-soft)] text-xs font-black text-[var(--muted)]"
            >
              {loggingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}

              خروج
            </button>
          </div>
        </div>
      </div>

      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="بستن منو"
            onClick={
              () =>
                setMobileMenu(
                  false,
                )
            }
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 right-0 w-[86%] max-w-[320px] bg-[#102827] p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                  <Factory className="size-5" />
                </div>

                <div>
                  <p className="text-sm font-black">
                    تولیدی باقری
                  </p>

                  <p className="mt-1 text-[10px] text-white/40">
                    سامانه مدیریت تولید
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setMobileMenu(
                      false,
                    )
                }
                className="flex size-9 items-center justify-center rounded-xl bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-8 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <p className="font-black">
                {user.fullName}
              </p>

              <p className="mt-1 text-xs text-white/45">
                {ROLE_LABEL[
                  user.role
                ]}
              </p>
            </div>

            <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-emerald-300/10 px-4 text-sm font-black text-emerald-50">
              <LayoutDashboard className="size-[18px]" />
              نمای اصلی
            </div>
          </div>
        </div>
      )}
    </div>
  );
}