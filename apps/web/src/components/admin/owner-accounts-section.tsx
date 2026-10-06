"use client";

import {
  Banknote,
  BriefcaseBusiness,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getOwnerAccount,
  listOwnerAccounts,
  managerError,
  OwnerAccountDetail,
  OwnerAccountSummary,
  recordOwnerPayment,
} from "@/lib/manager-api";

const inputClass =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-bold outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

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

function number(
  value:
    number,
): string {
  return new Intl.NumberFormat(
    "fa-IR",
  ).format(
    value,
  );
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

export function OwnerAccountsSection() {
  const [
    items,
    setItems,
  ] =
    useState<
      OwnerAccountSummary[]
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
      OwnerAccountDetail |
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
    workBatchId,
    setWorkBatchId,
  ] =
    useState("");

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

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
            await listOwnerAccounts({
              q:
                q.trim() ||
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

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      load,
    ],
  );

  async function openDetail(
    ownerId:
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
        await getOwnerAccount(
          ownerId,
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
    if (!detail) {
      return;
    }

    const response =
      await getOwnerAccount(
        detail.owner.id,
      );

    setDetail(
      response,
    );
  }

  function startPayment() {
    if (
      !detail ||
      BigInt(
        detail.totals
          .balance,
      ) <=
        BigInt(0)
    ) {
      setError(
        "مانده‌ای برای ثبت دریافت وجود ندارد.",
      );

      return;
    }

    setAmount("");
    setWorkBatchId("");
    setNote("");

    setPaymentOpen(
      true,
    );
  }

  const selectedBatch =
    detail?.batches.find(
      (
        batch,
      ) =>
        batch.id ===
        workBatchId,
    ) ??
    null;

  async function submitPayment(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (!detail) {
      return;
    }

    if (
      !/^[1-9]\d*$/.test(
        amount,
      )
    ) {
      setError(
        "مبلغ دریافتی را به‌صورت عدد صحیح وارد کنید.",
      );

      return;
    }

    const maximum =
      selectedBatch
        ? selectedBatch.balance
        : detail.totals.balance;

    if (
      BigInt(
        amount,
      ) >
      BigInt(
        maximum,
      )
    ) {
      setError(
        `حداکثر مبلغ قابل ثبت ${money(
          maximum,
        )} است.`,
      );

      return;
    }

    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      await recordOwnerPayment(
        detail.owner.id,
        {
          amount,

          ...(workBatchId
            ? {
                workBatchId,
              }
            : {}),

          ...(note.trim()
            ? {
                note:
                  note.trim(),
              }
            : {}),
        },
      );

      setPaymentOpen(
        false,
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
      setSaving(
        false,
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

  const totalReceived =
    items.reduce(
      (
        total,
        item,
      ) =>
        total +
        BigInt(
          item.received,
        ),
      BigInt(0),
    );

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">
            حساب صاحبکارها
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            مبلغ قرارداد سری‌ها، دریافتی‌ها و مانده حساب هر صاحبکار.
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

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Summary
          label="صاحبکار"
          value={
            number(
              items.length,
            )
          }
        />

        <Summary
          label="کل دریافتی"
          value={
            money(
              totalReceived.toString(),
            )
          }
        />

        <Summary
          label="کل مانده"
          value={
            money(
              totalBalance.toString(),
            )
          }
          strong
        />
      </div>

      <div className="mb-4 grid gap-2 rounded-[22px] border border-[var(--line)] bg-white p-3 md:grid-cols-[1fr_170px]">
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
            placeholder="جست‌وجوی صاحبکار..."
          />
        </div>

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
          <BriefcaseBusiness className="mx-auto size-8 text-slate-300" />

          <p className="mt-4 text-sm font-black">
            حساب صاحبکاری پیدا نشد
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
                  <div>
                    <p className="text-sm font-black">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {number(
                        item.batchCount,
                      )} سری‌کار
                    </p>
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
                  <Money
                    label="طلب تولیدی"
                    value={
                      item.due
                    }
                  />

                  <Money
                    label="دریافت‌شده"
                    value={
                      item.received
                    }
                  />

                  <Money
                    label="مانده"
                    value={
                      item.balance
                    }
                    strong
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    () => {
                      void openDetail(
                        item.id,
                      );
                    }
                  }
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--surface-soft)] text-xs font-black"
                >
                  <WalletCards className="size-4" />
                  مشاهده حساب
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
              () =>
                setDetail(
                  null,
                )
            }
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />

          <div className="relative max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            {detailLoading ||
            !detail ? (
              <div className="p-20 text-center">
                <LoaderCircle className="mx-auto size-7 animate-spin text-[var(--brand)]" />
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur">
                  <div>
                    <p className="text-base font-black">
                      حساب{" "}
                      {detail.owner
                        .name}
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {number(
                        detail.batches
                          .length,
                      )} سری‌کار
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
                      label="جمع قرارداد"
                      value={
                        detail.totals
                          .due
                      }
                    />

                    <DetailMoney
                      label="دریافت‌شده"
                      value={
                        detail.totals
                          .received
                      }
                    />

                    <DetailMoney
                      label="دریافتی بدون سری"
                      value={
                        detail.totals
                          .unallocatedReceived
                      }
                    />

                    <DetailMoney
                      label="مانده حساب"
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                    ثبت دریافتی جدید
                  </button>

                  <section>
                    <p className="mb-3 text-sm font-black">
                      سری‌کارها
                    </p>

                    <div className="space-y-2">
                      {detail.batches.map(
                        (
                          batch,
                        ) => (
                          <article
                            key={
                              batch.id
                            }
                            className="rounded-[20px] border border-[var(--line)] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black">
                                  {batch.code}
                                </p>

                                <p className="mt-1 text-[10px] text-[var(--muted)]">
                                  {batch.modelName
                                    ? `${batch.modelName} · `
                                    : ""}
                                  {number(
                                    batch.totalQuantity,
                                  )} عدد
                                </p>
                              </div>

                              <p className="text-xs font-black text-[var(--brand)]">
                                مانده{" "}
                                {money(
                                  batch.balance,
                                )}
                              </p>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <Money
                                label="مبلغ"
                                value={
                                  batch.due
                                }
                              />

                              <Money
                                label="دریافت"
                                value={
                                  batch.received
                                }
                              />

                              <Money
                                label="مانده"
                                value={
                                  batch.balance
                                }
                                strong
                              />
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>

                  <section>
                    <p className="mb-3 text-sm font-black">
                      سابقه دریافتی‌ها
                    </p>

                    {detail.payments.length ===
                    0 ? (
                      <div className="rounded-2xl bg-[var(--surface-soft)] p-5 text-center text-xs text-[var(--muted)]">
                        هنوز دریافتی ثبت نشده است.
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
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-emerald-700">
                                    {money(
                                      payment.amount,
                                    )}
                                  </p>

                                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                                    {dateTime(
                                      payment.paidAt,
                                    )}
                                  </p>
                                </div>

                                <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-black">
                                  {payment.batch
                                    ? payment.batch
                                        .code
                                    : "کلی"}
                                </span>
                              </div>

                              {payment.note && (
                                <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">
                                  {payment.note}
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
              className="absolute inset-0 bg-slate-950/55"
            />

            <div className="relative w-full max-w-xl rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div>
                  <p className="text-base font-black">
                    ثبت دریافتی
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {detail.owner
                      .name}
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
                className="space-y-4 p-5"
              >
                <div>
                  <label className="mb-2 block text-xs font-black">
                    سری‌کار
                  </label>

                  <select
                    value={
                      workBatchId
                    }
                    onChange={(
                      event,
                    ) =>
                      setWorkBatchId(
                        event.target
                          .value,
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      بدون اتصال به سری خاص
                    </option>

                    {detail.batches
                      .filter(
                        (
                          batch,
                        ) =>
                          BigInt(
                            batch.balance,
                          ) >
                          BigInt(0),
                      )
                      .map(
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
                            {" — "}
                            {money(
                              batch.balance,
                            )}
                          </option>
                        ),
                      )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black">
                    مبلغ دریافتی
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

                  <p className="mt-2 text-[10px] text-[var(--muted)]">
                    سقف قابل ثبت:{" "}
                    <b className="text-[var(--brand)]">
                      {money(
                        selectedBatch
                          ? selectedBatch.balance
                          : detail.totals
                              .balance,
                      )}
                    </b>
                  </p>
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
                    onChange={(
                      event,
                    ) =>
                      setNote(
                        event.target
                          .value,
                      )
                    }
                    maxLength={
                      1000
                    }
                    className="w-full resize-none rounded-2xl border border-[var(--line)] p-4 text-sm leading-7 outline-none focus:border-[var(--brand)]"
                    placeholder="اختیاری..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Banknote className="size-4" />
                  )}

                  ثبت دریافتی
                </button>
              </form>
            </div>
          </div>
        )}
    </section>
  );
}

function Summary({
  label,
  value,
  strong =
    false,
}: {
  label:
    string;

  value:
    string;

  strong?:
    boolean;
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

function Money({
  label,
  value,
  strong =
    false,
}: {
  label:
    string;

  value:
    string;

  strong?:
    boolean;
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
  label:
    string;

  value:
    string;

  strong?:
    boolean;
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
