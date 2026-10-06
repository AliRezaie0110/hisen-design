"use client";


import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Eye,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  AppShell,
} from "@/components/layout/app-shell";
import {
  ProfileSection,
} from "@/components/profile/profile-section";

import {
  ApiError,
} from "@/lib/api";

import type {
  AuthUser,
} from "@/lib/auth";

import {
  openEmployeeReceipt,
  type EmployeeAccountResponse,
} from "@/lib/worker-api";

import {
  createMyTimeEntry,
  getMyStaffAccount,
  getMyTimeEntries,
  getPendingAssistantTimeEntries,
  getPendingWorkerEntries,
  MyTimeEntriesResponse,
  PendingTimeItem,
  reviewTimeEntry,
  reviewWorkerEntry,
  SupervisorPendingWorkItem,
  TimeEntryStatus,
} from "@/lib/staff-api";

type SupervisorTab =
  | "work-review"
  | "time-review"
  | "my-time"
  | "account"
  | "profile";

type AssistantTab =
  | "my-time"
  | "account"
  | "profile";

type Tab =
  | SupervisorTab
  | AssistantTab;

type TimeEntryMode =
  | "delay"
  | "worked";

const statusMeta: Record<
  TimeEntryStatus,
  {
    label: string;
    className: string;
    icon:
      typeof Clock3;
  }
> = {
  PENDING: {
    label:
      "در انتظار",
    className:
      "border-amber-100 bg-amber-50 text-amber-700",
    icon:
      Clock3,
  },

  APPROVED: {
    label:
      "تأیید شده",
    className:
      "border-emerald-100 bg-emerald-50 text-emerald-700",
    icon:
      CheckCircle2,
  },

  REJECTED: {
    label:
      "رد شده",
    className:
      "border-red-100 bg-red-50 text-red-700",
    icon:
      XCircle,
  },
};

function formatNumber(
  value:
    | number
    | string,
): string {
  try {
    return new Intl.NumberFormat(
      "fa-IR",
    ).format(
      BigInt(
        value.toString(),
      ),
    );
  } catch {
    return String(
      value,
    );
  }
}

function money(
  value:
    | number
    | string,
): string {
  return `${formatNumber(
    value,
  )} تومان`;
}

function localToday(): string {
  const now =
    new Date();

  const adjusted =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60_000,
    );

  return adjusted
    .toISOString()
    .slice(
      0,
      10,
    );
}

function formatDate(
  date: string,
): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian",
      {
        year:
          "numeric",
        month:
          "long",
        day:
          "numeric",
      },
    ).format(
      new Date(
        `${date}T12:00:00`,
      ),
    );
  } catch {
    return date;
  }
}

function formatDateTime(
  value: string,
): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian",
      {
        year:
          "numeric",
        month:
          "short",
        day:
          "numeric",
        hour:
          "2-digit",
        minute:
          "2-digit",
      },
    ).format(
      new Date(
        value,
      ),
    );
  } catch {
    return value;
  }
}

function formatMinutes(
  minutes: number,
): string {
  const hours =
    Math.floor(
      minutes /
        60,
    );

  const remain =
    minutes %
    60;

  if (
    hours ===
    0
  ) {
    return `${formatNumber(
      remain,
    )} دقیقه`;
  }

  if (
    remain ===
    0
  ) {
    return `${formatNumber(
      hours,
    )} ساعت`;
  }

  return `${formatNumber(
    hours,
  )} ساعت و ${formatNumber(
    remain,
  )} دقیقه`;
}

function getErrorMessage(
  caught: unknown,
): string {
  if (
    caught instanceof
    ApiError
  ) {
    if (
      caught.code ===
      "TIME_ENTRY_ALREADY_EXISTS"
    ) {
      return "برای این روز قبلاً ساعت کاری ثبت شده است.";
    }

    if (
      caught.code ===
        "TIME_ENTRY_ALREADY_REVIEWED" ||
      caught.code ===
        "WORK_ENTRY_ALREADY_REVIEWED"
    ) {
      return "این مورد قبلاً توسط شخص دیگری بررسی شده است؛ اطلاعات تازه شد.";
    }

    return caught.message;
  }

  if (
    caught instanceof
    Error
  ) {
    return caught.message;
  }

  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}

export function FixedSalaryDashboard({
  user,
}: {
  user: AuthUser;
}) {
  const router =
    useRouter();

  const isSupervisor =
    user.role ===
    "SUPERVISOR";

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      isSupervisor
        ? "work-review"
        : "my-time",
    );

  const [
    timeData,
    setTimeData,
  ] =
    useState<MyTimeEntriesResponse | null>(
      null,
    );

  const [
    account,
    setAccount,
  ] =
    useState<EmployeeAccountResponse | null>(
      null,
    );

  const [
    pendingWork,
    setPendingWork,
  ] =
    useState<
      SupervisorPendingWorkItem[]
    >([]);

  const [
    pendingTimes,
    setPendingTimes,
  ] =
    useState<
      PendingTimeItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const [
    workDate,
    setWorkDate,
  ] =
    useState(
      localToday(),
    );

  const [
    timeEntryMode,
    setTimeEntryMode,
  ] =
    useState<TimeEntryMode>(
      "delay",
    );

  const [
    scheduledHours,
    setScheduledHours,
  ] =
    useState(
      "8",
    );

  const [
    scheduledMinutes,
    setScheduledMinutes,
  ] =
    useState(
      "0",
    );

  const [
    delayHours,
    setDelayHours,
  ] =
    useState(
      "0",
    );

  const [
    delayMinutes,
    setDelayMinutes,
  ] =
    useState(
      "0",
    );

  const [
    hours,
    setHours,
  ] =
    useState(
      "8",
    );

  const [
    minutes,
    setMinutes,
  ] =
    useState(
      "0",
    );

  const [
    timeNote,
    setTimeNote,
  ] =
    useState("");

  const [
    submittingTime,
    setSubmittingTime,
  ] =
    useState(
      false,
    );

  const [
    reviewNotes,
    setReviewNotes,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    reviewing,
    setReviewing,
  ] =
    useState<
      string | null
    >(null);

  const load =
    useCallback(
      async (
        silent =
          false,
      ) => {
        if (
          silent
        ) {
          setRefreshing(
            true,
          );
        } else {
          setLoading(
            true,
          );
        }

        setError(
          null,
        );

        try {
          const base =
            await Promise.all([
              getMyTimeEntries(),
              getMyStaffAccount(),
            ]);

          setTimeData(
            base[0],
          );

          setAccount(
            base[1],
          );

          if (
            isSupervisor
          ) {
            const reviews =
              await Promise.all([
                getPendingWorkerEntries(),
                getPendingAssistantTimeEntries(),
              ]);

            setPendingWork(
              reviews[0]
                .items ??
                [],
            );

            setPendingTimes(
              reviews[1]
                .items ??
                [],
            );
          }
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
            getErrorMessage(
              caught,
            ),
          );
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [
        isSupervisor,
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

  const workedDirectMinutes =
    useMemo(
      () =>
        Number(
          hours ||
            0,
        ) *
          60 +
        Number(
          minutes ||
            0,
        ),
      [
        hours,
        minutes,
      ],
    );

  const scheduledTotalMinutes =
    useMemo(
      () =>
        Number(
          scheduledHours ||
            0,
        ) *
          60 +
        Number(
          scheduledMinutes ||
            0,
        ),
      [
        scheduledHours,
        scheduledMinutes,
      ],
    );

  const delayTotalMinutes =
    useMemo(
      () =>
        Number(
          delayHours ||
            0,
        ) *
          60 +
        Number(
          delayMinutes ||
            0,
        ),
      [
        delayHours,
        delayMinutes,
      ],
    );

  const delayInvalid =
    timeEntryMode ===
      "delay" &&
    (
      scheduledTotalMinutes <=
        0 ||
      scheduledTotalMinutes >
        1440 ||
      delayTotalMinutes <
        0 ||
      delayTotalMinutes >
        scheduledTotalMinutes
    );

  const totalMinutes =
    timeEntryMode ===
    "delay"
      ? Math.max(
          0,
          scheduledTotalMinutes -
            delayTotalMinutes,
        )
      : workedDirectMinutes;

  const canSubmitTime =
    Boolean(
      workDate &&
        !delayInvalid &&
        totalMinutes >
          0 &&
        totalMinutes <=
          1440 &&
        !submittingTime,
    );

  const approvedTimeCount =
    useMemo(
      () =>
        timeData?.entries.filter(
          (entry) =>
            entry.status ===
            "APPROVED",
        ).length ??
        0,
      [
        timeData,
      ],
    );

  const pendingMyTimeCount =
    useMemo(
      () =>
        timeData?.entries.filter(
          (entry) =>
            entry.status ===
            "PENDING",
        ).length ??
        0,
      [
        timeData,
      ],
    );

  async function submitTime(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !canSubmitTime
    ) {
      return;
    }

    setSubmittingTime(
      true,
    );

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      const attendanceNote =
        timeEntryMode ===
        "delay"
          ? `موظفی: ${formatMinutes(
              scheduledTotalMinutes,
            )} | تأخیر: ${formatMinutes(
              delayTotalMinutes,
            )}${
              timeNote.trim()
                ? ` | ${timeNote.trim()}`
                : ""
            }`
          : timeNote.trim();

      await createMyTimeEntry({
        workDate,

        minutesWorked:
          totalMinutes,

        ...(attendanceNote
          ? {
              note:
                attendanceNote,
            }
          : {}),
      });

      setTimeNote(
        "",
      );

      if (
        timeEntryMode ===
        "delay"
      ) {
        setDelayHours(
          "0",
        );

        setDelayMinutes(
          "0",
        );
      }

      setSuccess(
        "ساعت کاری با موفقیت ثبت شد و برای تأیید ارسال شد.",
      );

      await load(
        true,
      );
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
        ),
      );
    } finally {
      setSubmittingTime(
        false,
      );
    }
  }

  async function reviewWork(
    item:
      SupervisorPendingWorkItem,
    action:
      | "approve"
      | "reject",
  ) {
    const note =
      reviewNotes[
        item.id
      ]?.trim() ??
      "";

    if (
      action ===
        "reject" &&
      !note
    ) {
      setError(
        "برای رد کردن کار، دلیل یا توضیح کوتاهی وارد کنید.",
      );

      return;
    }

    setReviewing(
      item.id,
    );

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      await reviewWorkerEntry(
        item.id,
        action,
        note,
      );

      setSuccess(
        action ===
        "approve"
          ? `کار ${item.worker.fullName} تأیید شد.`
          : `ثبت کار ${item.worker.fullName} رد شد.`,
      );

      setReviewNotes(
        (
          current,
        ) => {
          const next = {
            ...current,
          };

          delete next[
            item.id
          ];

          return next;
        },
      );

      await load(
        true,
      );
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
        ),
      );

      await load(
        true,
      );
    } finally {
      setReviewing(
        null,
      );
    }
  }

  async function reviewAssistantTime(
    item:
      PendingTimeItem,
    action:
      | "approve"
      | "reject",
  ) {
    const note =
      reviewNotes[
        item.id
      ]?.trim() ??
      "";

    if (
      action ===
        "reject" &&
      !note
    ) {
      setError(
        "برای رد ساعت کاری، دلیل یا توضیح کوتاهی وارد کنید.",
      );

      return;
    }

    setReviewing(
      item.id,
    );

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      await reviewTimeEntry(
        item.id,
        action,
        note,
      );

      setSuccess(
        action ===
        "approve"
          ? `ساعت کاری ${item.employee.fullName} تأیید شد.`
          : `ساعت کاری ${item.employee.fullName} رد شد.`,
      );

      setReviewNotes(
        (
          current,
        ) => {
          const next = {
            ...current,
          };

          delete next[
            item.id
          ];

          return next;
        },
      );

      await load(
        true,
      );
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
        ),
      );

      await load(
        true,
      );
    } finally {
      setReviewing(
        null,
      );
    }
  }

  async function openReceipt(
    paymentId: string,
  ) {
    setError(
      null,
    );

    try {
      await openEmployeeReceipt(
        paymentId,
      );
    } catch (
      caught
    ) {
      setError(
        getErrorMessage(
          caught,
        ),
      );
    }
  }
  const tabs =
    isSupervisor
      ? [
          {
            id:
              "work-review" as const,
            label:
              "کار همکاران",
            icon:
              ClipboardCheck,
            badge:
              pendingWork.length,
          },
          {
            id:
              "time-review" as const,
            label:
              "ساعت وردست",
            icon:
              UserRoundCheck,
            badge:
              pendingTimes.length,
          },
          {
            id:
              "my-time" as const,
            label:
              "ساعت من",
            icon:
              Clock3,
            badge:
              pendingMyTimeCount,
          },
          {
            id:
              "account" as const,
            label:
              "حساب من",
            icon:
              WalletCards,
          },
          {
            id:
              "profile" as const,
            label:
              "پروفایل",
            icon:
              UserRound,
          },
        ]
      : [
          {
            id:
              "my-time" as const,
            label:
              "ساعت کاری",
            icon:
              Clock3,
            badge:
              pendingMyTimeCount,
          },
          {
            id:
              "account" as const,
            label:
              "حساب من",
            icon:
              WalletCards,
          },
          {
            id:
              "profile" as const,
            label:
              "پروفایل",
            icon:
              UserRound,
          },
        ];

  return (
    <AppShell
      user={user}
      eyebrow={
        isSupervisor
          ? "پنل سرپرست"
          : "پنل وردست"
      }
      title={
        isSupervisor
          ? "کنترل کارگاه"
          : "روز کاری من"
      }
      description={
        isSupervisor
          ? "بررسی کار همکاران، تأیید ساعت وردست و ثبت ساعت کاری شخصی."
          : "ثبت ساعت کاری، مشاهده تأییدها و پیگیری حساب شخصی."
      }
    >
      <section className="mb-4 rounded-[26px] bg-[#102827] p-5 text-white shadow-[0_18px_45px_rgba(16,40,39,.14)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-200/75">
              {isSupervisor
                ? "وضعیت امروز کارگاه"
                : "وضعیت حساب و ساعت کاری"}
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {user.fullName}
            </h2>

            <p className="mt-2 text-xs leading-6 text-white/50">
              {isSupervisor
                ? `${formatNumber(
                    pendingWork.length,
                  )} کار و ${formatNumber(
                    pendingTimes.length,
                  )} ساعت وردست منتظر بررسی است.`
                : `${formatNumber(
                    pendingMyTimeCount,
                  )} ثبت ساعت شما در انتظار بررسی است.`}
            </p>
          </div>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={
              () => {
                void load(
                  true,
                );
              }
            }
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10"
            aria-label="به‌روزرسانی"
          >
            <RefreshCw
              className={`size-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p className="text-[10px] text-white/45">
              حقوق ثبت‌شده
            </p>

            <p className="mt-2 truncate text-sm font-black sm:text-lg">
              {account
                ? formatNumber(
                    account
                      .totals
                      .earned,
                  )
                : "—"}
            </p>

            <p className="mt-1 text-[9px] text-white/35">
              تومان
            </p>
          </div>

          <div className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p className="text-[10px] text-white/45">
              پرداخت‌شده
            </p>

            <p className="mt-2 truncate text-sm font-black sm:text-lg">
              {account
                ? formatNumber(
                    account
                      .totals
                      .paid,
                  )
                : "—"}
            </p>

            <p className="mt-1 text-[9px] text-white/35">
              تومان
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-300/10 p-3 ring-1 ring-emerald-200/15 sm:p-4">
            <p className="text-[10px] text-emerald-100/55">
              مانده حساب
            </p>

            <p className="mt-2 truncate text-sm font-black text-emerald-100 sm:text-lg">
              {account
                ? formatNumber(
                    account
                      .totals
                      .balance,
                  )
                : "—"}
            </p>

            <p className="mt-1 text-[9px] text-emerald-100/40">
              تومان
            </p>
          </div>
        </div>
      </section>

      <div
        className={`mb-5 grid gap-1.5 rounded-[22px] border border-[var(--line)] bg-white p-1.5 ${
          isSupervisor
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2"
        }`}
      >
        {tabs.map(
          (
            item,
          ) => {
            const Icon =
              item.icon;

            const active =
              tab ===
              item.id;

            return (
              <button
                type="button"
                key={
                  item.id
                }
                onClick={
                  () => {
                    setTab(
                      item.id,
                    );

                    setError(
                      null,
                    );

                    setSuccess(
                      null,
                    );
                  }
                }
                className={`relative flex h-12 items-center justify-center gap-1.5 rounded-2xl px-2 text-[11px] font-black transition sm:text-xs ${
                  active
                    ? "bg-[var(--brand)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                <Icon className="size-4" />

                {item.label}

                {Boolean(
                  item.badge,
                ) && (
                  <span
                    className={`absolute left-1.5 top-1.5 min-w-5 rounded-full px-1 text-[9px] ${
                      active
                        ? "bg-white text-[var(--brand)]"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {formatNumber(
                      item.badge ??
                        0,
                    )}
                  </span>
                )}
              </button>
            );
          },
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-red-100 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />

          <div>
            <p className="text-sm font-black">
              انجام نشد
            </p>

            <p className="mt-1 text-xs leading-6">
              {error}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />

          <p className="text-xs font-bold leading-6">
            {success}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <div className="text-center">
            <LoaderCircle className="mx-auto size-7 animate-spin text-[var(--brand)]" />

            <p className="mt-3 text-xs font-bold text-[var(--muted)]">
              در حال دریافت اطلاعات...
            </p>
          </div>
        </div>
      ) : (
        <>
          {isSupervisor &&
            tab ===
              "work-review" && (
              <section>
                <div className="mb-4">
                  <h3 className="text-base font-black">
                    کارهای منتظر تأیید
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                    فقط تعداد و اطلاعات کار را بررسی می‌کنید؛ مبلغ درآمد همکار در این پنل نمایش داده نمی‌شود.
                  </p>
                </div>

                {pendingWork.length ===
                0 ? (
                  <EmptyState
                    icon={
                      ClipboardCheck
                    }
                    title="کار منتظر تأییدی وجود ندارد"
                    description="هر ثبت جدید همکاران در این بخش ظاهر می‌شود."
                  />
                ) : (
                  <div className="space-y-3">
                    {pendingWork.map(
                      (
                        item,
                      ) => (
                        <article
                          key={
                            item.id
                          }
                          className="rounded-[24px] border border-[var(--line)] bg-white p-4 shadow-[0_6px_25px_rgba(15,23,42,.025)] sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                                  <UserRoundCheck className="size-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black">
                                    {item.worker.fullName}
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                                    {formatDateTime(
                                      item.createdAt,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-[#102827] px-4 py-2 text-center text-white">
                              <p className="text-lg font-black">
                                {formatNumber(
                                  item.quantity,
                                )}
                              </p>

                              <p className="text-[9px] text-white/45">
                                عدد
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-soft)] p-3">
                            <div>
                              <p className="text-[9px] text-[var(--muted)]">
                                سری‌کار
                              </p>

                              <p className="mt-1 text-xs font-black">
                                {item.batchCode ??
                                  "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] text-[var(--muted)]">
                                مدل
                              </p>

                              <p className="mt-1 text-xs font-black">
                                {item.modelName ??
                                  "—"}
                              </p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-[9px] text-[var(--muted)]">
                                عملیات
                              </p>

                              <p className="mt-1 text-xs font-black text-[var(--brand)]">
                                {item.operationName ??
                                  "—"}
                              </p>
                            </div>
                          </div>

                          {item.workerNote && (
                            <div className="mt-3 rounded-2xl border border-[var(--line)] p-3">
                              <p className="text-[9px] font-black text-[var(--muted)]">
                                توضیح همکار
                              </p>

                              <p className="mt-1 text-xs leading-6">
                                {item.workerNote}
                              </p>
                            </div>
                          )}

                          <ReviewBox
                            value={
                              reviewNotes[
                                item.id
                              ] ??
                              ""
                            }
                            busy={
                              reviewing ===
                              item.id
                            }
                            onChange={(
                              value,
                            ) =>
                              setReviewNotes(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [item.id]:
                                    value,
                                }),
                              )
                            }
                            onApprove={
                              () => {
                                void reviewWork(
                                  item,
                                  "approve",
                                );
                              }
                            }
                            onReject={
                              () => {
                                void reviewWork(
                                  item,
                                  "reject",
                                );
                              }
                            }
                          />
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>
            )}

          {isSupervisor &&
            tab ===
              "time-review" && (
              <section>
                <div className="mb-4">
                  <h3 className="text-base font-black">
                    ساعت وردست
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                    ساعت‌های ثبت‌شده وردست را بررسی کنید. اطلاعات حقوق او در اختیار سرپرست قرار نمی‌گیرد.
                  </p>
                </div>

                {pendingTimes.length ===
                0 ? (
                  <EmptyState
                    icon={
                      Clock3
                    }
                    title="ساعت منتظر تأییدی وجود ندارد"
                    description="ثبت‌های جدید وردست در اینجا نمایش داده می‌شوند."
                  />
                ) : (
                  <div className="space-y-3">
                    {pendingTimes.map(
                      (
                        item,
                      ) => (
                        <article
                          key={
                            item.id
                          }
                          className="rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black">
                                {item.employee.fullName}
                              </p>

                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {formatDate(
                                  item.workDate,
                                )}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[var(--brand-soft)] px-4 py-2 text-center text-[var(--brand)]">
                              <p className="text-sm font-black">
                                {formatMinutes(
                                  item.minutesWorked,
                                )}
                              </p>
                            </div>
                          </div>

                          {item.note && (
                            <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] p-3">
                              <p className="text-[9px] font-black text-[var(--muted)]">
                                توضیح وردست
                              </p>

                              <p className="mt-1 text-xs leading-6">
                                {item.note}
                              </p>
                            </div>
                          )}

                          <ReviewBox
                            value={
                              reviewNotes[
                                item.id
                              ] ??
                              ""
                            }
                            busy={
                              reviewing ===
                              item.id
                            }
                            onChange={(
                              value,
                            ) =>
                              setReviewNotes(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [item.id]:
                                    value,
                                }),
                              )
                            }
                            onApprove={
                              () => {
                                void reviewAssistantTime(
                                  item,
                                  "approve",
                                );
                              }
                            }
                            onReject={
                              () => {
                                void reviewAssistantTime(
                                  item,
                                  "reject",
                                );
                              }
                            }
                          />
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>
            )}

          {tab ===
            "my-time" && (
            <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <form
                onSubmit={
                  submitTime
                }
                className="h-fit rounded-[26px] border border-[var(--line)] bg-white p-5 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-black">
                      ثبت ساعت کاری
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      مدت کار روزانه خودتان را ثبت کنید.
                    </p>
                  </div>

                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Clock3 className="size-5" />
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="work-date"
                    className="mb-2 block text-xs font-black"
                  >
                    تاریخ کار
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                    <JalaliDateInput
                      id="work-date"
                      dir="ltr"
                      max={
                        localToday()
                      }
                      value={
                        workDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setWorkDate(
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-13 w-full rounded-2xl border border-[var(--line)] bg-white px-4 pr-11 text-sm font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-[var(--surface-soft)] p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={
                        () =>
                          setTimeEntryMode(
                            "delay",
                          )
                      }
                      className={`min-h-12 rounded-2xl px-3 text-xs font-black transition ${
                        timeEntryMode ===
                        "delay"
                          ? "bg-[var(--brand)] text-white shadow-sm"
                          : "bg-white text-[var(--muted)]"
                      }`}
                    >
                      ثبت تأخیر
                    </button>

                    <button
                      type="button"
                      onClick={
                        () =>
                          setTimeEntryMode(
                            "worked",
                          )
                      }
                      className={`min-h-12 rounded-2xl px-3 text-xs font-black transition ${
                        timeEntryMode ===
                        "worked"
                          ? "bg-[var(--brand)] text-white shadow-sm"
                          : "bg-white text-[var(--muted)]"
                      }`}
                    >
                      ثبت کارکرد واقعی
                    </button>
                  </div>
                </div>

                {timeEntryMode ===
                "delay" ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3">
                        <p className="text-xs font-black">
                          ساعت موظفی آن روز
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
                          پیش‌فرض ۸ ساعت است؛ برای روزهای متفاوت می‌توانید تغییرش دهید.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="scheduled-hours"
                            className="mb-2 block text-[10px] font-black text-[var(--muted)]"
                          >
                            ساعت
                          </label>

                          <input
                            id="scheduled-hours"
                            type="number"
                            min={0}
                            max={24}
                            inputMode="numeric"
                            dir="ltr"
                            value={
                              scheduledHours
                            }
                            onChange={(
                              event,
                            ) =>
                              setScheduledHours(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-13 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-center text-lg font-black outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="scheduled-minutes"
                            className="mb-2 block text-[10px] font-black text-[var(--muted)]"
                          >
                            دقیقه
                          </label>

                          <input
                            id="scheduled-minutes"
                            type="number"
                            min={0}
                            max={59}
                            inputMode="numeric"
                            dir="ltr"
                            value={
                              scheduledMinutes
                            }
                            onChange={(
                              event,
                            ) =>
                              setScheduledMinutes(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-13 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-center text-lg font-black outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-amber-100 bg-amber-50/70 p-4">
                      <div className="mb-3">
                        <p className="text-xs font-black text-amber-900">
                          میزان تأخیر
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-amber-800/60">
                          فقط مقدار تأخیر را وارد کنید؛ کارکرد نهایی خودکار حساب می‌شود.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="delay-hours"
                            className="mb-2 block text-[10px] font-black text-amber-900/60"
                          >
                            ساعت
                          </label>

                          <input
                            id="delay-hours"
                            type="number"
                            min={0}
                            max={24}
                            inputMode="numeric"
                            dir="ltr"
                            value={
                              delayHours
                            }
                            onChange={(
                              event,
                            ) =>
                              setDelayHours(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-13 w-full rounded-2xl border border-amber-100 bg-white px-4 text-center text-lg font-black outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="delay-minutes"
                            className="mb-2 block text-[10px] font-black text-amber-900/60"
                          >
                            دقیقه
                          </label>

                          <input
                            id="delay-minutes"
                            type="number"
                            min={0}
                            max={59}
                            inputMode="numeric"
                            dir="ltr"
                            value={
                              delayMinutes
                            }
                            onChange={(
                              event,
                            ) =>
                              setDelayMinutes(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-13 w-full rounded-2xl border border-amber-100 bg-white px-4 text-center text-lg font-black outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="hours"
                          className="mb-2 block text-xs font-black"
                        >
                          ساعت کارکرد
                        </label>

                        <input
                          id="hours"
                          type="number"
                          min={0}
                          max={24}
                          inputMode="numeric"
                          dir="ltr"
                          value={
                            hours
                          }
                          onChange={(
                            event,
                          ) =>
                            setHours(
                              event
                                .target
                                .value,
                            )
                          }
                          className="h-14 w-full rounded-2xl border border-[var(--line)] px-4 text-center text-lg font-black outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="minutes"
                          className="mb-2 block text-xs font-black"
                        >
                          دقیقه
                        </label>

                        <input
                          id="minutes"
                          type="number"
                          min={0}
                          max={59}
                          inputMode="numeric"
                          dir="ltr"
                          value={
                            minutes
                          }
                          onChange={(
                            event,
                          ) =>
                            setMinutes(
                              event
                                .target
                                .value,
                            )
                          }
                          className="h-14 w-full rounded-2xl border border-[var(--line)] px-4 text-center text-lg font-black outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        {
                          label:
                            "۴ ساعت",
                          value:
                            240,
                        },
                        {
                          label:
                            "۸ ساعت",
                          value:
                            480,
                        },
                        {
                          label:
                            "۱۰ ساعت",
                          value:
                            600,
                        },
                      ].map(
                        (
                          quick,
                        ) => (
                          <button
                            type="button"
                            key={
                              quick.value
                            }
                            onClick={
                              () => {
                                setHours(
                                  String(
                                    Math.floor(
                                      quick.value /
                                        60,
                                    ),
                                  ),
                                );

                                setMinutes(
                                  String(
                                    quick.value %
                                      60,
                                  ),
                                );
                              }
                            }
                            className="h-10 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-black text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                          >
                            {quick.label}
                          </button>
                        ),
                      )}
                    </div>
                  </>
                )}

                <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[10px] text-emerald-700/60">
                    {timeEntryMode ===
                    "delay"
                      ? "کارکرد محاسبه‌شده"
                      : "مجموع ساعت ثبت"}
                  </p>

                  <p className="mt-1 text-base font-black text-emerald-800">
                    {formatMinutes(
                      Math.max(
                        0,
                        totalMinutes,
                      ),
                    )}
                  </p>

                  {timeEntryMode ===
                    "delay" && (
                    <p className="mt-2 text-[10px] leading-5 text-emerald-800/60">
                      {formatMinutes(
                        scheduledTotalMinutes,
                      )} موظفی
                      {" − "}
                      {formatMinutes(
                        delayTotalMinutes,
                      )} تأخیر
                    </p>
                  )}
                </div>

                {delayInvalid && (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    تأخیر نمی‌تواند از ساعت موظفی بیشتر باشد و ساعت موظفی باید حداکثر ۲۴ ساعت باشد.
                  </p>
                )}

                {timeEntryMode ===
                  "worked" &&
                  totalMinutes >
                    1440 && (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    مدت کار نمی‌تواند بیشتر از ۲۴ ساعت باشد.
                  </p>
                )}

                <div className="mt-4">
                  <label
                    htmlFor="time-note"
                    className="mb-2 flex items-center gap-2 text-xs font-black"
                  >
                    <FileText className="size-3.5 text-[var(--muted)]" />
                    توضیح
                    <span className="font-normal text-[var(--muted)]">
                      اختیاری
                    </span>
                  </label>

                  <textarea
                    id="time-note"
                    rows={
                      3
                    }
                    maxLength={
                      1000
                    }
                    value={
                      timeNote
                    }
                    onChange={(
                      event,
                    ) =>
                      setTimeNote(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="اگر توضیحی درباره این روز دارید..."
                    className="w-full resize-none rounded-2xl border border-[var(--line)] p-4 text-sm leading-7 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    !canSubmitTime
                  }
                  className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {submittingTime ? (
                    <>
                      <LoaderCircle className="size-5 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <Clock3 className="size-4" />
                      ثبت ساعت کاری
                    </>
                  )}
                </button>
              </form>

              <div className="rounded-[26px] border border-[var(--line)] bg-white p-4 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black">
                      سوابق ساعت من
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      وضعیت ثبت‌های روزانه
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                      {formatNumber(
                        approvedTimeCount,
                      )} تأیید
                    </span>

                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                      {formatNumber(
                        pendingMyTimeCount,
                      )} منتظر
                    </span>
                  </div>
                </div>

                {!timeData ||
                timeData.entries.length ===
                  0 ? (
                  <EmptyState
                    icon={
                      History
                    }
                    title="هنوز ساعتی ثبت نشده"
                    description="اولین روز کاری خودتان را از فرم کنار ثبت کنید."
                  />
                ) : (
                  <div className="space-y-3">
                    {timeData.entries.map(
                      (
                        entry,
                      ) => {
                        const meta =
                          statusMeta[
                            entry.status
                          ];

                        const Icon =
                          meta.icon;

                        return (
                          <article
                            key={
                              entry.id
                            }
                            className="rounded-[20px] border border-[var(--line)] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black">
                                  {formatDate(
                                    entry.workDate,
                                  )}
                                </p>

                                <p className="mt-1 text-xs font-black text-[var(--brand)]">
                                  {formatMinutes(
                                    entry.minutesWorked,
                                  )}
                                </p>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black ${meta.className}`}
                              >
                                <Icon className="size-3" />
                                {meta.label}
                              </span>
                            </div>

                            {entry.note && (
                              <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-xs leading-6 text-[var(--muted)]">
                                {entry.note}
                              </p>
                            )}

                            {entry.reviewerNote && (
                              <div
                                className={`mt-3 rounded-xl p-3 ${
                                  entry.status ===
                                  "REJECTED"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                <p className="text-[9px] font-black">
                                  توضیح بررسی
                                </p>

                                <p className="mt-1 text-xs leading-6">
                                  {entry.reviewerNote}
                                </p>
                              </div>
                            )}
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab ===
            "profile" && (
            <ProfileSection user={user} />
          )}

          {tab ===
            "account" && (
            <section className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[var(--line)] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-black">
                        حساب من
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        حقوق ثبت‌شده و پرداخت‌ها
                      </p>
                    </div>

                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <WalletCards className="size-5" />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-[10px] text-[var(--muted)]">
                      حقوق ماهانه فعلی
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {money(
                        timeData?.currentDefaultMonthlySalary ??
                          account?.employee.defaultMonthlySalary ??
                          "0",
                      )}
                    </p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <AccountRow
                      label="حقوق ثبت‌شده"
                      value={
                        account?.totals
                          .earned ??
                        "0"
                      }
                    />

                    <AccountRow
                      label="پرداخت‌شده"
                      value={
                        account?.totals
                          .paid ??
                        "0"
                      }
                    />

                    <div className="flex items-center justify-between rounded-2xl bg-[#102827] p-4 text-white">
                      <span className="text-xs font-black">
                        مانده
                      </span>

                      <span className="text-sm font-black text-emerald-200">
                        {money(
                          account?.totals
                            .balance ??
                            "0",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-[var(--line)] bg-white p-5">
                  <p className="text-sm font-black">
                    حقوق‌های ثبت‌شده
                  </p>

                  {!account ||
                  account.monthlySalaries.length ===
                    0 ? (
                    <p className="mt-4 text-xs leading-6 text-[var(--muted)]">
                      هنوز حقوق ماهانه‌ای برای حساب شما ثبت نشده است. Snapshot حقوق با اولین تأیید ساعت در ماه ساخته می‌شود.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {account.monthlySalaries.map(
                        (
                          salary,
                        ) => (
                          <div
                            key={
                              salary.id
                            }
                            className="flex items-center justify-between rounded-2xl bg-[var(--surface-soft)] p-3"
                          >
                            <div>
                              <p className="text-xs font-black">
                                {formatNumber(
                                  salary.year,
                                )}
                                /
                                {formatNumber(
                                  salary.month,
                                )}
                              </p>
                            </div>

                            <p className="text-xs font-black text-[var(--brand)]">
                              {money(
                                salary.amount,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[26px] border border-[var(--line)] bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-base font-black">
                      سابقه پرداخت‌ها
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      پرداخت‌های ثبت‌شده توسط مدیر
                    </p>
                  </div>

                  <Banknote className="size-5 text-[var(--brand)]" />
                </div>

                {!account ||
                account.payments.length ===
                  0 ? (
                  <EmptyState
                    icon={
                      Banknote
                    }
                    title="هنوز پرداختی ثبت نشده"
                    description="پس از ثبت پرداخت توسط مدیر، اینجا نمایش داده می‌شود."
                  />
                ) : (
                  <div className="space-y-2">
                    {account.payments.map(
                      (
                        payment,
                      ) => (
                        <article
                          key={
                            payment.id
                          }
                          className="rounded-[20px] border border-[var(--line)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-emerald-700">
                                {money(
                                  payment.amount,
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-[var(--muted)]">
                                {formatDateTime(
                                  payment.paidAt,
                                )}
                              </p>

                              <p className="mt-1 text-[9px] font-bold text-[var(--muted)]">
                                {payment.paymentMethod ===
                                "CARD_TO_CARD"
                                  ? "کارت‌به‌کارت"
                                  : payment.paymentMethod ===
                                      "BANK_TRANSFER"
                                    ? "انتقال بانکی"
                                    : payment.paymentMethod ===
                                        "CASH"
                                      ? "نقدی"
                                      : "سایر"}
                              </p>
                            </div>

                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">
                              پرداخت شده
                            </span>
                          </div>

                          {payment.note && (
                            <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs leading-6 text-[var(--muted)]">
                              {payment.note}
                            </p>
                          )}

                          {payment.hasReceipt && (
                            <button
                              type="button"
                              onClick={
                                () => {
                                  void openReceipt(
                                    payment.id,
                                  );
                                }
                              }
                              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-soft)] text-xs font-black text-[var(--brand)] transition hover:bg-emerald-100"
                            >
                              <Eye className="size-4" />
                              مشاهده رسید پرداخت
                            </button>
                          )}
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}

function ReviewBox({
  value,
  busy,
  onChange,
  onApprove,
  onReject,
}: {
  value: string;
  busy: boolean;
  onChange:
    (
      value: string,
    ) => void;
  onApprove:
    () => void;
  onReject:
    () => void;
}) {
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <textarea
        rows={
          2
        }
        maxLength={
          1000
        }
        value={
          value
        }
        disabled={
          busy
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder="توضیح بررسی؛ برای رد کردن الزامی است..."
        className="w-full resize-none rounded-2xl border border-[var(--line)] p-3 text-xs leading-6 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:opacity-60"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={
            busy
          }
          onClick={
            onReject
          }
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-xs font-black text-red-700 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" />
          )}

          رد کردن
        </button>

        <button
          type="button"
          disabled={
            busy
          }
          onClick={
            onApprove
          }
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-xs font-black text-white disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}

          تأیید
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon:
    typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white px-5 py-12 text-center">
      <Icon className="mx-auto size-8 text-slate-300" />

      <p className="mt-4 text-sm font-black">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}

function AccountRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-soft)] p-4">
      <span className="text-xs font-black">
        {label}
      </span>

      <span className="text-sm font-black">
        {money(
          value,
        )}
      </span>
    </div>
  );
}
