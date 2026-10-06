"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  ApiError,
  getCurrentUser,
  requestOtp,
  verifyOtp,
} from "@/lib/api";
import {
  roleHomePath,
} from "@/lib/auth";

type Step =
  | "phone"
  | "otp";

function normalizeDigits(
  value: string,
): string {
  return value
    .replace(
      /[۰-۹]/g,
      (char) =>
        String(
          char.charCodeAt(0) -
            1728,
        ),
    )
    .replace(
      /[٠-٩]/g,
      (char) =>
        String(
          char.charCodeAt(0) -
            1584,
        ),
    )
    .replace(
      /\D/g,
      "",
    );
}

function normalizePhone(
  value: string,
): string {
  let digits =
    normalizeDigits(
      value,
    );

  if (
    digits.startsWith(
      "98",
    ) &&
    digits.length ===
      12
  ) {
    digits =
      `0${digits.slice(2)}`;
  }

  return digits.slice(
    0,
    11,
  );
}

function formatPhone(
  phone: string,
): string {
  if (
    phone.length !==
    11
  ) {
    return phone;
  }

  return `${phone.slice(
    0,
    4,
  )} ${phone.slice(
    4,
    7,
  )} ${phone.slice(
    7,
  )}`;
}

export function LoginForm() {
  const router =
    useRouter();

  const otpRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    step,
    setStep,
  ] =
    useState<Step>(
      "phone",
    );

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    code,
    setCode,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    initialLoading,
    setInitialLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    seconds,
    setSeconds,
  ] =
    useState(0);

  useEffect(
    () => {
      let alive =
        true;

      async function check() {
        try {
          const user =
            await getCurrentUser();

          if (
            alive
          ) {
            router.replace(
              roleHomePath(
                user.role,
              ),
            );
          }
        } catch {
          if (
            alive
          ) {
            setInitialLoading(
              false,
            );
          }
        }
      }

      void check();

      return () => {
        alive =
          false;
      };
    },
    [
      router,
    ],
  );

  useEffect(
    () => {
      if (
        step !==
          "otp" ||
        seconds <= 0
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setSeconds(
              (value) =>
                Math.max(
                  0,
                  value -
                    1,
                ),
            );
          },
          1000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      seconds,
      step,
    ],
  );

  useEffect(
    () => {
      if (
        step ===
        "otp"
      ) {
        window.setTimeout(
          () => {
            otpRef.current?.focus();
          },
          100,
        );
      }
    },
    [
      step,
    ],
  );

  const validPhone =
    useMemo(
      () =>
        /^09\d{9}$/.test(
          phone,
        ),
      [
        phone,
      ],
    );

  const validCode =
    /^\d{6}$/.test(
      code,
    );

  function errorMessage(
    caught: unknown,
  ): string {
    if (
      caught instanceof
      ApiError
    ) {
      if (
        caught.status ===
        429
      ) {
        return "درخواست زیادی ارسال شده؛ کمی صبر کنید و دوباره امتحان کنید.";
      }

      if (
        caught.status ===
        401
      ) {
        return "کد واردشده صحیح نیست یا اعتبار آن تمام شده است.";
      }

      if (
        caught.status ===
        403
      ) {
        return "دسترسی این شماره فعال نیست. با مدیر تولیدی هماهنگ کنید.";
      }

      if (
        caught.status ===
        404
      ) {
        return "این شماره در لیست پرسنل فعال ثبت نشده است.";
      }

      return caught.message;
    }

    return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
  }

  async function handlePhoneSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !validPhone ||
      loading
    ) {
      return;
    }

    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      await requestOtp(
        phone,
      );

      setStep(
        "otp",
      );

      setSeconds(
        60,
      );

      setCode("");
    } catch (caught) {
      setError(
        errorMessage(
          caught,
        ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function handleOtpSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !validCode ||
      loading
    ) {
      return;
    }

    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const user =
        await verifyOtp(
          phone,
          code,
        );

      router.replace(
        roleHomePath(
          user.role,
        ),
      );
    } catch (caught) {
      setError(
        errorMessage(
          caught,
        ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  async function resend() {
    if (
      seconds > 0 ||
      loading
    ) {
      return;
    }

    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      await requestOtp(
        phone,
      );

      setSeconds(
        60,
      );

      setCode("");

      otpRef.current?.focus();
    } catch (caught) {
      setError(
        errorMessage(
          caught,
        ),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  if (
    initialLoading
  ) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-[10px] font-black text-[var(--brand)]">
            <span className="size-1.5 rounded-full bg-[var(--brand)]" />
            ورود امن پرسنل
          </div>

          <span className="text-[10px] font-bold text-[var(--muted)]">
            مرحله{" "}
            {step ===
            "phone"
              ? "۱"
              : "۲"}{" "}
            از ۲
          </span>
        </div>

        <h1 className="text-[28px] font-black leading-[1.45] tracking-[-0.03em] text-[var(--text)] sm:text-[32px]">
          {step ===
          "phone"
            ? "ورود با شماره موبایل"
            : "کد پیامک‌شده را وارد کنید"}
        </h1>

        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">
          {step ===
          "phone"
            ? "شماره‌ای را وارد کنید که در لیست پرسنل تولیدی ثبت شده است؛ کد ورود برای همان شماره پیامک می‌شود."
            : `کد ۶ رقمی برای ${formatPhone(
                phone,
              )} ارسال شده است.`}
        </p>
      </div>

      {step ===
      "phone" ? (
        <form
          onSubmit={
            handlePhoneSubmit
          }
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-bold text-[var(--text)]"
            >
              شماره موبایل
            </label>

            <div className="group relative">
              <Phone className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)] transition group-focus-within:text-[var(--brand)]" />

              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                dir="ltr"
                value={
                  phone
                }
                onChange={(
                  event,
                ) => {
                  setPhone(
                    normalizePhone(
                      event
                        .target
                        .value,
                    ),
                  );

                  setError(
                    null,
                  );
                }}
                placeholder="09123456789"
                className="h-16 w-full rounded-[20px] border border-[var(--line)] bg-white pl-4 pr-12 text-left text-[18px] font-black tracking-[0.04em] text-[var(--text)] outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
              />
            </div>

            {phone.length >
              0 &&
              !validPhone && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  شماره را به شکل
                  09xxxxxxxxx
                  وارد کنید.
                </p>
              )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !validPhone ||
              loading
            }
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--brand)] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(13,116,109,.20)] transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                در حال ارسال
              </>
            ) : (
              <>
                دریافت کد ورود
                <ArrowLeft className="size-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form
          onSubmit={
            handleOtpSubmit
          }
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-bold text-[var(--text)]"
            >
              کد تأیید
            </label>

            <div className="group relative">
              <KeyRound className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[var(--muted)] transition group-focus-within:text-[var(--brand)]" />

              <input
                ref={
                  otpRef
                }
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                value={
                  code
                }
                maxLength={
                  6
                }
                onChange={(
                  event,
                ) => {
                  setCode(
                    normalizeDigits(
                      event
                        .target
                        .value,
                    ).slice(
                      0,
                      6,
                    ),
                  );

                  setError(
                    null,
                  );
                }}
                placeholder="• • • • • •"
                className="h-16 w-full rounded-2xl border border-[var(--line)] bg-white px-12 text-center text-[26px] font-black tracking-[0.38em] text-[var(--text)] outline-none transition placeholder:text-slate-300 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !validCode ||
              loading
            }
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--brand)] px-5 text-sm font-black text-white shadow-[0_14px_34px_rgba(13,116,109,.20)] transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                در حال بررسی
              </>
            ) : (
              <>
                <ShieldCheck className="size-5" />
                ورود به پنل
              </>
            )}
          </button>

          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={
                () => {
                  setStep(
                    "phone",
                  );

                  setCode("");

                  setError(
                    null,
                  );
                }
              }
              className="font-bold text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              تغییر شماره
            </button>

            <button
              type="button"
              disabled={
                seconds >
                  0 ||
                loading
              }
              onClick={
                () => {
                  void resend();
                }
              }
              className="flex items-center gap-1.5 font-black text-[var(--brand)] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <RefreshCw className="size-3.5" />

              {seconds >
              0
                ? `ارسال مجدد تا ${seconds} ثانیه`
                : "ارسال مجدد کد"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5">
          <LockKeyhole className="mb-2 size-4 text-[var(--brand)]" />

          <p className="text-xs font-black text-[var(--text)]">
            بدون رمز عبور
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
            ورود فقط با کد یک‌بارمصرف
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5">
          <CheckCircle2 className="mb-2 size-4 text-[var(--brand)]" />

          <p className="text-xs font-black text-[var(--text)]">
            دسترسی کنترل‌شده
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
            فقط پرسنل فعال مجموعه
          </p>
        </div>
      </div>
    </div>
  );
}
