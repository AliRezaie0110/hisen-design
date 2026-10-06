"use client";

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
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Eye,
  History,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  UserRound,
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
  JalaliDateInput,
} from "@/components/ui/jalali-date-input";
import {
  ApiError,
} from "@/lib/api";
import type {
  AuthUser,
} from "@/lib/auth";
import {
  AvailableWorkItem,
  createWorkerEntry,
  EmployeeAccountResponse,
  getAvailableWork,
  getWorkerAccount,
  getWorkerHistory,
  openEmployeeReceipt,
  WorkerHistoryEntry,
  WorkEntryStatus,
} from "@/lib/worker-api";

type Tab =
  | "register"
  | "history"
  | "account"
  | "profile";

type HistoryFilter =
  | "ALL"
  | WorkEntryStatus;

const statusMeta: Record<
  WorkEntryStatus,
  {
    label: string;
    className: string;
    icon:
      typeof Clock3;
  }
> = {
  PENDING: {
    label:
      "در انتظار تأیید",
    className:
      "bg-amber-50 text-amber-700 border-amber-100",
    icon:
      Clock3,
  },

  APPROVED: {
    label:
      "تأیید شده",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon:
      CheckCircle2,
  },

  REJECTED: {
    label:
      "رد شده",
    className:
      "bg-red-50 text-red-700 border-red-100",
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

function normalizeOperationSearch(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "fa-IR",
    )
    .replaceAll(
      "ي",
      "ی",
    )
    .replaceAll(
      "ك",
      "ک",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function formatDate(
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

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof
    ApiError
  ) {
    if (
      error.code ===
      "WORK_QUANTITY_EXCEEDS_REMAINING"
    ) {
      return "ظرفیت این کار تغییر کرده است. اطلاعات تازه شد؛ تعداد را دوباره بررسی کنید.";
    }

    if (
      error.code ===
      "BATCH_NOT_ACTIVE"
    ) {
      return "این سری‌کار دیگر فعال نیست.";
    }

    if (
      error.status ===
      403
    ) {
      return "اجازه انجام این عملیات را ندارید.";
    }

    return error.message;
  }

  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}

export function WorkerDashboard({
  user,
}: {
  user: AuthUser;
}) {
  const router =
    useRouter();

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "register",
    );

  const [
    available,
    setAvailable,
  ] =
    useState<
      AvailableWorkItem[]
    >([]);

  const [
    history,
    setHistory,
  ] =
    useState<
      WorkerHistoryEntry[]
    >([]);

  const [
    account,
    setAccount,
  ] =
    useState<EmployeeAccountResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

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
    selectedBatchId,
    setSelectedBatchId,
  ] =
    useState("");

  const [
    selectedBatchOperationId,
    setSelectedBatchOperationId,
  ] =
    useState("");

  const [
    operationSearch,
    setOperationSearch,
  ] =
    useState("");

  const [
    selectedBatchSizeId,
    setSelectedBatchSizeId,
  ] =
    useState("");

  const [
    quantity,
    setQuantity,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    historyFilter,
    setHistoryFilter,
  ] =
    useState<HistoryFilter>(
      "ALL",
    );

  const [historyBatchId, setHistoryBatchId] =
    useState("");

  const [historyOperationId, setHistoryOperationId] =
    useState("");

  const [historyFrom, setHistoryFrom] =
    useState("");

  const [historyTo, setHistoryTo] =
    useState("");

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
          const [
            availableResponse,
            historyResponse,
            accountResponse,
          ] =
            await Promise.all([
              getAvailableWork(),
              getWorkerHistory(),
              getWorkerAccount(),
            ]);

          setAvailable(
            availableResponse.items ??
              [],
          );

          setHistory(
            historyResponse.items ??
              [],
          );

          setAccount(
            accountResponse,
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

  const batches =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              id: string;
              code: string;
              modelName:
                | string
                | null;
            }
          >();

        for (
          const item of
          available
        ) {
          if (
            !map.has(
              item.batchId,
            )
          ) {
            map.set(
              item.batchId,
              {
                id:
                  item.batchId,
                code:
                  item.batchCode,
                modelName:
                  item.modelName,
              },
            );
          }
        }

        return Array.from(
          map.values(),
        );
      },
      [
        available,
      ],
    );

  const operations =
    useMemo(
      () =>
        available.filter(
          (item) =>
            item.batchId ===
            selectedBatchId,
        ),
      [
        available,
        selectedBatchId,
      ],
    );

  const filteredOperations =
    useMemo(
      () => {
        const query =
          normalizeOperationSearch(
            operationSearch,
          );

        if (
          !query
        ) {
          return operations;
        }

        return operations.filter(
          (item) =>
            normalizeOperationSearch(
              item.operationName,
            ).includes(
              query,
            ),
        );
      },
      [
        operationSearch,
        operations,
      ],
    );

  const selected =
    useMemo(
      () =>
        available.find(
          (item) =>
            item.batchOperationId ===
            selectedBatchOperationId,
        ) ??
        null,
      [
        available,
        selectedBatchOperationId,
      ],
    );

  const sizes =
    selected?.sizes ??
    [];

  const selectedSize =
    useMemo(
      () =>
        sizes.find(
          (size) =>
            size.id ===
            selectedBatchSizeId,
        ) ??
        null,
      [
        sizes,
        selectedBatchSizeId,
      ],
    );

  useEffect(
    () => {
      if (
        available.length ===
        0
      ) {
        setSelectedBatchId(
          "",
        );

        setSelectedBatchOperationId(
          "",
        );

        setSelectedBatchSizeId(
          "",
        );

        return;
      }

      const batchExists =
        available.some(
          (item) =>
            item.batchId ===
            selectedBatchId,
        );

      if (
        !batchExists
      ) {
        const first =
          available[0];

        setSelectedBatchId(
          first.batchId,
        );

        setSelectedBatchOperationId(
          first.batchOperationId,
        );

        setSelectedBatchSizeId(
          first.sizes?.[0]?.id ??
            "",
        );

        return;
      }

      const currentOperation =
        available.find(
          (item) =>
            item.batchId ===
              selectedBatchId &&
            item.batchOperationId ===
              selectedBatchOperationId,
        );

      if (
        !currentOperation
      ) {
        const first =
          available.find(
            (item) =>
              item.batchId ===
              selectedBatchId,
          );

        setSelectedBatchOperationId(
          first?.batchOperationId ??
            "",
        );

        setSelectedBatchSizeId(
          first?.sizes?.[0]?.id ??
            "",
        );

        return;
      }

      const sizeExists =
        (currentOperation.sizes ?? []).some(
          (size) =>
            size.id ===
            selectedBatchSizeId,
        );

      if (
        !sizeExists
      ) {
        setSelectedBatchSizeId(
          currentOperation.sizes?.[0]
            ?.id ??
            "",
        );
      }
    },
    [
      available,
      selectedBatchId,
      selectedBatchOperationId,
      selectedBatchSizeId,
    ],
  );

  const parsedQuantity =
    /^\d+$/.test(
      quantity,
    )
      ? Number(
          quantity,
        )
      : 0;

  const validQuantity =
    Boolean(
      selected &&
        selectedSize &&
        parsedQuantity >
          0 &&
        parsedQuantity <=
          selectedSize.remainingQuantity,
    );

  const canSubmit =
    Boolean(
      selected &&
        selectedSize &&
        validQuantity &&
        !submitting,
    );

  const historyBatchOptions =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              id: string;
              code: string;
              modelName: string | null;
            }
          >();

        for (const entry of history) {
          if (!map.has(entry.batchId)) {
            map.set(
              entry.batchId,
              {
                id: entry.batchId,
                code: entry.batchCode,
                modelName: entry.modelName,
              },
            );
          }
        }

        return Array.from(map.values());
      },
      [history],
    );

  const historyOperationOptions =
    useMemo(
      () => {
        const map =
          new Map<string, string>();

        for (const entry of history) {
          if (
            historyBatchId &&
            entry.batchId !== historyBatchId
          ) {
            continue;
          }

          map.set(
            entry.operationId,
            entry.operationName,
          );
        }

        return Array.from(
          map.entries(),
        ).map(([id, name]) => ({
          id,
          name,
        }));
      },
      [history, historyBatchId],
    );

  const filteredHistory =
    useMemo(
      () =>
        history.filter(
          (entry) => {
            if (
              historyFilter !== "ALL" &&
              entry.status !== historyFilter
            ) {
              return false;
            }

            if (
              historyBatchId &&
              entry.batchId !== historyBatchId
            ) {
              return false;
            }

            if (
              historyOperationId &&
              entry.operationId !== historyOperationId
            ) {
              return false;
            }

            const day =
              entry.createdAt.slice(0, 10);

            if (
              historyFrom &&
              day < historyFrom
            ) {
              return false;
            }

            if (
              historyTo &&
              day > historyTo
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        history,
        historyBatchId,
        historyFilter,
        historyFrom,
        historyOperationId,
        historyTo,
      ],
    );

  const filteredHistoryTotals =
    useMemo(
      () => {
        let quantity = 0;
        let amount = BigInt(0);

        for (const entry of filteredHistory) {
          quantity += entry.quantity;

          try {
            amount += BigInt(entry.totalAmount);
          } catch {
            // Invalid legacy monetary value is ignored in the aggregate only.
          }
        }

        return {
          entries: filteredHistory.length,
          quantity,
          amount: amount.toString(),
        };
      },
      [filteredHistory],
    );

  const historyCounts =
    useMemo(
      () => ({
        ALL:
          history.length,
        PENDING:
          history.filter(
            (entry) =>
              entry.status ===
              "PENDING",
          ).length,
        APPROVED:
          history.filter(
            (entry) =>
              entry.status ===
              "APPROVED",
          ).length,
        REJECTED:
          history.filter(
            (entry) =>
              entry.status ===
              "REJECTED",
          ).length,
      }),
      [
        history,
      ],
    );

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !selected ||
      !selectedSize ||
      !canSubmit
    ) {
      return;
    }

    setSubmitting(
      true,
    );

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      await createWorkerEntry({
        batchOperationId:
          selected.batchOperationId,

        workBatchSizeId:
          selectedSize.id,

        quantity:
          parsedQuantity,
      });

      setQuantity(
        "",
      );

      setSuccess(
        "کار با موفقیت ثبت شد و برای تأیید ارسال شد.",
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

      if (
        caught instanceof
          ApiError &&
        (
          caught.code ===
            "WORK_QUANTITY_EXCEEDS_REMAINING" ||
          caught.code ===
            "WORK_SIZE_QUANTITY_EXCEEDS_REMAINING" ||
          caught.code ===
            "BATCH_SIZE_NOT_ACTIVE" ||
          caught.code ===
            "BATCH_OPERATION_NOT_ACTIVE" ||
          caught.code ===
            "BATCH_NOT_ACTIVE"
        )
      ) {
        await load(
          true,
        );
      }
    } finally {
      setSubmitting(
        false,
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
  const tabs: Array<{
    id: Tab;
    label: string;
    icon:
      typeof ClipboardCheck;
    badge?: number;
  }> = [
    {
      id:
        "register",
      label:
        "ثبت کار",
      icon:
        ClipboardCheck,
    },
    {
      id:
        "history",
      label:
        "سوابق",
      icon:
        History,
      badge:
        historyCounts.PENDING,
    },
    {
      id:
        "account",
      label:
        "حساب من",
      icon:
        WalletCards,
    },
    {
      id:
        "profile",
      label:
        "پروفایل",
      icon:
        UserRound,
    },
  ];

  return (
    <AppShell
      user={user}
      eyebrow="پنل همکار"
      title="کارهای من"
      description="ثبت کار روزانه، پیگیری تأییدها و مشاهده حساب شخصی."
    >
      <section className="mb-4 overflow-hidden rounded-[26px] bg-[#102827] p-5 text-white shadow-[0_18px_45px_rgba(16,40,39,.14)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-200/80">
              سلام،
            </p>

            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {user.fullName}
            </h2>

            <p className="mt-2 text-xs leading-6 text-white/55">
              وضعیت حساب و کارهای ثبت‌شده شما به‌صورت لحظه‌ای
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
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:opacity-50"
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

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p className="text-[10px] font-bold text-white/45 sm:text-xs">
              درآمد تأییدشده
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

            <p className="mt-1 text-[9px] text-white/35 sm:text-[10px]">
              تومان
            </p>
          </div>

          <div className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p className="text-[10px] font-bold text-white/45 sm:text-xs">
              در انتظار
            </p>

            <p className="mt-2 truncate text-sm font-black text-amber-200 sm:text-lg">
              {account
                ? formatNumber(
                    account
                      .totals
                      .pending,
                  )
                : "—"}
            </p>

            <p className="mt-1 text-[9px] text-white/35 sm:text-[10px]">
              تومان
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-300/10 p-3 ring-1 ring-emerald-200/15 sm:p-4">
            <p className="text-[10px] font-bold text-emerald-100/55 sm:text-xs">
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

            <p className="mt-1 text-[9px] text-emerald-100/40 sm:text-[10px]">
              تومان
            </p>
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2 rounded-[22px] border border-[var(--line)] bg-white p-1.5 shadow-[0_6px_24px_rgba(15,23,42,.025)]">
        {tabs.map(
          (item) => {
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
                className={`relative flex h-12 items-center justify-center gap-1.5 rounded-2xl text-xs font-black transition sm:text-sm ${
                  active
                    ? "bg-[var(--brand)] text-white shadow-[0_8px_20px_rgba(13,116,109,.16)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                <Icon className="size-4" />

                {item.label}

                {Boolean(
                  item.badge,
                ) && (
                  <span
                    className={`absolute left-2 top-1.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[9px] ${
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

          <div className="min-w-0">
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

          <div>
            <p className="text-sm font-black">
              ثبت شد
            </p>

            <p className="mt-1 text-xs leading-6">
              {success}
            </p>
          </div>
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
          {tab ===
            "register" && (
            <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <form
                onSubmit={
                  submit
                }
                className="rounded-[26px] border border-[var(--line)] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.025)] sm:p-6"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-black">
                      ثبت کار جدید
                    </p>

                    <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                      ابتدا سری‌کار و سپس عملیات انجام‌شده را انتخاب کنید.
                    </p>
                  </div>

                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <ClipboardCheck className="size-5" />
                  </div>
                </div>

                {available.length ===
                0 ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-5 py-10 text-center">
                    <PackageCheck className="mx-auto size-8 text-slate-300" />

                    <p className="mt-4 text-sm font-black">
                      فعلاً کاری برای ثبت وجود ندارد
                    </p>

                    <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[var(--muted)]">
                      سری فعال یا ظرفیت باقی‌مانده‌ای وجود ندارد. بعداً دوباره بررسی کنید.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="batch"
                        className="mb-2 block text-xs font-black text-[var(--text)]"
                      >
                        سری‌کار
                      </label>

                      <div className="relative">
                        <select
                          id="batch"
                          value={
                            selectedBatchId
                          }
                          onChange={(
                            event,
                          ) => {
                            const id =
                              event
                                .target
                                .value;

                            setSelectedBatchId(
                              id,
                            );

                            setOperationSearch(
                              "",
                            );

                            const first =
                              available.find(
                                (
                                  item,
                                ) =>
                                  item.batchId ===
                                  id,
                              );

                            setSelectedBatchOperationId(
                              first?.batchOperationId ??
                                "",
                            );

                            setSelectedBatchSizeId(
                              first?.sizes?.[0]?.id ??
                                "",
                            );

                            setQuantity(
                              "",
                            );

                            setSuccess(
                              null,
                            );
                          }}
                          className="h-14 w-full appearance-none rounded-2xl border border-[var(--line)] bg-white px-4 pl-11 text-sm font-black outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                        >
                          {batches.map(
                            (
                              batch,
                            ) => (
                              <option
                                key={
                                  batch.id
                                }
                                value={
                                  batch.id
                                }
                              >
                                {batch.code}
                                {batch.modelName
                                  ? ` — ${batch.modelName}`
                                  : ""}
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-xs font-black">
                            عملیات
                          </label>

                          <span className="text-[10px] text-[var(--muted)]">
                            {formatNumber(
                              filteredOperations.length,
                            )} مورد
                          </span>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-100 p-3 shadow-inner">
                          <div className="mb-3 flex items-center justify-between gap-3 px-1">
                            <p className="text-[10px] font-bold text-slate-500">
                              عملیات‌های این سری
                            </p>

                            <p className="text-[10px] text-slate-400">
                              داخل کادر اسکرول کنید
                            </p>
                          </div>

                          <div className="relative mb-3">
                            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                            <input
                              type="search"
                              value={
                                operationSearch
                              }
                              onChange={
                                (
                                  event,
                                ) =>
                                  setOperationSearch(
                                    event.target.value,
                                  )
                              }
                              placeholder="جستجوی عملیات..."
                              aria-label="جستجوی عملیات"
                              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-10 pl-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                            />
                          </div>

                          <div className="grid max-h-[250px] gap-2 overflow-y-auto overscroll-contain pl-1 [scrollbar-gutter:stable] sm:max-h-[240px]">
                            {filteredOperations.length >
                            0 ? (
                              filteredOperations.map(
                              (
                                item,
                              ) => {
                                const active =
                                  item.batchOperationId ===
                                  selectedBatchOperationId;

                                return (
                                  <button
                                    type="button"
                                    key={
                                      item.batchOperationId
                                    }
                                    onClick={
                                      () => {
                                        setSelectedBatchOperationId(
                                          item.batchOperationId,
                                        );

                                        setSelectedBatchSizeId(
                                          item.sizes?.[0]?.id ??
                                            "",
                                        );

                                        setQuantity(
                                          "",
                                        );

                                        setSuccess(
                                          null,
                                        );
                                      }
                                    }
                                    className={`rounded-[20px] border p-4 text-right transition ${
                                      active
                                        ? "border-[var(--brand)] bg-white ring-2 ring-[var(--brand)]/10"
                                        : "border-slate-200 bg-white/80 hover:border-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-black">
                                          {item.operationName}
                                        </p>

                                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                                          باقی‌مانده کل عملیات{" "}
                                          <span className="font-black text-[var(--text)]">
                                            {formatNumber(
                                              item.remainingQuantity,
                                            )}
                                          </span>{" "}
                                          عدد
                                        </p>
                                      </div>

                                      <span
                                        className={`mt-1 size-3 rounded-full border-2 ${
                                          active
                                            ? "border-[var(--brand)] bg-[var(--brand)]"
                                            : "border-slate-300 bg-white"
                                        }`}
                                      />
                                    </div>
                                  </button>
                                );
                              },
                            )
                            ) : (
                              <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-xs font-bold text-slate-500">
                                عملیاتی با این عبارت پیدا نشد.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-xs font-black">
                            سایز
                          </label>

                          <span className="text-[10px] text-[var(--muted)]">
                            {formatNumber(
                              sizes.length,
                            )} سایز
                          </span>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-100 p-3 shadow-inner">
                          <div className="mb-3 flex items-center justify-between gap-3 px-1">
                            <p className="text-[10px] font-bold text-slate-500">
                              سایزهای این سری
                            </p>

                            <p className="text-[10px] text-slate-400">
                              برای عملیات انتخاب‌شده
                            </p>
                          </div>

                          <div className="grid max-h-[250px] gap-2 overflow-y-auto overscroll-contain pl-1 [scrollbar-gutter:stable] sm:max-h-[240px] sm:grid-cols-2">
                            {sizes.map(
                              (
                                size,
                              ) => {
                                const active =
                                  size.id ===
                                  selectedBatchSizeId;

                                return (
                                  <button
                                    type="button"
                                    key={
                                      size.id
                                    }
                                    onClick={
                                      () => {
                                        setSelectedBatchSizeId(
                                          size.id,
                                        );

                                        setQuantity(
                                          "",
                                        );

                                        setSuccess(
                                          null,
                                        );
                                      }
                                    }
                                    className={`rounded-[20px] border p-4 text-right transition ${
                                      active
                                        ? "border-[var(--brand)] bg-white ring-2 ring-[var(--brand)]/10"
                                        : "border-slate-200 bg-white/80 hover:border-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-black">
                                          سایز {size.label}
                                        </p>

                                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                                          باقی‌مانده{" "}
                                          <span className="font-black text-[var(--text)]">
                                            {formatNumber(
                                              size.remainingQuantity,
                                            )}
                                          </span>{" "}
                                          از{" "}
                                          {formatNumber(
                                            size.quantity,
                                          )}
                                        </p>
                                      </div>

                                      <span
                                        className={`mt-1 size-3 rounded-full border-2 ${
                                          active
                                            ? "border-[var(--brand)] bg-[var(--brand)]"
                                            : "border-slate-300 bg-white"
                                        }`}
                                      />
                                    </div>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selected &&
                    selectedSize && (
                      <>
                        <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-[var(--surface-soft)] p-3">
                          <div className="rounded-2xl bg-white p-3 text-center">
                            <p className="text-[10px] text-[var(--muted)]">
                              ظرفیت سایز
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {formatNumber(
                                selectedSize.quantity,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3 text-center">
                            <p className="text-[10px] text-[var(--muted)]">
                              ثبت این عملیات
                            </p>

                            <p className="mt-1 text-sm font-black">
                              {formatNumber(
                                selectedSize.claimedQuantity,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                            <p className="text-[10px] text-emerald-700/65">
                              باقی‌مانده سایز
                            </p>

                            <p className="mt-1 text-sm font-black text-emerald-700">
                              {formatNumber(
                                selectedSize.remainingQuantity,
                              )}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="quantity"
                            className="mb-2 block text-xs font-black"
                          >
                            تعداد انجام‌شده
                          </label>

                          <input
                            id="quantity"
                            type="number"
                            min={
                              1
                            }
                            max={
                              selectedSize.remainingQuantity
                            }
                            inputMode="numeric"
                            dir="ltr"
                            value={
                              quantity
                            }
                            onChange={(
                              event,
                            ) => {
                              setQuantity(
                                event
                                  .target
                                  .value
                                  .replace(
                                    /\D/g,
                                    "",
                                  ),
                              );

                              setSuccess(
                                null,
                              );
                            }}
                            placeholder="مثلاً 48"
                            className="h-16 w-full rounded-2xl border border-[var(--line)] bg-white px-5 text-center text-2xl font-black outline-none transition placeholder:text-base placeholder:font-normal placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                          />

                          {parsedQuantity >
                            selectedSize.remainingQuantity && (
                            <p className="mt-2 text-xs font-bold text-red-600">
                              حداکثر قابل ثبت{" "}
                              {formatNumber(
                                selectedSize.remainingQuantity,
                              )}{" "}
                              عدد است.
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={
                            !canSubmit
                          }
                          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white shadow-[0_12px_28px_rgba(13,116,109,.18)] transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {submitting ? (
                            <>
                              <LoaderCircle className="size-5 animate-spin" />
                              در حال ثبت...
                            </>
                          ) : (
                            <>
                              <Send className="size-4" />
                              ثبت و ارسال برای تأیید
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </form>

              <aside className="space-y-4">
                <div className="rounded-[26px] border border-[var(--line)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.025)]">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                      <Clock3 className="size-4" />
                    </div>

                    <div>
                      <p className="text-sm font-black">
                        منتظر تأیید
                      </p>

                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                        کارهای ثبت‌شده شما
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between">
                    <p className="text-3xl font-black">
                      {formatNumber(
                        account?.totals
                          .pendingWorkEntries ??
                          0,
                      )}
                    </p>

                    <p className="text-xs font-black text-amber-700">
                      {money(
                        account?.totals
                          .pending ??
                          "0",
                      )}
                    </p>
                  </div>
                </div>

              </aside>
            </section>
          )}

          {tab ===
            "history" && (
            <section>
              <div className="mb-4 rounded-[24px] border border-[var(--line)] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">فیلتر سوابق من</p>
                    <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
                      سری‌کار، عملیات و بازه زمانی دلخواه را انتخاب کنید.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHistoryBatchId("");
                      setHistoryOperationId("");
                      setHistoryFrom("");
                      setHistoryTo("");
                      setHistoryFilter("ALL");
                    }}
                    className="h-9 shrink-0 rounded-xl border border-[var(--line)] px-3 text-[10px] font-black text-[var(--muted)]"
                  >
                    پاک کردن
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={historyBatchId}
                    onChange={(event) => {
                      setHistoryBatchId(event.target.value);
                      setHistoryOperationId("");
                    }}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  >
                    <option value="">همه سری‌کارها</option>
                    {historyBatchOptions.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.code}{batch.modelName ? ` — ${batch.modelName}` : ""}
                      </option>
                    ))}
                  </select>

                  <select
                    value={historyOperationId}
                    onChange={(event) => setHistoryOperationId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  >
                    <option value="">همه عملیات‌ها</option>
                    {historyOperationOptions.map((operation) => (
                      <option key={operation.id} value={operation.id}>
                        {operation.name}
                      </option>
                    ))}
                  </select>

                  <JalaliDateInput
                    dir="ltr"
                    value={historyFrom}
                    onChange={(event) => setHistoryFrom(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />

                  <JalaliDateInput
                    dir="ltr"
                    value={historyTo}
                    onChange={(event) => setHistoryTo(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />
                </div>
              </div>

              <div className="mb-4 overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2">
                  {(
                    [
                      {
                        id:
                          "ALL",
                        label:
                          "همه",
                      },
                      {
                        id:
                          "PENDING",
                        label:
                          "در انتظار",
                      },
                      {
                        id:
                          "APPROVED",
                        label:
                          "تأییدشده",
                      },
                      {
                        id:
                          "REJECTED",
                        label:
                          "ردشده",
                      },
                    ] as Array<{
                      id: HistoryFilter;
                      label: string;
                    }>
                  ).map(
                    (
                      item,
                    ) => (
                      <button
                        type="button"
                        key={
                          item.id
                        }
                        onClick={
                          () =>
                            setHistoryFilter(
                              item.id,
                            )
                        }
                        className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black transition ${
                          historyFilter ===
                          item.id
                            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-[var(--line)] bg-white text-[var(--muted)]"
                        }`}
                      >
                        {item.label}

                        <span className="rounded-full bg-black/[.05] px-1.5 py-0.5 text-[9px]">
                          {formatNumber(
                            historyCounts[
                              item.id
                            ],
                          )}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[var(--line)]">
                  <p className="text-[9px] text-[var(--muted)]">ثبت‌ها</p>
                  <p className="mt-1 text-sm font-black">
                    {formatNumber(filteredHistoryTotals.entries)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[var(--line)]">
                  <p className="text-[9px] text-[var(--muted)]">تعداد قطعه</p>
                  <p className="mt-1 text-sm font-black">
                    {formatNumber(filteredHistoryTotals.quantity)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-center">
                  <p className="text-[9px] text-[var(--brand)]/70">مبلغ این فیلتر</p>
                  <p className="mt-1 text-xs font-black text-[var(--brand)]">
                    {money(filteredHistoryTotals.amount)}
                  </p>
                </div>
              </div>

              {filteredHistory.length ===
              0 ? (
                <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white px-5 py-14 text-center">
                  <History className="mx-auto size-8 text-slate-300" />

                  <p className="mt-4 text-sm font-black">
                    سابقه‌ای پیدا نشد
                  </p>

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    بعد از ثبت کار، وضعیت آن اینجا نمایش داده می‌شود.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map(
                    (
                      entry,
                    ) => {
                      const meta =
                        statusMeta[
                          entry.status
                        ];

                      const StatusIcon =
                        meta.icon;

                      return (
                        <article
                          key={
                            entry.id
                          }
                          className="rounded-[24px] border border-[var(--line)] bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,.02)] sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-black">
                                  {entry.operationName}
                                </h3>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${meta.className}`}
                                >
                                  <StatusIcon className="size-3" />
                                  {meta.label}
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-[var(--muted)]">
                                سری{" "}
                                <span className="font-black text-[var(--text)]">
                                  {entry.batchCode}
                                </span>
                                {entry.modelName
                                  ? ` · ${entry.modelName}`
                                  : ""}
                                {` · سایز ${entry.sizeLabel}`}
                              </p>
                            </div>

                            <div className="shrink-0 text-left">
                              <p className="text-sm font-black text-[var(--brand)]">
                                {money(
                                  entry.totalAmount,
                                )}
                              </p>

                              <p className="mt-1 text-[10px] text-[var(--muted)]">
                                {formatNumber(
                                  entry.quantity,
                                )}{" "}
                                عدد
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-soft)] p-3 sm:grid-cols-3">
                            <div>
                              <p className="text-[9px] text-[var(--muted)]">
                                نرخ هر عدد
                              </p>

                              <p className="mt-1 text-xs font-black">
                                {money(
                                  entry.unitRate,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] text-[var(--muted)]">
                                زمان ثبت
                              </p>

                              <p className="mt-1 text-[11px] font-bold">
                                {formatDate(
                                  entry.createdAt,
                                )}
                              </p>
                            </div>

                            {entry.reviewedAt && (
                              <div className="col-span-2 sm:col-span-1">
                                <p className="text-[9px] text-[var(--muted)]">
                                  زمان بررسی
                                </p>

                                <p className="mt-1 text-[11px] font-bold">
                                  {formatDate(
                                    entry.reviewedAt,
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {entry.workerNote && (
                            <div className="mt-3 rounded-2xl border border-[var(--line)] px-3 py-2.5">
                              <p className="text-[9px] font-black text-[var(--muted)]">
                                توضیح شما
                              </p>

                              <p className="mt-1 text-xs leading-6">
                                {entry.workerNote}
                              </p>
                            </div>
                          )}

                          {entry.reviewerNote && (
                            <div
                              className={`mt-3 rounded-2xl px-3 py-2.5 ${
                                entry.status ===
                                "REJECTED"
                                  ? "bg-red-50"
                                  : "bg-emerald-50"
                              }`}
                            >
                              <p
                                className={`text-[9px] font-black ${
                                  entry.status ===
                                  "REJECTED"
                                    ? "text-red-600"
                                    : "text-emerald-700"
                                }`}
                              >
                                توضیح سرپرست
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
            </section>
          )}

          {tab ===
            "profile" && (
            <ProfileSection user={user} />
          )}

          {tab ===
            "account" && (
            <section className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="rounded-[26px] border border-[var(--line)] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-black">
                        خلاصه حساب
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        فقط مبالغ تأییدشده وارد درآمد قطعی می‌شوند.
                      </p>
                    </div>

                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <WalletCards className="size-5" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-soft)] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-white text-[var(--brand)]">
                          <CheckCircle2 className="size-4" />
                        </div>

                        <div>
                          <p className="text-xs font-black">
                            درآمد تأییدشده
                          </p>

                          <p className="mt-1 text-[10px] text-[var(--muted)]">
                            {formatNumber(
                              account?.totals
                                .approvedWorkEntries ??
                                0,
                            )}{" "}
                            ثبت تأییدشده
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-black">
                        {money(
                          account?.totals
                            .earned ??
                            "0",
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-white text-amber-700">
                          <Clock3 className="size-4" />
                        </div>

                        <div>
                          <p className="text-xs font-black">
                            در انتظار تأیید
                          </p>

                          <p className="mt-1 text-[10px] text-amber-700/60">
                            {formatNumber(
                              account?.totals
                                .pendingWorkEntries ??
                                0,
                            )}{" "}
                            ثبت
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-black text-amber-800">
                        {money(
                          account?.totals
                            .pending ??
                            "0",
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-blue-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700">
                          <Banknote className="size-4" />
                        </div>

                        <p className="text-xs font-black">
                          پرداخت‌شده
                        </p>
                      </div>

                      <p className="text-sm font-black text-blue-800">
                        {money(
                          account?.totals
                            .paid ??
                            "0",
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-[#102827] p-4 text-white">
                      <div>
                        <p className="text-xs font-black">
                          مانده قابل پرداخت
                        </p>

                        <p className="mt-1 text-[10px] text-white/40">
                          درآمد قطعی منهای پرداخت‌ها
                        </p>
                      </div>

                      <p className="text-base font-black text-emerald-200">
                        {money(
                          account?.totals
                            .balance ??
                            "0",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-[var(--line)] bg-white p-4 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-base font-black">
                      سابقه پرداخت‌ها
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      تمام پرداخت‌های ثبت‌شده برای شما
                    </p>
                  </div>

                  <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-black text-[var(--muted)]">
                    {formatNumber(
                      account?.payments
                        .length ??
                        0,
                    )}{" "}
                    پرداخت
                  </span>
                </div>

                {!account ||
                account.payments.length ===
                  0 ? (
                  <div className="rounded-[22px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-5 py-12 text-center">
                    <Banknote className="mx-auto size-8 text-slate-300" />

                    <p className="mt-4 text-sm font-black">
                      هنوز پرداختی ثبت نشده
                    </p>

                    <p className="mt-2 text-xs text-[var(--muted)]">
                      بعد از ثبت پرداخت توسط مدیر، سابقه آن اینجا نمایش داده می‌شود.
                    </p>
                  </div>
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
                                {formatDate(
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
