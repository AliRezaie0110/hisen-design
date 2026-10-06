"use client";

import {
  Clock3,
  Edit3,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  changeOperationRate,
  createOperation,
  deleteOperation,
  getOperation,
  listOperations,
  managerError,
  OperationDetail,
  OperationItem,
  updateOperation,
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

function date(
  value:
    string | null,
): string {
  if (!value) {
    return "—";
  }

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
        `${value}T12:00:00`,
      ),
    );
  } catch {
    return value;
  }
}

export function OperationsSection() {
  const [
    items,
    setItems,
  ] =
    useState<
      OperationItem[]
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
    saving,
    setSaving,
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
    createOpen,
    setCreateOpen,
  ] =
    useState(
      false,
    );

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    initialRate,
    setInitialRate,
  ] =
    useState("");

  const [
    detailOpen,
    setDetailOpen,
  ] =
    useState(
      false,
    );

  const [
    detail,
    setDetail,
  ] =
    useState<OperationDetail | null>(
      null,
    );

  const [
    editName,
    setEditName,
  ] =
    useState("");

  const [
    newRate,
    setNewRate,
  ] =
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
          const response =
            await listOperations(
              true,
            );

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
      [],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );

  async function create(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (
      !name.trim()
    ) {
      setError(
        "نام عملیات را وارد کنید.",
      );

      return;
    }

    if (
      !/^[1-9]\d*$/.test(
        initialRate,
      )
    ) {
      setError(
        "نرخ اولیه را به‌صورت عدد صحیح وارد کنید.",
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
      await createOperation({
        name:
          name.trim(),

        initialRate,
      });

      setName("");
      setInitialRate("");
      setCreateOpen(
        false,
      );

      await load(
        true,
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
      setSaving(
        false,
      );
    }
  }

  async function openDetail(
    item:
      OperationItem,
  ) {
    setError(
      null,
    );

    try {
      const response =
        await getOperation(
          item.id,
        );

      setDetail(
        response,
      );

      setEditName(
        response.name,
      );

      setNewRate(
        response.currentRate ??
          "",
      );

      setDetailOpen(
        true,
      );
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    }
  }

  async function saveName() {
    if (
      !detail ||
      !editName.trim()
    ) {
      return;
    }

    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      await updateOperation(
        detail.id,
        {
          name:
            editName.trim(),
        },
      );

      const refreshed =
        await getOperation(
          detail.id,
        );

      setDetail(
        refreshed,
      );

      setEditName(
        refreshed.name,
      );

      await load(
        true,
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
      setSaving(
        false,
      );
    }
  }

  async function saveRate() {
    if (
      !detail ||
      !/^[1-9]\d*$/.test(
        newRate,
      )
    ) {
      setError(
        "نرخ جدید را به‌صورت عدد صحیح وارد کنید.",
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
      await changeOperationRate(
        detail.id,
        newRate,
      );

      const refreshed =
        await getOperation(
          detail.id,
        );

      setDetail(
        refreshed,
      );

      setNewRate(
        refreshed.currentRate ??
          "",
      );

      await load(
        true,
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
      setSaving(
        false,
      );
    }
  }

  async function toggle(
    item:
      OperationItem,
  ) {
    setError(
      null,
    );

    try {
      await updateOperation(
        item.id,
        {
          isActive:
            !item.isActive,
        },
      );

      await load(
        true,
      );
    } catch (
      caught
    ) {
      setError(
        managerError(
          caught,
        ),
      );
    }
  }

  async function remove(
    item: OperationItem,
  ) {
    const confirmed =
      window.confirm(
        `عملیات «${item.name}» حذف شود؟ اگر سابقه داشته باشد فقط غیرفعال می‌شود.`,
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteOperation(
        item.id,
      );

      await load(true);
    } catch (caught) {
      setError(
        managerError(caught),
      );
    }
  }

  const activeCount =
    items.filter(
      (
        item,
      ) =>
        item.isActive,
    ).length;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">
            عملیات و نرخ‌ها
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            عملیات تولید یک‌بار تعریف می‌شود و در همه سری‌کارهای بعدی قابل استفاده است؛ نرخ‌های قبلی هم حفظ می‌شوند.
          </p>
        </div>

        <div className="flex gap-2">
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
            className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)]"
          >
            <RefreshCw
              className={`size-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={
              () =>
                setCreateOpen(
                  true,
                )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-black text-white"
          >
            <Plus className="size-4" />
            عملیات جدید
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
          <p className="text-[10px] text-[var(--muted)]">
            کل عملیات
          </p>

          <p className="mt-1 text-xl font-black">
            {new Intl.NumberFormat(
              "fa-IR",
            ).format(
              items.length,
            )}
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
          <p className="text-[10px] text-[var(--muted)]">
            عملیات فعال
          </p>

          <p className="mt-1 text-xl font-black text-emerald-700">
            {new Intl.NumberFormat(
              "fa-IR",
            ).format(
              activeCount,
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[26px] border border-[var(--line)] bg-white p-14 text-center">
          <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--brand)]" />
        </div>
      ) : items.length ===
        0 ? (
        <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white p-12 text-center">
          <Scissors className="mx-auto size-8 text-slate-300" />

          <p className="mt-4 text-sm font-black">
            هنوز عملیاتی تعریف نشده
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            عملیات‌هایی مثل زیپ، جیب و راسته‌دوزی را اینجا تعریف کنید.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map(
            (
              item,
            ) => (
              <article
                key={
                  item.id
                }
                className={`rounded-[24px] border bg-white p-5 ${
                  item.isActive
                    ? "border-[var(--line)]"
                    : "border-slate-200 opacity-65"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Scissors className="size-5" />
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

                <h3 className="mt-4 text-sm font-black">
                  {item.name}
                </h3>

                <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] p-4">
                  <p className="text-[9px] text-[var(--muted)]">
                    نرخ فعلی هر عدد
                  </p>

                  <p className="mt-1 text-base font-black text-[var(--brand)]">
                    {item.currentRate
                      ? money(
                          item.currentRate,
                        )
                      : "بدون نرخ"}
                  </p>

                  {item.currentRateEffectiveFrom && (
                    <p className="mt-2 flex items-center gap-1 text-[9px] text-[var(--muted)]">
                      <Clock3 className="size-3" />
                      از{" "}
                      {date(
                        item.currentRateEffectiveFrom,
                      )}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={
                      () => {
                        void openDetail(
                          item,
                        );
                      }
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-xs font-black text-[var(--muted)]"
                  >
                    <History className="size-3.5" />
                    نرخ و سابقه
                  </button>

                  <button
                    type="button"
                    onClick={
                      () => {
                        void remove(
                          item,
                        );
                      }
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-black text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                    حذف
                  </button>

                  <button
                    type="button"
                    onClick={
                      () => {
                        void toggle(
                          item,
                        );
                      }
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-xs font-black text-[var(--muted)]"
                  >
                    {item.isActive ? (
                      <ToggleRight className="size-4 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="size-4" />
                    )}

                    {item.isActive
                      ? "غیرفعال"
                      : "فعال"}
                  </button>
                </div>
              </article>
            ),
          )}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
          <button
            type="button"
            onClick={
              () =>
                setCreateOpen(
                  false,
                )
            }
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-xl rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-base font-black">
                  عملیات جدید
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  عملیات همراه با نرخ اولیه وارد کاتالوگ اصلی می‌شود.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setCreateOpen(
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
                create
              }
              className="space-y-4 p-5 sm:p-6"
            >
              <div>
                <label className="mb-2 block text-xs font-black">
                  نام عملیات
                </label>

                <input
                  value={
                    name
                  }
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event.target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="مثلاً جیب"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black">
                  نرخ اولیه هر عدد
                </label>

                <input
                  dir="ltr"
                  inputMode="numeric"
                  value={
                    initialRate
                  }
                  onChange={(
                    event,
                  ) =>
                    setInitialRate(
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
                  placeholder="15000"
                />

                {initialRate && (
                  <p className="mt-2 text-xs font-black text-[var(--brand)]">
                    {money(
                      initialRate,
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white disabled:opacity-50"
              >
                {saving && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}

                ثبت عملیات
              </button>
            </form>
          </div>
        </div>
      )}

      {detailOpen &&
        detail && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
            <button
              type="button"
              onClick={
                () =>
                  setDetailOpen(
                    false,
                  )
              }
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <div className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur">
                <div>
                  <p className="text-base font-black">
                    {detail.name}
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    ویرایش نام، نرخ فعلی و تاریخچه نرخ‌ها
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    () =>
                      setDetailOpen(
                        false,
                      )
                  }
                  className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="rounded-[22px] border border-[var(--line)] p-4">
                  <label className="mb-2 block text-xs font-black">
                    نام عملیات
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={
                        editName
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditName(
                          event.target
                            .value,
                        )
                      }
                      className={
                        inputClass
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        () => {
                          void saveName();
                        }
                      }
                      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-black text-white disabled:opacity-50"
                    >
                      <Edit3 className="size-3.5" />
                      ذخیره
                    </button>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--line)] p-4">
                  <label className="mb-2 block text-xs font-black">
                    نرخ جدید
                  </label>

                  <div className="flex gap-2">
                    <input
                      dir="ltr"
                      inputMode="numeric"
                      value={
                        newRate
                      }
                      onChange={(
                        event,
                      ) =>
                        setNewRate(
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
                    />

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        () => {
                          void saveRate();
                        }
                      }
                      className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-black text-white disabled:opacity-50"
                    >
                      <RefreshCw className="size-3.5" />
                      تغییر نرخ
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">
                    تغییر نرخ، درآمد کارهای قبلاً ثبت‌شده را تغییر نمی‌دهد.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-sm font-black">
                    تاریخچه نرخ‌ها
                  </p>

                  {detail.rateHistory.length ===
                  0 ? (
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-xs text-[var(--muted)]">
                      سابقه نرخی وجود ندارد.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.rateHistory.map(
                        (
                          rate,
                        ) => (
                          <div
                            key={
                              rate.id
                            }
                            className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface-soft)] p-4"
                          >
                            <div>
                              <p className="text-sm font-black">
                                {money(
                                  rate.amount,
                                )}
                              </p>

                              <p className="mt-1 text-[9px] text-[var(--muted)]">
                                شروع:{" "}
                                {date(
                                  rate.effectiveFrom,
                                )}
                              </p>
                            </div>

                            <span className="text-[10px] font-bold text-[var(--muted)]">
                              {rate.effectiveTo
                                ? `تا ${date(
                                    rate.effectiveTo,
                                  )}`
                                : "نرخ جاری"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
