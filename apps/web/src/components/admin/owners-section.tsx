"use client";

import {
  BriefcaseBusiness,
  Edit3,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
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
  createOwner,
  deleteOwner,
  listOwners,
  managerError,
  OwnerInput,
  OwnerItem,
  setOwnerActive,
  updateOwner,
} from "@/lib/manager-api";

const inputClass =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-bold outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

const textareaClass =
  "w-full resize-none rounded-2xl border border-[var(--line)] bg-white p-4 text-sm leading-7 outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

type OwnerForm = {
  name: string;
  phone: string;
  note: string;
};

const blank: OwnerForm = {
  name:
    "",
  phone:
    "",
  note:
    "",
};

export function OwnersSection() {
  const [
    items,
    setItems,
  ] =
    useState<
      OwnerItem[]
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
    q,
    setQ,
  ] =
    useState("");

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
    useState<OwnerItem | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<OwnerForm>(
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
            await listOwners({
              q:
                q.trim() ||
                undefined,

              isActive:
                active ===
                ""
                  ? undefined
                  : active ===
                    "true",
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
      OwnerItem,
  ) {
    setEditing(
      item,
    );

    setForm({
      name:
        item.name,

      phone:
        item.phone ??
        "",

      note:
        item.note ??
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

    if (
      form.name
        .trim()
        .length <
      2
    ) {
      setError(
        "نام صاحبکار را وارد کنید.",
      );

      return;
    }

    const input:
      OwnerInput = {
        name:
          form.name.trim(),

        ...(form.phone.trim()
          ? {
              phone:
                form.phone.trim(),
            }
          : {}),

        ...(form.note.trim()
          ? {
              note:
                form.note.trim(),
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
        await updateOwner(
          editing.id,
          input,
        );
      } else {
        await createOwner(
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
      OwnerItem,
  ) {
    const confirmed =
      window.confirm(
        item.isActive
          ? `${item.name} غیرفعال شود؟ سابقه سری‌ها و حساب او باقی می‌ماند.`
          : `${item.name} دوباره فعال شود؟`,
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
      await setOwnerActive(
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

  async function remove(
    item: OwnerItem,
  ) {
    const confirmed =
      window.confirm(
        `صاحبکار «${item.name}» حذف شود؟ اگر سابقه سری‌کار یا حساب داشته باشد فقط غیرفعال می‌شود.`,
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await deleteOwner(
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
            صاحبکارها
          </h2>

          <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
            صاحبکار همان شخص یا مجموعه‌ای است که سری‌کار تولیدی متعلق به اوست.
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
              openCreate
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-black text-white"
          >
            <Plus className="size-4" />
            صاحبکار جدید
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
            صاحبکارها
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
            placeholder="جست‌وجوی نام یا شماره تماس..."
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
        </div>
      ) : items.length ===
        0 ? (
        <div className="rounded-[26px] border border-dashed border-[var(--line-strong)] bg-white p-12 text-center">
          <BriefcaseBusiness className="mx-auto size-8 text-slate-300" />

          <p className="mt-4 text-sm font-black">
            صاحبکاری پیدا نشد
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            اولین صاحبکار را ثبت کنید تا بعداً برای او سری‌کار بسازیم.
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
                    <BriefcaseBusiness className="size-5" />
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

                {item.phone ? (
                  <p
                    dir="ltr"
                    className="mt-2 flex items-center justify-end gap-1.5 text-xs text-[var(--muted)]"
                  >
                    {item.phone}
                    <Phone className="size-3.5" />
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-300">
                    بدون شماره تماس
                  </p>
                )}

                {item.note && (
                  <div className="mt-3 rounded-2xl bg-[var(--surface-soft)] p-3">
                    <p className="line-clamp-3 text-[11px] leading-6 text-[var(--muted)]">
                      {item.note}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={
                      () =>
                        openEdit(
                          item,
                        )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-xs font-black text-[var(--muted)]"
                  >
                    <Edit3 className="size-3.5" />
                    ویرایش
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

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5">
          <button
            type="button"
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
                    ? "ویرایش صاحبکار"
                    : "صاحبکار جدید"}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  اطلاعات پایه صاحبکار را ثبت کنید.
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
                className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]"
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
                  نام صاحبکار
                </label>

                <input
                  value={
                    form.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      name:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                  placeholder="نام شخص یا مجموعه"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black">
                  شماره تماس
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
                  placeholder="اختیاری"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black">
                  توضیحات
                </label>

                <textarea
                  rows={
                    4
                  }
                  maxLength={
                    1000
                  }
                  value={
                    form.note
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      note:
                        event.target
                          .value,
                    })
                  }
                  className={
                    textareaClass
                  }
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
                {saving && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}

                {editing
                  ? "ذخیره تغییرات"
                  : "ثبت صاحبکار"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
