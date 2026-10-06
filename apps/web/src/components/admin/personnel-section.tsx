"use client";

import {
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  UserRole,
} from "@/lib/auth";

import {
  ProfileAvatar,
} from "@/components/profile/profile-avatar";

import {
  createPersonnel,
  listPersonnel,
  managerError,
  PersonnelInput,
  PersonnelItem,
  setPersonnelActive,
  updatePersonnel,
} from "@/lib/manager-api";

const roleLabel: Record<
  UserRole,
  string
> = {
  MANAGER:
    "مدیر",

  SUPERVISOR:
    "سرپرست",

  ASSISTANT:
    "وردست",

  WORKER:
    "همکار",
};

const inputClass =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--text)] outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

type FormState = {
  fullName: string;
  phone: string;
  role: UserRole;
  salary: string;
};

const blank: FormState = {
  fullName:
    "",
  phone:
    "",
  role:
    "WORKER",
  salary:
    "",
};

function formatMoney(
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

export function PersonnelSection() {
  const [
    items,
    setItems,
  ] =
    useState<
      PersonnelItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
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
      UserRole | ""
    >("");

  const [
    active,
    setActive,
  ] =
    useState<
      "" | "true" | "false"
    >("");

  const [
    open,
    setOpen,
  ] =
    useState(
      false,
    );

  const [
    editing,
    setEditing,
  ] =
    useState<PersonnelItem | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      blank,
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
            await listPersonnel({
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

  function openCreate() {
    setEditing(
      null,
    );

    setForm(
      blank,
    );

    setError(
      null,
    );

    setOpen(
      true,
    );
  }

  function openEdit(
    item:
      PersonnelItem,
  ) {
    if (
      item.role ===
      "MANAGER"
    ) {
      return;
    }

    setEditing(
      item,
    );

    setForm({
      fullName:
        item.fullName,

      phone:
        item.phone,

      role:
        item.role,

      salary:
        item.defaultMonthlySalary ??
        "",
    });

    setError(
      null,
    );

    setOpen(
      true,
    );
  }

  async function submit(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    const fixed =
      form.role ===
        "SUPERVISOR" ||
      form.role ===
        "ASSISTANT";

    if (
      form.fullName
        .trim()
        .length <
        2 ||
      !form.phone.trim()
    ) {
      setError(
        "نام و شماره موبایل را کامل وارد کنید.",
      );

      return;
    }

    if (
      fixed &&
      !/^[1-9]\d*$/.test(
        form.salary,
      )
    ) {
      setError(
        "برای سرپرست و وردست، حقوق ماهانه معتبر الزامی است.",
      );

      return;
    }

    const input:
      PersonnelInput = {
        fullName:
          form.fullName.trim(),

        phone:
          form.phone.trim(),

        role:
          form.role,

        ...(fixed
          ? {
              defaultMonthlySalary:
                form.salary,
            }
          : {}),
      };

    setSaving(
      true,
    );

    setError(
      null,
    );

    try {
      if (
        editing
      ) {
        await updatePersonnel(
          editing.id,
          input,
        );
      } else {
        await createPersonnel(
          input,
        );
      }

      setOpen(
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

  async function toggle(
    item:
      PersonnelItem,
  ) {
    if (
      item.role ===
      "MANAGER"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        item.isActive
          ? `دسترسی ${item.fullName} غیرفعال شود؟ سابقه او حذف نمی‌شود.`
          : `${item.fullName} دوباره فعال شود؟`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError(
      null,
    );

    try {
      await setPersonnelActive(
        item.id,
        !item.isActive,
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

  const activeCount =
    items.filter(
      (
        item,
      ) =>
        item.isActive,
    ).length;

  const workerCount =
    items.filter(
      (
        item,
      ) =>
        item.role ===
        "WORKER",
    ).length;

  const fixedCount =
    items.filter(
      (
        item,
      ) =>
        item.role ===
          "SUPERVISOR" ||
        item.role ===
          "ASSISTANT",
    ).length;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black">
            پرسنل
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            همکار، سرپرست و وردست را مدیریت کنید. غیرفعال‌سازی سابقه فرد را حذف نمی‌کند.
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
            className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)] disabled:opacity-50"
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

          <button
            type="button"
            onClick={
              openCreate
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-black text-white"
          >
            <Plus className="size-4" />
            پرسنل جدید
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
          <p className="text-[10px] text-[var(--muted)]">
            نمایش داده‌شده
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
            فعال
          </p>

          <p className="mt-1 text-xl font-black text-emerald-700">
            {new Intl.NumberFormat(
              "fa-IR",
            ).format(
              activeCount,
            )}
          </p>
        </div>

        <div className="rounded-[20px] border border-[var(--line)] bg-white p-4">
          <p className="text-[10px] text-[var(--muted)]">
            دانه‌ای / ثابت
          </p>

          <p className="mt-1 text-sm font-black">
            {new Intl.NumberFormat(
              "fa-IR",
            ).format(
              workerCount,
            )}
            {" / "}
            {new Intl.NumberFormat(
              "fa-IR",
            ).format(
              fixedCount,
            )}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 rounded-[22px] border border-[var(--line)] bg-white p-3 md:grid-cols-[1fr_180px_160px]">
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
            placeholder="جست‌وجوی نام یا موبایل..."
            className={`${inputClass} pr-11`}
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
                | UserRole
                | "",
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

          <option value="MANAGER">
            مدیر
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
                | ""
                | "true"
                | "false",
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

          <p className="mt-3 text-xs font-bold text-[var(--muted)]">
            در حال دریافت پرسنل...
          </p>
        </div>
      ) : items.length ===
        0 ? (
        <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white p-12 text-center">
          <UsersRound className="mx-auto size-8 text-slate-300" />

          <p className="mt-4 text-sm font-black">
            پرسنلی پیدا نشد
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            فیلترها را تغییر دهید یا پرسنل جدید ثبت کنید.
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
                className={`rounded-[24px] border bg-white p-4 shadow-[0_6px_24px_rgba(15,23,42,.02)] sm:p-5 ${
                  item.isActive
                    ? "border-[var(--line)]"
                    : "border-slate-200 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar
                      userId={item.id}
                      hasPhoto={item.hasProfilePhoto}
                      version={item.profilePhotoVersion}
                      className="size-11"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {item.fullName}
                      </p>

                      <p
                        dir="ltr"
                        className="mt-1 text-right text-[11px] text-[var(--muted)]"
                      >
                        {item.phone}
                      </p>

                      {item.profileTitle && (
                        <p className="mt-1 truncate text-[10px] font-bold text-[var(--brand)]">
                          {item.profileTitle}
                        </p>
                      )}
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

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-soft)] p-3">
                  <div>
                    <p className="text-[9px] text-[var(--muted)]">
                      نقش
                    </p>

                    <p className="mt-1 text-xs font-black">
                      {roleLabel[
                        item.role
                      ]}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[var(--muted)]">
                      نوع پرداخت
                    </p>

                    <p className="mt-1 text-xs font-black">
                      {item.compensationType ===
                      "PIECE_RATE"
                        ? "دانه‌ای"
                        : item.compensationType ===
                            "FIXED_MONTHLY"
                          ? "حقوق ثابت"
                          : "مدیریت"}
                    </p>
                  </div>

                  {item.defaultMonthlySalary && (
                    <div className="col-span-2">
                      <p className="text-[9px] text-[var(--muted)]">
                        حقوق ماهانه فعلی
                      </p>

                      <p className="mt-1 text-xs font-black text-[var(--brand)]">
                        {formatMoney(
                          item.defaultMonthlySalary,
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {item.profileBio && (
                  <p className="mt-3 line-clamp-2 rounded-2xl border border-[var(--line)] px-3 py-2 text-[10px] leading-5 text-[var(--muted)]">
                    {item.profileBio}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.role !==
                    "MANAGER" && (
                    <>
                      <button
                        type="button"
                        onClick={
                          () =>
                            openEdit(
                              item,
                            )
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-black text-[var(--muted)] transition hover:text-[var(--text)]"
                      >
                        <Edit3 className="size-3.5" />
                        ویرایش
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
                        className={`inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-black ${
                          item.isActive
                            ? "text-red-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {item.isActive ? (
                          <UserX className="size-3.5" />
                        ) : (
                          <UserCheck className="size-3.5" />
                        )}

                        {item.isActive
                          ? "غیرفعال"
                          : "فعال‌سازی"}
                      </button>
                    </>
                  )}

                  {item.phoneVerifiedAt && (
                    <span className="mr-auto inline-flex items-center gap-1 text-[9px] font-black text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      شماره تأیید شده
                    </span>
                  )}
                </div>
              </article>
            ),
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="بستن"
            onClick={
              () =>
                setOpen(
                  false,
                )
            }
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <div className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-base font-black">
                  {editing
                    ? "ویرایش پرسنل"
                    : "پرسنل جدید"}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  نقش، نوع پرداخت و دسترسی شخص از اینجا تنظیم می‌شود.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setOpen(
                      false,
                    )
                }
                className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--muted)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={
                submit
              }
              className="space-y-4 p-5 sm:p-6"
            >
              <div>
                <label className="mb-2 block text-xs font-black">
                  نام و نام خانوادگی
                </label>

                <input
                  value={
                    form.fullName
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      fullName:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                  placeholder="مثلاً علی رضایی"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black">
                  شماره موبایل
                </label>

                <input
                  dir="ltr"
                  value={
                    form.phone
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      phone:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                  placeholder="09123456789"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black">
                  نقش
                </label>

                <select
                  value={
                    form.role
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      role:
                        event.target
                          .value as
                          UserRole,

                      salary:
                        event.target
                          .value ===
                          "WORKER"
                          ? ""
                          : form.salary,
                    })
                  }
                  className={
                    inputClass
                  }
                >
                                    <option value="MANAGER">
                    مدیر — دسترسی کامل
                  </option>
<option value="WORKER">
                    همکار — دانه‌ای
                  </option>

                  <option value="SUPERVISOR">
                    سرپرست — حقوق ثابت
                  </option>

                  <option value="ASSISTANT">
                    وردست — حقوق ثابت
                  </option>
                </select>
              </div>

              {(form.role ===
                "SUPERVISOR" ||
                form.role ===
                  "ASSISTANT") && (
                <div>
                  <label className="mb-2 block text-xs font-black">
                    حقوق ماهانه
                  </label>

                  <input
                    dir="ltr"
                    inputMode="numeric"
                    value={
                      form.salary
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,
                        salary:
                          event.target
                            .value
                            .replace(
                              /\D/g,
                              "",
                            ),
                      })
                    }
                    className={
                      inputClass
                    }
                    placeholder="25000000"
                  />

                  {form.salary && (
                    <p className="mt-2 text-xs font-black text-[var(--brand)]">
                      {formatMoney(
                        form.salary,
                      )}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-[11px] leading-6 text-[var(--muted)]">
                {form.role ===
                "WORKER"
                  ? "همکار به‌صورت دانه‌ای محاسبه می‌شود و نرخ درآمد از عملیات ثبت‌شده گرفته می‌شود."
                  : form.role ===
                      "SUPERVISOR"
                    ? "فقط یک سرپرست فعال می‌تواند در سیستم وجود داشته باشد."
                    : form.role ===
                        "MANAGER"
                      ? "مدیر دسترسی کامل به پنل مدیریت، پرسنل، حساب‌ها، تأییدها و گزارش‌ها دارد."
                      : "وردست حقوق ثابت ماهانه دارد و ساعت کاری او توسط سرپرست تأیید می‌شود."}
              </div>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] text-sm font-black text-white shadow-[0_10px_26px_rgba(13,116,109,.16)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}

                {editing
                  ? "ذخیره تغییرات"
                  : "ثبت پرسنل"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}