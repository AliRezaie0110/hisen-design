"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Crown,
  Medal,
  RefreshCw,
  Trophy,
} from "lucide-react";

import {
  AppShell,
} from "@/components/layout/app-shell";
import {
  ProfileAvatar,
} from "@/components/profile/profile-avatar";
import {
  getCurrentUser,
} from "@/lib/api";
import {
  AuthUser,
} from "@/lib/auth";
import {
  getMonthlyLeaderboard,
  LeaderboardEntry,
} from "@/lib/leaderboard-api";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function getCurrentPersianDate() {
  const parts = new Intl.DateTimeFormat(
    "en-US-u-ca-persian",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    },
  ).formatToParts(new Date());

  const value = (type: string) =>
    Number(
      parts.find(
        (part) => part.type === type,
      )?.value,
    );

  return {
    year: value("year"),
    month: value("month"),
  };
}

export default function LeaderboardPage() {
  const current = useMemo(
    () => getCurrentPersianDate(),
    [],
  );

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [month, setMonth] =
    useState(current.month);

  const [year, setYear] =
    useState(current.year);

  const [entries, setEntries] =
    useState<LeaderboardEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadLeaderboard() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getMonthlyLeaderboard(
          month,
          year,
        );

      setEntries(data);
    } catch {
      setError(
        "دریافت جدول بهترین‌های ماه انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getCurrentUser()
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [month, year]);

  if (!user) {
    return (
      <div className="min-h-dvh bg-[var(--app-bg)]" />
    );
  }

  return (
    <AppShell
      user={user}
      eyebrow="رقابت ماهانه"
      title="بهترین‌های ماه"
      description="رتبه‌بندی همکاران بر اساس تعداد کارهای تأییدشده در ماه انتخاب‌شده."
    >
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,.05)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Trophy className="size-5" />
              </div>

              <div>
                <p className="text-lg font-black">
                  بهترین‌های ماه
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  رقابت بر اساس تعداد کار تأییدشده
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(event) =>
                setMonth(
                  Number(event.target.value),
                )
              }
              className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold outline-none"
            >
              {PERSIAN_MONTHS.map(
                (name, index) => (
                  <option
                    key={name}
                    value={index + 1}
                  >
                    {name}
                  </option>
                ),
              )}
            </select>

            <select
              value={year}
              onChange={(event) =>
                setYear(
                  Number(event.target.value),
                )
              }
              className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-bold outline-none"
            >
              {[year - 1, year, year + 1].map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={() => {
                void loadLeaderboard();
              }}
              disabled={loading}
              className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
              aria-label="به‌روزرسانی"
            >
              <RefreshCw
                className={`size-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-[var(--line)] bg-white p-10 text-center text-sm font-bold text-[var(--muted)]">
            در حال دریافت جدول...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-[28px] border border-[var(--line)] bg-white p-10 text-center">
            <Trophy className="mx-auto size-9 text-[var(--muted)]" />

            <p className="mt-4 font-black">
              هنوز همکاری در جدول نیست.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-[0_12px_40px_rgba(15,23,42,.05)]">
            <div className="border-b border-[var(--line)] bg-[var(--surface-soft)] px-5 py-4">
              <p className="text-sm font-black">
                {PERSIAN_MONTHS[month - 1]} {year}
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                هر تأیید سرپرست، رتبه همکار را در این جدول تغییر می‌دهد.
              </p>
            </div>

            <div className="divide-y divide-[var(--line)]">
              {entries.map((entry) => {
                const topThree =
                  entry.rank <= 3;

                return (
                  <div
                    key={entry.workerId}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      topThree
                        ? "bg-amber-50/40"
                        : ""
                    }`}
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] font-black">
                      {entry.rank === 1 ? (
                        <Crown className="size-5 text-amber-500" />
                      ) : entry.rank === 2 ? (
                        <Medal className="size-5 text-slate-500" />
                      ) : entry.rank === 3 ? (
                        <Medal className="size-5 text-orange-600" />
                      ) : (
                        entry.rank
                      )}
                    </div>

                    <ProfileAvatar
                      userId={entry.workerId}
                      hasPhoto={Boolean(
                        entry.photoUrl,
                      )}
                      className="size-12 rounded-2xl"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">
                        {entry.name}
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        رتبه {entry.rank}
                      </p>
                    </div>

                    <div className="text-left">
                      <p className="text-lg font-black">
                        {entry.approvedWorks}
                      </p>

                      <p className="mt-0.5 text-[10px] font-bold text-[var(--muted)]">
                        کار تأییدشده
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
