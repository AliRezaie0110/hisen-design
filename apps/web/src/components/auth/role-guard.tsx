"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  ApiError,
  getCurrentUser,
} from "@/lib/api";
import {
  AuthUser,
  roleHomePath,
  UserRole,
} from "@/lib/auth";
import {
  FullPageLoader,
} from "@/components/auth/full-page-loader";

export function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  children:
    (
      user: AuthUser,
    ) => ReactNode;
}) {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const current =
            await getCurrentUser();

          if (
            current.role !==
            role
          ) {
            router.replace(
              roleHomePath(
                current.role,
              ),
            );

            return;
          }

          setUser(
            current,
          );
        } catch (caught) {
          if (
            caught instanceof
              ApiError &&
            caught.status ===
              401
          ) {
            router.replace(
              "/login",
            );

            return;
          }

          setError(
            caught instanceof Error
              ? caught.message
              : "ارتباط با سرور برقرار نشد.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        role,
        router,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  if (
    loading
  ) {
    return (
      <FullPageLoader />
    );
  }

  if (
    error
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-5">
        <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="size-6" />
          </div>

          <h1 className="mt-5 text-lg font-black text-[var(--text)]">
            ارتباط با سرور برقرار نشد
          </h1>

          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {error}
          </p>

          <button
            type="button"
            onClick={
              () => {
                void load();
              }
            }
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--text)] px-5 text-sm font-black text-white"
          >
            <RefreshCw className="size-4" />
            تلاش دوباره
          </button>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <FullPageLoader />
    );
  }

  return (
    <>
      {children(
        user,
      )}
    </>
  );
}