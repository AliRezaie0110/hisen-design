"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FocusEvent,
  InputHTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  formatGregorianAsJalali,
  gregorianDateToJalaliParts,
  gregorianIsoToJalaliParts,
  JALALI_MONTH_NAMES,
  JalaliParts,
  jalaliMonthLength,
  jalaliPartsToGregorianIso,
  parseJalaliText,
  todayGregorianIso,
  toPersianDigits,
} from "@/lib/jalali-date";

type JalaliDateInputProps =
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "type"
    | "value"
    | "defaultValue"
  > & {
    value?:
      | string
      | null;
  };

const weekDays = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
];

function makeChangeEvent(
  value: string,
): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      value,
    },
    currentTarget: {
      value,
    },
  } as ChangeEvent<HTMLInputElement>;
}

function normalizeManualText(
  value: string,
): string {
  const characters =
    value
      .replace(
        /[^\d۰-۹٠-٩/.\-\s]/g,
        "",
      )
      .slice(
        0,
        12,
      );

  return characters;
}

export function JalaliDateInput({
  value,
  onChange,
  onBlur,
  onFocus,
  className,
  disabled,
  required,
  min,
  max,
  id,
  name,
  placeholder,
  ...rest
}: JalaliDateInputProps) {
  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  const initialParts =
    useMemo(
      () =>
        gregorianIsoToJalaliParts(
          typeof value ===
            "string"
            ? value
            : "",
        ) ??
        gregorianDateToJalaliParts(
          new Date(
            `${todayGregorianIso()}T12:00:00.000Z`,
          ),
        ),
      [value],
    );

  const [
    text,
    setText,
  ] =
    useState(
      formatGregorianAsJalali(
        typeof value ===
          "string"
          ? value
          : "",
      ),
    );

  const [
    open,
    setOpen,
  ] =
    useState(
      false,
    );

  const [
    invalid,
    setInvalid,
  ] =
    useState(
      false,
    );

  const [
    viewYear,
    setViewYear,
  ] =
    useState(
      initialParts.year,
    );

  const [
    viewMonth,
    setViewMonth,
  ] =
    useState(
      initialParts.month,
    );

  useEffect(
    () => {
      if (!open) {
        setText(
          formatGregorianAsJalali(
            typeof value ===
              "string"
              ? value
              : "",
          ),
        );
      }
    },
    [
      value,
      open,
    ],
  );

  useEffect(
    () => {
      function handleOutside(
        event: MouseEvent,
      ) {
        if (
          rootRef.current &&
          !rootRef.current.contains(
            event.target as Node,
          )
        ) {
          setOpen(
            false,
          );
        }
      }

      document.addEventListener(
        "mousedown",
        handleOutside,
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleOutside,
        );
      };
    },
    [],
  );

  const selected =
    gregorianIsoToJalaliParts(
      typeof value ===
        "string"
        ? value
        : "",
    );

  const firstGregorian =
    jalaliPartsToGregorianIso({
      year:
        viewYear,
      month:
        viewMonth,
      day:
        1,
    });

  const firstWeekDay =
    firstGregorian
      ? (
          new Date(
            `${firstGregorian}T12:00:00.000Z`,
          ).getUTCDay() +
          1
        ) %
        7
      : 0;

  const monthDays =
    jalaliMonthLength(
      viewYear,
      viewMonth,
    );

  function isWithinRange(
    gregorian: string,
  ): boolean {
    if (
      min &&
      gregorian <
        String(
          min,
        ).slice(
          0,
          10,
        )
    ) {
      return false;
    }

    if (
      max &&
      gregorian >
        String(
          max,
        ).slice(
          0,
          10,
        )
    ) {
      return false;
    }

    return true;
  }

  function emit(
    gregorian: string,
  ) {
    onChange?.(
      makeChangeEvent(
        gregorian,
      ),
    );
  }

  function applyParts(
    parts: JalaliParts,
  ) {
    const gregorian =
      jalaliPartsToGregorianIso(
        parts,
      );

    if (
      !gregorian ||
      !isWithinRange(
        gregorian,
      )
    ) {
      setInvalid(
        true,
      );

      return;
    }

    setInvalid(
      false,
    );

    setText(
      formatGregorianAsJalali(
        gregorian,
      ),
    );

    emit(
      gregorian,
    );

    setOpen(
      false,
    );
  }

  function previousMonth() {
    if (
      viewMonth === 1
    ) {
      setViewYear(
        (current) =>
          current - 1,
      );

      setViewMonth(
        12,
      );

      return;
    }

    setViewMonth(
      (current) =>
        current - 1,
    );
  }

  function nextMonth() {
    if (
      viewMonth === 12
    ) {
      setViewYear(
        (current) =>
          current + 1,
      );

      setViewMonth(
        1,
      );

      return;
    }

    setViewMonth(
      (current) =>
        current + 1,
    );
  }

  function handleTextChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const next =
      normalizeManualText(
        event.target.value,
      );

    setText(
      next,
    );

    if (
      !next.trim()
    ) {
      setInvalid(
        false,
      );

      emit("");

      return;
    }

    const parsed =
      parseJalaliText(
        next,
      );

    if (
      parsed &&
      isWithinRange(
        parsed.gregorian,
      )
    ) {
      setInvalid(
        false,
      );

      emit(
        parsed.gregorian,
      );
    }
    else {
      setInvalid(
        true,
      );

      /*
       * Do not keep an old Gregorian value while
       * user is editing an invalid/incomplete Jalali date.
       */
      emit("");
    }
  }

  function handleBlur(
    event:
      FocusEvent<HTMLInputElement>,
  ) {
    if (
      text.trim()
    ) {
      const parsed =
        parseJalaliText(
          text,
        );

      if (
        parsed &&
        isWithinRange(
          parsed.gregorian,
        )
      ) {
        setInvalid(
          false,
        );

        setText(
          formatGregorianAsJalali(
            parsed.gregorian,
          ),
        );

        emit(
          parsed.gregorian,
        );
      }
      else {
        setInvalid(
          true,
        );
      }
    }

    onBlur?.(
      event,
    );
  }

  function openCalendar() {
    if (
      disabled
    ) {
      return;
    }

    const current =
      gregorianIsoToJalaliParts(
        typeof value ===
          "string"
          ? value
          : "",
      ) ??
      gregorianDateToJalaliParts(
        new Date(
          `${todayGregorianIso()}T12:00:00.000Z`,
        ),
      );

    setViewYear(
      current.year,
    );

    setViewMonth(
      current.month,
    );

    setOpen(
      (currentOpen) =>
        !currentOpen,
    );
  }

  return (
    <div
      ref={
        rootRef
      }
      className="relative"
    >
      <div className="relative">
        <input
          {...rest}
          id={
            id
          }
          name={
            name
          }
          type="text"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          disabled={
            disabled
          }
          required={
            required
          }
          value={
            text
          }
          placeholder={
            placeholder ??
            "۱۴۰۵/۰۷/۰۶"
          }
          aria-invalid={
            invalid
              ? "true"
              : undefined
          }
          onFocus={
            onFocus
          }
          onBlur={
            handleBlur
          }
          onChange={
            handleTextChange
          }
          className={[
            className ??
              "",
            "pl-11",
            invalid
              ? "!border-red-300 !ring-red-100"
              : "",
          ]
            .filter(
              Boolean,
            )
            .join(
              " ",
            )}
        />

        <button
          type="button"
          tabIndex={
            -1
          }
          disabled={
            disabled
          }
          onMouseDown={(
            event,
          ) => {
            event.preventDefault();
          }}
          onClick={
            openCalendar
          }
          aria-label="انتخاب تاریخ شمسی"
          className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--brand)] disabled:opacity-40"
        >
          <CalendarDays className="size-4" />
        </button>
      </div>

      {invalid && (
        <p className="mt-1.5 text-[11px] font-bold text-red-600">
          تاریخ شمسی معتبر وارد کنید؛ مثال: ۱۴۰۵/۰۷/۰۶
        </p>
      )}

      {open && (
        <div
          dir="rtl"
          className="absolute right-0 z-[100] mt-2 w-[310px] max-w-[calc(100vw-32px)] rounded-[22px] border border-[var(--line)] bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,.18)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={
                previousMonth
              }
              className="flex size-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              aria-label="ماه قبل"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="text-center">
              <p className="text-sm font-black text-[var(--text)]">
                {
                  JALALI_MONTH_NAMES[
                    viewMonth -
                      1
                  ]
                }
              </p>

              <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
                {toPersianDigits(
                  viewYear,
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={
                nextMonth
              }
              className="flex size-9 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekDays.map(
              (day) => (
                <div
                  key={
                    day
                  }
                  className="flex h-8 items-center justify-center text-[10px] font-black text-[var(--muted)]"
                >
                  {day}
                </div>
              ),
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({
              length:
                firstWeekDay,
            }).map(
              (_, index) => (
                <div
                  key={`blank-${index}`}
                  className="size-9"
                />
              ),
            )}

            {Array.from({
              length:
                monthDays,
            }).map(
              (_, index) => {
                const day =
                  index + 1;

                const parts: JalaliParts = {
                  year:
                    viewYear,
                  month:
                    viewMonth,
                  day,
                };

                const gregorian =
                  jalaliPartsToGregorianIso(
                    parts,
                  );

                const selectable =
                  Boolean(
                    gregorian &&
                      isWithinRange(
                        gregorian,
                      ),
                  );

                const isSelected =
                  selected?.year ===
                    viewYear &&
                  selected?.month ===
                    viewMonth &&
                  selected?.day ===
                    day;

                return (
                  <button
                    key={
                      day
                    }
                    type="button"
                    disabled={
                      !selectable
                    }
                    onClick={
                      () =>
                        applyParts(
                          parts,
                        )
                    }
                    className={[
                      "flex size-9 items-center justify-center rounded-xl text-xs font-black transition",
                      isSelected
                        ? "bg-[var(--brand)] text-white shadow-sm"
                        : "text-[var(--text)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]",
                      !selectable
                        ? "cursor-not-allowed opacity-25"
                        : "",
                    ].join(
                      " ",
                    )}
                  >
                    {toPersianDigits(
                      day,
                    )}
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
            <button
              type="button"
              onClick={
                () => {
                  emit("");

                  setText("");

                  setInvalid(
                    false,
                  );

                  setOpen(
                    false,
                  );
                }
              }
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black text-red-600 hover:bg-red-50"
            >
              <X className="size-3.5" />
              پاک کردن
            </button>

            <button
              type="button"
              onClick={
                () => {
                  const today =
                    todayGregorianIso();

                  const parts =
                    gregorianIsoToJalaliParts(
                      today,
                    );

                  if (
                    parts
                  ) {
                    applyParts(
                      parts,
                    );
                  }
                }
              }
              className="h-9 rounded-xl bg-[var(--brand-soft)] px-3 text-xs font-black text-[var(--brand)]"
            >
              امروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}