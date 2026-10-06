"use client";

import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Eye,
  FileImage,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  EmployeeAccountDetail,
  EmployeeAccountSummary,
  getEmployeeAccount,
  listEmployeeAccounts,
  managerError,
  openManagerEmployeeReceipt,
  PaymentMethod,
  recordEmployeePayment,
  shareManagerEmployeeReceipt,
} from "@/lib/manager-api";

const inputClass =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-bold outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

const paymentMethodLabel:
  Record<
    PaymentMethod,
    string
  > = {
  CARD_TO_CARD:
    "کارت‌به‌کارت",

  BANK_TRANSFER:
    "انتقال بانکی",

  CASH:
    "نقدی",

  OTHER:
    "سایر",
};

const roleLabel = {
  WORKER:
    "همکار",

  SUPERVISOR:
    "سرپرست",

  ASSISTANT:
    "وردست",
} as const;

function money(
  value:
    string,
): string {
  try {
    return `${new Intl.NumberFormat(
      "fa-IR",
    ).format(
      BigInt(
        value,
      ),
    )} تومان`;
  } catch {
    return value;
  }
}

function dateTime(
  value:
    string,
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

export function EmployeeAccountsSection() {
  const [
    items,
    setItems,
  ] =
    useState<
      EmployeeAccountSummary[]
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
    q,
    setQ,
  ] =
    useState("");

  const [
    role,
    setRole,
  ] =
    useState<
      "" |
      "WORKER" |
      "SUPERVISOR" |
      "ASSISTANT"
    >("");

  const [
    active,
    setActive,
  ] =
    useState<
      "" |
      "true" |
      "false"
    >("");

  const [
    detail,
    setDetail,
  ] =
    useState<
      EmployeeAccountDetail |
      null
    >(null);

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false,
    );

  const [
    paymentOpen,
    setPaymentOpen,
  ] =
    useState(
      false,
    );

  const [
    amount,
    setAmount,
  ] =
    useState("");

  const [
    method,
    setMethod,
  ] =
    useState<PaymentMethod>(
      "CARD_TO_CARD",
    );

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    receipt,
    setReceipt,
  ] =
    useState<
      File | null
    >(null);

  const [
    paymentSaving,
    setPaymentSaving,
  ] =
    useState(
      false,
    );

  const [
    receiptBusyId,
    setReceiptBusyId,
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
          const response =
            await listEmployeeAccounts({
              q:
                q.trim() ||
                undefined,

              role:
                role ||
                undefined,

              isActive:
                active ===
                ""
                  ? undefined
                  : active ===
                    "true",

              page:
                1,

              pageSize:
                100,
            });

          setItems(
            response.items,
          );
        } catch (
          caught
        ) {
          setError(
            managerError(
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
        active,
        q,
        role,
      ],
    );

  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void load();
          },
          250,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      load,
    ],
  );

  async function openDetail(
    employeeId:
      string,
  ) {
    setDetailLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await getEmployeeAccount(
          employeeId,
        );

      setDetail(
        response,
      );
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    } finally {
      setDetailLoading(
        false,
      );
    }
  }

  async function reloadDetail() {
    if (
      !detail
    ) {
      return;
    }

    const response =
      await getEmployeeAccount(
        detail.employee.id,
      );

    setDetail(
      response,
    );
  }

  function startPayment() {
    if (
      !detail
    ) {
      return;
    }

    if (
      BigInt(
        detail.totals.balance,
      ) <=
      BigInt(0)
    ) {
      setError(
        "برای این شخص مانده قابل پرداختی وجود ندارد.",
      );

      return;
    }

    setAmount(
      detail.totals.balance,
    );

    setMethod(
      "CARD_TO_CARD",
    );

    setNote("");
    setReceipt(
      null,
    );

    setPaymentOpen(
      true,
    );
  }

  function changeReceipt(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[
        0
      ] ??
      null;

    if (!file) {
      setReceipt(
        null,
      );

      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (
      !allowed.includes(
        file.type,
      )
    ) {
      setError(
        "رسید فقط می‌تواند JPG، PNG یا PDF باشد.",
      );

      event.target.value =
        "";

      return;
    }

    if (
      file.size >
      5 *
        1024 *
        1024
    ) {
      setError(
        "حجم رسید نباید بیشتر از ۵ مگابایت باشد.",
      );

      event.target.value =
        "";

      return;
    }

    setReceipt(
      file,
    );

    setError(
      null,
    );
  }

  async function submitPayment(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (
      !detail
    ) {
      return;
    }

    if (
      !/^[1-9]\d*$/.test(
        amount,
      )
    ) {
      setError(
        "مبلغ پرداخت را به‌صورت عدد صحیح وارد کنید.",
      );

      return;
    }

    if (
      BigInt(
        amount,
      ) >
      BigInt(
        detail.totals.balance,
      )
    ) {
      setError(
        `حداکثر مبلغ قابل پرداخت ${money(
          detail.totals.balance,
        )} است.`,
      );

      return;
    }

    setPaymentSaving(
      true,
    );

    setError(
      null,
    );

    try {
      await recordEmployeePayment(
        detail.employee.id,
        {
          amount,

          paymentMethod:
            method,

          ...(note.trim()
            ? {
                note:
                  note.trim(),
              }
            : {}),

          ...(receipt
            ? {
                receipt,
              }
            : {}),
        },
      );

      setPaymentOpen(
        false,
      );

      setAmount("");
      setNote("");
      setReceipt(
        null,
      );

      await Promise.all([
        reloadDetail(),
        load(
          true,
        ),
      ]);
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    } finally {
      setPaymentSaving(
        false,
      );
    }
  }

  async function openReceipt(
    paymentId:
      string,
  ) {
    setReceiptBusyId(
      paymentId,
    );

    setError(
      null,
    );

    try {
      await openManagerEmployeeReceipt(
        paymentId,
      );
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    } finally {
      setReceiptBusyId(
        null,
      );
    }
  }

  async function shareReceipt(
    paymentId:
      string,
  ) {
    if (
      !detail
    ) {
      return;
    }

    setReceiptBusyId(
      paymentId,
    );

    setError(
      null,
    );

    try {
      await shareManagerEmployeeReceipt(
        paymentId,
        detail.employee
          .fullName,
      );
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    } finally {
      setReceiptBusyId(
        null,
      );
    }
  }

  const totalBalance =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        BigInt(
          item.balance,
        ),
      BigInt(0),
    );

  const totalPaid =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        BigInt(
          item.paid,
        ),
      BigInt(0),
    );

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">
            حساب کارکنان
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            درآمد، پرداخت‌ها و مانده هر همکار، سرپرست و وردست را ببینید و پرداخت واقعی ثبت کنید.
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
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 text-xs font-black text-[var(--muted)]"
        >
          <RefreshCw
            className={`size-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryBox
          label="تعداد حساب"
          value={
            new Intl.NumberFormat(
              "fa-IR",
            ).format(
              items.length,
            )
          }
        />

        <SummaryBox
          label="جمع پرداخت‌شده"
          value={
            money(
              totalPaid.toString(),
            )
          }
        />

        <SummaryBox
          label="جمع مانده"
          value={
            money(
              totalBalance.toString(),
            )
          }
          strong
        />

        <SummaryBox
          label="حساب دارای مانده"
          value={
            new Intl.NumberFormat(
              "fa-IR",
            ).format(
              items.filter(
                (
                  item,
                ) =>
                  BigInt(
                    item.balance,
                  ) >
                  BigInt(0),
              ).length,
            )
          }
        />
      </div>

      <div className="mb-4 grid gap-2 rounded-[22px] border border-[var(--line)] bg-white p-3 lg:grid-cols-[1fr_180px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

          <input
            value={
              q
            }
            onChange={(
              event,
            ) =>
              setQ(
                event.target
                  .value,
              )
            }
            className={`${inputClass} pr-11`}
            placeholder="جست‌وجوی نام یا موبایل..."
          />
        </div>

        <select
          value={
            role
          }
          onChange={(
            event,
          ) =>
            setRole(
              event.target
                .value as
                typeof role,
            )
          }
          className={
            inputClass
          }
        >
          <option value="">
            همه نقش‌ها
          </option>

          <option value="WORKER">
            همکار
          </option>

          <option value="SUPERVISOR">
            سرپرست
          </option>

          <option value="ASSISTANT">
            وردست
          </option>
        </select>

        <select
          value={
            active
          }
          onChange={(
            event,
          ) =>
            setActive(
              event.target
                .value as
                typeof active,
            )
          }
          className={
            inputClass
          }
        >
          <option value="">
            همه وضعیت‌ها
          </option>

          <option value="true">
            فعال
          </option>

          <option value="false">
            غیرفعال
          </option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-[26px] border border-[var(--line)] bg-white p-14 text-center">
          <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--brand)]" />
        </div>
      ) : items.length ===
        0 ? (
        <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white p-12 text-center">
          <WalletCards className="mx-auto size-8 text-slate-300" />

          <p className="mt-4 text-sm font-black">
            حسابی پیدا نشد
          </p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map(
            (
              item,
            ) => (
              <article
                key={
                  item.id
                }
                className="rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <UserRound className="size-5" />
                    </div>

                    <div>
                      <p className="text-sm font-black">
                        {item.fullName}
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {roleLabel[
                          item.role
                        ]}
                        {" · "}
                        {item.compensationType ===
                        "PIECE_RATE"
                          ? "دانه‌ای"
                          : "حقوق ثابت"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                      item.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MoneyBox
                    label="درآمد"
                    value={
                      item.earned
                    }
                  />

                  <MoneyBox
                    label="پرداخت"
                    value={
                      item.paid
                    }
                  />

                  <MoneyBox
                    label="مانده"
                    value={
                      item.balance
                    }
                    strong
                  />
                </div>

                {BigInt(
                  item.pending,
                ) >
                  BigInt(0) && (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">
                    در انتظار تأیید:{" "}
                    {money(
                      item.pending,
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    () => {
                      void openDetail(
                        item.id,
                      );
                    }
                  }
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] text-xs font-black text-[var(--text)]"
                >
                  <Eye className="size-4" />
                  مشاهده حساب و پرداخت
                </button>
              </article>
            ),
          )}
        </div>
      )}

      {(detail ||
        detailLoading) && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
          <button
            type="button"
            onClick={
              () => {
                setDetail(
                  null,
                );

                setPaymentOpen(
                  false,
                );
              }
            }
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />

          <div className="relative max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            {detailLoading ||
            !detail ? (
              <div className="p-20 text-center">
                <LoaderCircle className="mx-auto size-7 animate-spin text-[var(--brand)]" />
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                  <div>
                    <p className="text-base font-black">
                      حساب{" "}
                      {detail.employee
                        .fullName}
                    </p>

                    <p
                      dir="ltr"
                      className="mt-1 text-right text-xs text-[var(--muted)]"
                    >
                      {detail.employee
                        .phone}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      () =>
                        setDetail(
                          null,
                        )
                    }
                    className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <DetailMoney
                      label="درآمد قطعی"
                      value={
                        detail.totals
                          .earned
                      }
                    />

                    <DetailMoney
                      label="در انتظار"
                      value={
                        detail.totals
                          .pending
                      }
                    />

                    <DetailMoney
                      label="پرداخت‌شده"
                      value={
                        detail.totals
                          .paid
                      }
                    />

                    <DetailMoney
                      label="مانده قابل پرداخت"
                      value={
                        detail.totals
                          .balance
                      }
                      strong
                    />
                  </div>

                  <button
                    type="button"
                    disabled={
                      BigInt(
                        detail.totals
                          .balance,
                      ) <=
                      BigInt(0)
                    }
                    onClick={
                      startPayment
                    }
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CreditCard className="size-4" />
                    ثبت پرداخت جدید
                  </button>

                  {detail.employee
                    .compensationType ===
                    "FIXED_MONTHLY" &&
                    detail.monthlySalaries
                      .length >
                      0 && (
                      <section>
                        <p className="mb-3 text-sm font-black">
                          حقوق‌های ماهانه ثبت‌شده
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {detail.monthlySalaries.map(
                            (
                              salary,
                            ) => (
                              <div
                                key={
                                  salary.id
                                }
                                className="rounded-2xl bg-[var(--surface-soft)] p-3"
                              >
                                <p className="text-xs font-black">
                                  {money(
                                    salary.amount,
                                  )}
                                </p>

                                <p className="mt-1 text-[9px] text-[var(--muted)]">
                                  ماه{" "}
                                  {new Intl.NumberFormat(
                                    "fa-IR",
                                  ).format(
                                    salary.month,
                                  )}
                                  {" / "}
                                  {new Intl.NumberFormat(
                                    "fa-IR",
                                  ).format(
                                    salary.year,
                                  )}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </section>
                    )}

                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <ReceiptText className="size-4 text-[var(--brand)]" />

                      <p className="text-sm font-black">
                        سابقه پرداخت‌ها
                      </p>
                    </div>

                    {detail.payments.length ===
                    0 ? (
                      <div className="rounded-2xl bg-[var(--surface-soft)] p-5 text-center text-xs text-[var(--muted)]">
                        هنوز پرداختی ثبت نشده است.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.payments.map(
                          (
                            payment,
                          ) => (
                            <article
                              key={
                                payment.id
                              }
                              className="rounded-[20px] border border-[var(--line)] p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-black text-[var(--brand)]">
                                    {money(
                                      payment.amount,
                                    )}
                                  </p>

                                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                                    {paymentMethodLabel[
                                      payment.paymentMethod
                                    ]}
                                    {" · "}
                                    {dateTime(
                                      payment.paidAt,
                                    )}
                                  </p>
                                </div>

                                {payment.hasReceipt && (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        receiptBusyId ===
                                        payment.id
                                      }
                                      onClick={
                                        () => {
                                          void openReceipt(
                                            payment.id,
                                          );
                                        }
                                      }
                                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-[10px] font-black text-[var(--muted)] disabled:opacity-50"
                                    >
                                      <Eye className="size-3.5" />
                                      مشاهده رسید
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        receiptBusyId ===
                                        payment.id
                                      }
                                      onClick={
                                        () => {
                                          void shareReceipt(
                                            payment.id,
                                          );
                                        }
                                      }
                                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand-soft)] px-3 text-[10px] font-black text-[var(--brand)] disabled:opacity-50"
                                    >
                                      <Send className="size-3.5" />
                                      ارسال / اشتراک
                                    </button>
                                  </div>
                                )}
                              </div>

                              {payment.note && (
                                <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-[10px] leading-5 text-[var(--muted)]">
                                  {payment.note}
                                </p>
                              )}

                              {payment.hasReceipt && (
                                <p className="mt-2 flex items-center gap-1 text-[9px] text-emerald-700">
                                  <CheckCircle2 className="size-3" />
                                  رسید پرداخت ثبت شده
                                </p>
                              )}
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {paymentOpen &&
        detail && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-5">
            <button
              type="button"
              onClick={
                () =>
                  setPaymentOpen(
                    false,
                  )
              }
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            />

            <div className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
              <div className="flex items-start justify-between border-b border-[var(--line)] px-5 py-4">
                <div>
                  <p className="text-base font-black">
                    ثبت پرداخت
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    برای{" "}
                    {detail.employee
                      .fullName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    () =>
                      setPaymentOpen(
                        false,
                      )
                  }
                  className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                onSubmit={
                  submitPayment
                }
                className="space-y-4 p-5 sm:p-6"
              >
                <div className="rounded-2xl bg-[var(--brand-soft)] p-4">
                  <p className="text-[10px] font-bold text-[var(--brand)]">
                    مانده قابل پرداخت
                  </p>

                  <p className="mt-1 text-lg font-black text-[var(--brand)]">
                    {money(
                      detail.totals
                        .balance,
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black">
                    مبلغ پرداخت
                  </label>

                  <input
                    dir="ltr"
                    inputMode="numeric"
                    value={
                      amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setAmount(
                        event.target
                          .value
                          .replace(
                            /\D/g,
                            "",
                          ),
                      )
                    }
                    className={
                      inputClass
                    }
                    placeholder="مبلغ به تومان"
                  />

                  {amount && (
                    <p className="mt-2 text-xs font-black text-[var(--brand)]">
                      {money(
                        amount,
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black">
                    روش پرداخت
                  </label>

                  <select
                    value={
                      method
                    }
                    onChange={(
                      event,
                    ) =>
                      setMethod(
                        event.target
                          .value as
                          PaymentMethod,
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="CARD_TO_CARD">
                      کارت‌به‌کارت
                    </option>

                    <option value="BANK_TRANSFER">
                      انتقال بانکی
                    </option>

                    <option value="CASH">
                      نقدی
                    </option>

                    <option value="OTHER">
                      سایر
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black">
                    رسید پرداخت
                  </label>

                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] p-5 text-center transition hover:border-[var(--brand)]">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={
                        changeReceipt
                      }
                      className="hidden"
                    />

                    {receipt ? (
                      <>
                        <FileImage className="size-6 text-[var(--brand)]" />

                        <p className="mt-2 max-w-full truncate text-xs font-black">
                          {receipt.name}
                        </p>

                        <p className="mt-1 text-[9px] text-[var(--muted)]">
                          برای تغییر، دوباره انتخاب کنید
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="size-6 text-[var(--brand)]" />

                        <p className="mt-2 text-xs font-black">
                          عکس یا PDF رسید را انتخاب کنید
                        </p>

                        <p className="mt-1 text-[9px] text-[var(--muted)]">
                          JPG / PNG / PDF تا ۵MB
                        </p>
                      </>
                    )}
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black">
                    توضیحات
                  </label>

                  <textarea
                    rows={
                      3
                    }
                    value={
                      note
                    }
                    maxLength={
                      1000
                    }
                    onChange={(
                      event,
                    ) =>
                      setNote(
                        event.target
                          .value,
                      )
                    }
                    className="w-full resize-none rounded-2xl border border-[var(--line)] bg-white p-4 text-sm leading-7 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                    placeholder="مثلاً کارت‌به‌کارت بابت تسویه هفته..."
                  />
                </div>

                <div className="rounded-2xl bg-amber-50 p-4 text-[10px] font-bold leading-6 text-amber-800">
                  با ثبت پرداخت، مبلغ به سابقه مالی اضافه می‌شود و مانده حساب شخص به همان اندازه کاهش پیدا می‌کند. سابقه حذف نمی‌شود.
                </div>

                <button
                  type="submit"
                  disabled={
                    paymentSaving
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:opacity-50"
                >
                  {paymentSaving ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <Banknote className="size-4" />
                      ثبت پرداخت
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
    </section>
  );
}

function SummaryBox({
  label,
  value,
  strong =
    false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
      <p className="text-[9px] text-[var(--muted)]">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-black ${
          strong
            ? "text-[var(--brand)]"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MoneyBox({
  label,
  value,
  strong =
    false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-soft)] p-3">
      <p className="text-[8px] text-[var(--muted)]">
        {label}
      </p>

      <p
        className={`mt-1 text-[10px] font-black ${
          strong
            ? "text-[var(--brand)]"
            : ""
        }`}
      >
        {money(
          value,
        )}
      </p>
    </div>
  );
}

function DetailMoney({
  label,
  value,
  strong =
    false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] p-4 ${
        strong
          ? "bg-[#102827] text-white"
          : "bg-[var(--surface-soft)]"
      }`}
    >
      <p
        className={`text-[9px] ${
          strong
            ? "text-white/50"
            : "text-[var(--muted)]"
        }`}
      >
        {label}
      </p>

      <p className="mt-1 text-sm font-black">
        {money(
          value,
        )}
      </p>
    </div>
  );
}