import {
  LoaderCircle,
} from "lucide-react";

export function FullPageLoader({
  text = "در حال بررسی حساب...",
}: {
  text?: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-white shadow-sm">
          <LoaderCircle className="size-6 animate-spin text-[var(--brand)]" />
        </div>

        <p className="text-sm font-medium text-[var(--muted)]">
          {text}
        </p>
      </div>
    </main>
  );
}