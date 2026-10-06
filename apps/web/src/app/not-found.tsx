import Link from "next/link";
import {
  ArrowRight,
  Factory,
} from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-5">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--line)] bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Factory className="size-6" />
        </div>

        <p className="mt-5 text-4xl font-black text-slate-200">
          404
        </p>

        <h1 className="mt-2 text-lg font-black">
          این صفحه وجود ندارد
        </h1>

        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          آدرس واردشده معتبر نیست یا صفحه جابه‌جا شده است.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-black text-white"
        >
          <ArrowRight className="size-4" />
          بازگشت به پنل
        </Link>
      </div>
    </main>
  );
}