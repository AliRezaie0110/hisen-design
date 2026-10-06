"use client";

import {
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Scissors,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  listPendingTimeEntries,
  listPendingWorkEntries,
  managerError,
  PendingTimeEntry,
  PendingWorkEntry,
  reviewTimeEntry,
  reviewWorkEntry,
} from "@/lib/manager-api";

type Tab =
  | "work"
  | "time";

type ReviewTarget =
  | {
      kind: "work";
      entry:
        PendingWorkEntry;

      decision:
        | "approve"
        | "reject";
    }
  | {
      kind: "time";
      entry:
        PendingTimeEntry;

      decision:
        | "approve"
        | "reject";
    };

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

function date(
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

function duration(
  minutes:
    number,
): string {
  const hours =
    Math.floor(
      minutes /
        60,
    );

  const rest =
    minutes %
    60;

  if (
    hours ===
    0
  ) {
    return `${number(
      rest,
    )} دقیقه`;
  }

  if (
    rest ===
    0
  ) {
    return `${number(
      hours,
    )} ساعت`;
  }

  return `${number(
    hours,
  )} ساعت و ${number(
    rest,
  )} دقیقه`;
}

export function ApprovalsSection() {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "work",
    );

  const [
    work,
    setWork,
  ] =
    useState<
      PendingWorkEntry[]
    >([]);

  const [
    time,
    setTime,
  ] =
    useState<
      PendingTimeEntry[]
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
    target,
    setTarget,
  ] =
    useState<
      ReviewTarget | null
    >(null);

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
          const [
            workResponse,
            timeResponse,
          ] =
            await Promise.all([
              listPendingWorkEntries(),
              listPendingTimeEntries(),
            ]);

          setWork(
            workResponse.items,
          );

          setTime(
            timeResponse.items,
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

  function openReview(
    next:
      ReviewTarget,
  ) {
    setTarget(
      next,
    );

    setNote("");
    setError(
      null,
    );
  }

  async function submitReview(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    if (
      !target
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
      if (
        target.kind ===
        "work"
      ) {
        await reviewWorkEntry(
          target.entry.id,
          target.decision,
          note,
        );
      } else {
        await reviewTimeEntry(
          target.entry.id,
          target.decision,
          note,
        );
      }

      setTarget(
        null,
      );

      setNote("");

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

  const total =
    work.length +
    time.length;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">
            تأییدها
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            کارهای دانه‌ای و ساعت‌های ثبت‌شده‌ای که هنوز در انتظار بررسی مدیر هستند.
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
        <Stat
          label="کل انتظار"
          value={
            total
          }
        />

        <Stat
          label="کار دانه‌ای"
          value={
            work.length
          }
        />

        <Stat
          label="ساعت کاری"
          value={
            time.length
          }
        />
      </div>

      <div className="mb-4 flex gap-2 rounded-[20px] border border-[var(--line)] bg-white p-1.5">
        <button
          type="button"
          onClick={
            () =>
              setTab(
                "work",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black ${
            tab ===
            "work"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <Scissors className="size-4" />

          کار دانه‌ای

          {work.length >
            0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px]">
              {number(
                work.length,
              )}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={
            () =>
              setTab(
                "time",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black ${
            tab ===
            "time"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <Clock3 className="size-4" />

          ساعت کاری

          {time.length >
            0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px]">
              {number(
                time.length,
              )}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[26px] border border-[var(--line)] bg-white p-14 text-center">
          <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--brand)]" />
        </div>
      ) : tab ===
        "work" ? (
        <WorkApprovals
          items={
            work
          }
          onReview={
            openReview
          }
        />
      ) : (
        <TimeApprovals
          items={
            time
          }
          onReview={
            openReview
          }
        />
      )}

      {target && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-5">
          <button
            type="button"
            onClick={
              () =>
                setTarget(
                  null,
                )
            }
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-lg rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-base font-black">
                  {target.decision ===
                  "approve"
                    ? "تأیید ثبت"
                    : "رد ثبت"}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {target.kind ===
                  "work"
                    ? target.entry
                        .worker
                        .fullName
                    : target.entry
                        .employee
                        .fullName}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setTarget(
                      null,
                    )
                }
                className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={
                submitReview
              }
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-2 block text-xs font-black">
                  یادداشت مدیر
                </label>

                <textarea
                  rows={
                    4
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
                  placeholder={
                    target.decision ===
                    "approve"
                      ? "اختیاری..."
                      : "دلیل رد را بنویسید..."
                  }
                />
              </div>

              <button
                type="submit"
                disabled={
                  saving
                }
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white disabled:opacity-50 ${
                  target.decision ===
                  "approve"
                    ? "bg-[var(--brand)]"
                    : "bg-red-600"
                }`}
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : target.decision ===
                  "approve" ? (
                  <Check className="size-4" />
                ) : (
                  <X className="size-4" />
                )}

                {target.decision ===
                "approve"
                  ? "تأیید نهایی"
                  : "رد ثبت"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function WorkApprovals({
  items,
  onReview,
}: {
  items:
    PendingWorkEntry[];

  onReview:
    (
      target:
        ReviewTarget,
    ) => void;
}) {
  if (
    items.length ===
    0
  ) {
    return (
      <Empty
        text="هیچ کار دانه‌ای در انتظار تأیید نیست."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map(
        (
          entry,
        ) => (
          <article
            key={
              entry.id
            }
            className="rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black">
                  {entry.worker
                    .fullName}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {entry.batchCode}
                  {entry.modelName
                    ? ` · ${entry.modelName}`
                    : ""}
                  {" · "}
                  {entry.operationName}
                  {" · سایز "}
                  {entry.sizeLabel}
                </p>
              </div>

              <p className="text-sm font-black text-[var(--brand)]">
                {money(
                  entry.totalAmount,
                )}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Info
                label="تعداد ثبت"
                value={`${number(
                  entry.quantity,
                )} عدد`}
              />

              <Info
                label="نرخ هر عدد"
                value={
                  money(
                    entry.unitRate,
                  )
                }
              />

              <Info
                label="تأییدشده قبلی"
                value={`${number(
                  entry.approvedQuantity,
                )} عدد`}
              />

              <Info
                label="ظرفیت باقی"
                value={`${number(
                  entry.remainingQuantity,
                )} عدد`}
              />
            </div>

            {entry.workerNote && (
              <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-[10px] leading-5 text-[var(--muted)]">
                {entry.workerNote}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={
                  () =>
                    onReview({
                      kind:
                        "work",

                      entry,

                      decision:
                        "reject",
                    })
                }
                className="h-11 rounded-xl border border-red-100 bg-red-50 text-xs font-black text-red-700"
              >
                رد
              </button>

              <button
                type="button"
                onClick={
                  () =>
                    onReview({
                      kind:
                        "work",

                      entry,

                      decision:
                        "approve",
                    })
                }
                className="h-11 rounded-xl bg-[var(--brand)] text-xs font-black text-white"
              >
                تأیید
              </button>
            </div>
          </article>
        ),
      )}
    </div>
  );
}

function TimeApprovals({
  items,
  onReview,
}: {
  items:
    PendingTimeEntry[];

  onReview:
    (
      target:
        ReviewTarget,
    ) => void;
}) {
  if (
    items.length ===
    0
  ) {
    return (
      <Empty
        text="هیچ ساعت کاری در انتظار تأیید نیست."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map(
        (
          entry,
        ) => (
          <article
            key={
              entry.id
            }
            className="rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black">
                  {entry.employee
                    .fullName}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {entry.employee.role ===
                  "SUPERVISOR"
                    ? "سرپرست"
                    : "وردست"}
                  {" · "}
                  {date(
                    entry.workDate,
                  )}
                </p>
              </div>

              <p className="text-sm font-black text-[var(--brand)]">
                {duration(
                  entry.minutesWorked,
                )}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Info
                label="مدت کار"
                value={
                  duration(
                    entry.minutesWorked,
                  )
                }
              />

              <Info
                label="حقوق ماهانه فعلی"
                value={
                  entry.defaultMonthlySalary
                    ? money(
                        entry.defaultMonthlySalary,
                      )
                    : "—"
                }
              />

              <Info
                label="تاریخ کار"
                value={
                  date(
                    entry.workDate,
                  )
                }
              />
            </div>

            {entry.note && (
              <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-[10px] leading-5 text-[var(--muted)]">
                {entry.note}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={
                  () =>
                    onReview({
                      kind:
                        "time",

                      entry,

                      decision:
                        "reject",
                    })
                }
                className="h-11 rounded-xl border border-red-100 bg-red-50 text-xs font-black text-red-700"
              >
                رد
              </button>

              <button
                type="button"
                onClick={
                  () =>
                    onReview({
                      kind:
                        "time",

                      entry,

                      decision:
                        "approve",
                    })
                }
                className="h-11 rounded-xl bg-[var(--brand)] text-xs font-black text-white"
              >
                تأیید
              </button>
            </div>
          </article>
        ),
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
      <p className="text-[9px] text-[var(--muted)]">
        {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {number(
          value,
        )}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-soft)] p-3">
      <p className="text-[8px] text-[var(--muted)]">
        {label}
      </p>

      <p className="mt-1 text-[10px] font-black">
        {value}
      </p>
    </div>
  );
}

function Empty({
  text,
}: {
  text:
    string;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white p-12 text-center">
      <ShieldCheck className="mx-auto size-8 text-emerald-500" />

      <p className="mt-4 text-sm font-black">
        چیزی در انتظار نیست
      </p>

      <p className="mt-2 text-xs text-[var(--muted)]">
        {text}
      </p>
    </div>
  );
}
