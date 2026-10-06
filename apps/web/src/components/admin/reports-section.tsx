"use client";


import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import {
  BriefcaseBusiness,
  CalendarDays,
  Download,
  FileSpreadsheet,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BatchStatus,
  downloadEmployeeReportExcel,
  downloadOwnerReportExcel,
  downloadWorkHistoryExcel,
  EmployeeAccountSummary,
  EmployeeReportFilters,
  EmployeeReportResponse,
  getEmployeeReport,
  getOwnerReport,
  getWorkHistoryReport,
  listBatches,
  listEmployeeAccounts,
  listOperations,
  listOwners,
  listPersonnel,
  managerError,
  OwnerItem,
  OwnerReportFilters,
  OwnerReportResponse,
  PersonnelItem,
  WorkBatchItem,
  WorkHistoryFilters,
  WorkHistoryResponse,
} from "@/lib/manager-api";

type MainTab =
  | "employees"
  | "work-history"
  | "owners";

type EmployeeDetailTab =
  | "employees"
  | "payments"
  | "salaries";

type OwnerDetailTab =
  | "owners"
  | "batches"
  | "payments";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-bold outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]";

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
        value,
      ),
    );
  } catch {
    return value;
  }
}

function minutes(
  value:
    number,
): string {
  const hours =
    Math.floor(
      value /
        60,
    );

  const rest =
    value %
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

function roleLabel(
  role:
    string,
): string {
  if (
    role ===
    "WORKER"
  ) {
    return "همکار";
  }

  if (
    role ===
    "SUPERVISOR"
  ) {
    return "سرپرست";
  }

  if (
    role ===
    "ASSISTANT"
  ) {
    return "وردست";
  }

  return role;
}

function statusLabel(
  status:
    string,
): string {
  switch (
    status
  ) {
    case "ACTIVE":
      return "فعال";

    case "COMPLETED":
      return "تکمیل‌شده";

    case "CANCELLED":
      return "لغوشده";

    case "ARCHIVED":
      return "بایگانی";

    default:
      return status;
  }
}

export function ReportsSection() {
  const [
    mainTab,
    setMainTab,
  ] =
    useState<MainTab>(
      "employees",
    );

  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-[var(--brand)]" />

          <h2 className="text-lg font-black">
            گزارش‌ها
          </h2>
        </div>

        <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
          گزارش مالی، سوابق ریز عملیات کارکنان و حساب صاحبکارها را فیلتر کنید و همان نتیجه را به Excel بگیرید.
        </p>
      </div>

      <div className="mb-5 flex gap-2 rounded-[20px] border border-[var(--line)] bg-white p-1.5">
        <button
          type="button"
          onClick={
            () =>
              setMainTab(
                "employees",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black transition ${
            mainTab ===
            "employees"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <UsersRound className="size-4" />
          کارکنان
        </button>

        <button
          type="button"
          onClick={
            () =>
              setMainTab(
                "work-history",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black transition ${
            mainTab ===
            "work-history"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <History className="size-4" />
          سوابق عملیات
        </button>

        <button
          type="button"
          onClick={
            () =>
              setMainTab(
                "owners",
              )
          }
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-xs font-black transition ${
            mainTab ===
            "owners"
              ? "bg-[var(--brand)] text-white"
              : "text-[var(--muted)]"
          }`}
        >
          <BriefcaseBusiness className="size-4" />
          صاحبکارها
        </button>
      </div>

      {mainTab ===
      "employees" ? (
        <EmployeeReports />
      ) : mainTab ===
        "work-history" ? (
        <WorkHistoryReports />
      ) : (
        <OwnerReports />
      )}
    </section>
  );
}

function EmployeeReports() {
  const [
    employeeOptions,
    setEmployeeOptions,
  ] =
    useState<
      EmployeeAccountSummary[]
    >([]);

  const [
    report,
    setReport,
  ] =
    useState<
      EmployeeReportResponse |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    downloading,
    setDownloading,
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
    detailTab,
    setDetailTab,
  ] =
    useState<EmployeeDetailTab>(
      "employees",
    );

  const [
    employeeId,
    setEmployeeId,
  ] =
    useState("");

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
      "" |
      "WORKER" |
      "SUPERVISOR" |
      "ASSISTANT"
    >("");

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
    from,
    setFrom,
  ] =
    useState("");

  const [
    to,
    setTo,
  ] =
    useState("");

  const filters =
    useMemo<
      EmployeeReportFilters
    >(
      () => ({
        ...(employeeId
          ? {
              employeeId,
            }
          : {}),

        ...(q.trim()
          ? {
              q:
                q.trim(),
            }
          : {}),

        ...(role
          ? {
              role,
            }
          : {}),

        ...(active
          ? {
              isActive:
                active,
            }
          : {}),

        ...(from
          ? {
              from,
            }
          : {}),

        ...(to
          ? {
              to,
            }
          : {}),
      }),
      [
        active,
        employeeId,
        from,
        q,
        role,
        to,
      ],
    );

  const load =
    useCallback(
      async (
        target:
          EmployeeReportFilters,
      ) => {
        if (
          target.from &&
          target.to &&
          target.from >
            target.to
        ) {
          setError(
            "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.",
          );

          return;
        }

        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const response =
            await getEmployeeReport(
              target,
            );

          setReport(
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
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void Promise.all([
        load({}),

        listEmployeeAccounts({
          page:
            1,

          pageSize:
            100,
        }).then(
          (
            response,
          ) => {
            setEmployeeOptions(
              response.items,
            );
          },
        ),
      ]).catch(
        (
          caught,
        ) => {
          setError(
            managerError(
              caught,
            ),
          );
        },
      );
    },
    [
      load,
    ],
  );

  function submit(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    void load(
      filters,
    );
  }

  function reset() {
    setEmployeeId("");
    setQ("");
    setRole("");
    setActive("");
    setFrom("");
    setTo("");

    void load({});
  }

  async function excel() {
    if (
      from &&
      to &&
      from >
        to
    ) {
      setError(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.",
      );

      return;
    }

    setDownloading(
      true,
    );

    setError(
      null,
    );

    try {
      await downloadEmployeeReportExcel(
        filters,
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
      setDownloading(
        false,
      );
    }
  }

  return (
    <section>
      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={
          submit
        }
        className="mb-5 rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-4 text-[var(--brand)]" />

          <p className="text-sm font-black">
            فیلتر گزارش کارکنان
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter
            label="شخص"
          >
            <select
              value={
                employeeId
              }
              onChange={(
                event,
              ) =>
                setEmployeeId(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                همه کارکنان
              </option>

              {employeeOptions.map(
                (
                  item,
                ) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.fullName}
                    {" — "}
                    {roleLabel(
                      item.role,
                    )}
                  </option>
                ),
              )}
            </select>
          </Filter>

          <Filter
            label="جست‌وجو"
          >
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
              className={
                inputClass
              }
              placeholder="نام یا موبایل"
            />
          </Filter>

          <Filter
            label="نقش"
          >
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
                    typeof role,
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
            </select>
          </Filter>

          <Filter
            label="وضعیت"
          >
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
                همه
              </option>

              <option value="true">
                فعال
              </option>

              <option value="false">
                غیرفعال
              </option>
            </select>
          </Filter>

          <Filter
            label="از تاریخ"
          >
            <JalaliDateInput
              dir="ltr"
              value={
                from
              }
              onChange={(
                event,
              ) =>
                setFrom(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            />
          </Filter>

          <Filter
            label="تا تاریخ"
          >
            <JalaliDateInput
              dir="ltr"
              value={
                to
              }
              onChange={(
                event,
              ) =>
                setTo(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            />
          </Filter>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="submit"
            disabled={
              loading
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-xs font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            اعمال فیلتر
          </button>

          <button
            type="button"
            onClick={
              reset
            }
            className="h-11 rounded-xl border border-[var(--line)] bg-white text-xs font-black text-[var(--muted)]"
          >
            پاک کردن فیلترها
          </button>

          <button
            type="button"
            disabled={
              downloading ||
              loading
            }
            onClick={
              () => {
                void excel();
              }
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102827] text-xs font-black text-white disabled:opacity-50"
          >
            {downloading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}

            دانلود Excel
          </button>
        </div>
      </form>

      {loading &&
      !report ? (
        <Loading />
      ) : report ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-6">
            <ReportStat
              label="تعداد کارکنان"
              value={
                number(
                  report.totals
                    .employees,
                )
              }
            />

            <ReportStat
              label="درآمد بازه"
              value={
                money(
                  report.totals
                    .periodEarned,
                )
              }
            />

            <ReportStat
              label="پرداخت بازه"
              value={
                money(
                  report.totals
                    .periodPaid,
                )
              }
            />

            <ReportStat
              label="درآمد کل"
              value={
                money(
                  report.totals
                    .lifetimeEarned,
                )
              }
            />

            <ReportStat
              label="پرداخت کل"
              value={
                money(
                  report.totals
                    .lifetimePaid,
                )
              }
            />

            <ReportStat
              label="مانده فعلی"
              value={
                money(
                  report.totals
                    .currentBalance,
                )
              }
              strong
            />
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-white p-1.5">
            <ReportTab
              active={
                detailTab ===
                "employees"
              }
              label={`کارکنان (${number(
                report.items
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "employees",
                  )
              }
            />

            <ReportTab
              active={
                detailTab ===
                "payments"
              }
              label={`پرداخت‌ها (${number(
                report.payments
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "payments",
                  )
              }
            />

            <ReportTab
              active={
                detailTab ===
                "salaries"
              }
              label={`حقوق ماهانه (${number(
                report.monthlySalaries
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "salaries",
                  )
              }
            />
          </div>

          {detailTab ===
          "employees" ? (
            <EmployeeSummaryTable
              report={
                report
              }
            />
          ) : detailTab ===
            "payments" ? (
            <EmployeePaymentsTable
              report={
                report
              }
            />
          ) : (
            <EmployeeSalariesTable
              report={
                report
              }
            />
          )}
        </>
      ) : null}
    </section>
  );
}

function EmployeeSummaryTable({
  report,
}: {
  report:
    EmployeeReportResponse;
}) {
  if (
    report.items.length ===
    0
  ) {
    return (
      <Empty text="برای این فیلتر هیچ پرسنلی پیدا نشد." />
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-right">
          <thead className="bg-[var(--surface-soft)] text-[10px] text-[var(--muted)]">
            <tr>
              <Th>
                پرسنل
              </Th>

              <Th>
                نقش
              </Th>

              <Th>
                حقوق
              </Th>

              <Th>
                درآمد بازه
              </Th>

              <Th>
                پرداخت بازه
              </Th>

              <Th>
                در انتظار
              </Th>

              <Th>
                درآمد کل
              </Th>

              <Th>
                پرداخت کل
              </Th>

              <Th>
                مانده
              </Th>

              <Th>
                عملکرد
              </Th>
            </tr>
          </thead>

          <tbody>
            {report.items.map(
              (
                item,
              ) => (
                <tr
                  key={
                    item.id
                  }
                  className="border-t border-[var(--line)] text-[10px]"
                >
                  <Td>
                    <p className="font-black">
                      {item.fullName}
                    </p>

                    <p
                      dir="ltr"
                      className="mt-1 text-right text-[9px] text-[var(--muted)]"
                    >
                      {item.phone}
                    </p>
                  </Td>

                  <Td>
                    {item.roleLabel}
                  </Td>

                  <Td>
                    {item.compensationLabel}
                  </Td>

                  <Td>
                    {money(
                      item.periodEarned,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.periodPaid,
                    )}
                  </Td>

                  <Td>
                    <span className="text-amber-700">
                      {money(
                        item.pendingAmount,
                      )}
                    </span>
                  </Td>

                  <Td>
                    {money(
                      item.lifetimeEarned,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.lifetimePaid,
                    )}
                  </Td>

                  <Td>
                    <span className="font-black text-[var(--brand)]">
                      {money(
                        item.currentBalance,
                      )}
                    </span>
                  </Td>

                  <Td>
                    {item.compensationType ===
                    "PIECE_RATE" ? (
                      <div className="space-y-1">
                        <p>
                          تأیید:{" "}
                          {number(
                            item.approvedQuantity,
                          )} عدد
                        </p>

                        <p className="text-[var(--muted)]">
                          انتظار:{" "}
                          {number(
                            item.pendingQuantity,
                          )} عدد
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p>
                          تأیید:{" "}
                          {minutes(
                            item.approvedMinutes,
                          )}
                        </p>

                        <p className="text-[var(--muted)]">
                          انتظار:{" "}
                          {minutes(
                            item.pendingMinutes,
                          )}
                        </p>
                      </div>
                    )}
                  </Td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeePaymentsTable({
  report,
}: {
  report:
    EmployeeReportResponse;
}) {
  if (
    report.payments.length ===
    0
  ) {
    return (
      <Empty text="در این بازه پرداختی پیدا نشد." />
    );
  }

  return (
    <div className="space-y-2">
      {report.payments.map(
        (
          item,
        ) => (
          <article
            key={
              item.id
            }
            className="rounded-[20px] border border-[var(--line)] bg-white p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black">
                  {item.employeeName}
                </p>

                <p className="mt-1 text-[9px] text-[var(--muted)]">
                  {item.roleLabel}
                  {" · "}
                  {date(
                    item.paidAt,
                  )}
                  {" · "}
                  ثبت‌کننده:{" "}
                  {item.recordedBy}
                </p>
              </div>

              <p className="text-sm font-black text-emerald-700">
                {money(
                  item.amount,
                )}
              </p>
            </div>

            {item.note && (
              <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-[10px] leading-5 text-[var(--muted)]">
                {item.note}
              </p>
            )}
          </article>
        ),
      )}
    </div>
  );
}

function EmployeeSalariesTable({
  report,
}: {
  report:
    EmployeeReportResponse;
}) {
  if (
    report.monthlySalaries.length ===
    0
  ) {
    return (
      <Empty text="در این بازه حقوق ماهانه‌ای ثبت نشده است." />
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {report.monthlySalaries.map(
        (
          item,
          index,
        ) => (
          <article
            key={`${item.employeeId}-${item.year}-${item.month}-${index}`}
            className="rounded-[20px] border border-[var(--line)] bg-white p-4"
          >
            <p className="text-xs font-black">
              {item.employeeName}
            </p>

            <p className="mt-1 text-[9px] text-[var(--muted)]">
              {item.roleLabel}
              {" · "}
              {number(
                item.year,
              )}
              /
              {number(
                item.month,
              )}
            </p>

            <p className="mt-3 text-sm font-black text-[var(--brand)]">
              {money(
                item.amount,
              )}
            </p>

            {item.note && (
              <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">
                {item.note}
              </p>
            )}
          </article>
        ),
      )}
    </div>
  );
}

function WorkHistoryReports() {
  const [report, setReport] =
    useState<WorkHistoryResponse | null>(null);
  const [employees, setEmployees] =
    useState<EmployeeAccountSummary[]>([]);
  const [batches, setBatches] =
    useState<WorkBatchItem[]>([]);
  const [operations, setOperations] =
    useState<Array<{ id: string; name: string }>>([]);
  const [reviewers, setReviewers] =
    useState<PersonnelItem[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [workBatchId, setWorkBatchId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [workBatchSizeId, setWorkBatchSizeId] = useState("");
  const [status, setStatus] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("");
  const [reviewerId, setReviewerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBatch =
    useMemo(
      () =>
        batches.find(
          (batch) => batch.id === workBatchId,
        ) ?? null,
      [batches, workBatchId],
    );

  const sizeOptions =
    selectedBatch?.sizes ?? [];

  const filters =
    useMemo<WorkHistoryFilters>(
      () => ({
        ...(employeeId ? { employeeId } : {}),
        ...(workBatchId ? { workBatchId } : {}),
        ...(operationId ? { operationId } : {}),
        ...(workBatchSizeId ? { workBatchSizeId } : {}),
        ...(status ? { status } : {}),
        ...(reviewerId ? { reviewerId } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
      [
        employeeId,
        workBatchId,
        operationId,
        workBatchSizeId,
        status,
        reviewerId,
        from,
        to,
      ],
    );

  const load =
    useCallback(
      async (target: WorkHistoryFilters) => {
        if (target.from && target.to && target.from > target.to) {
          setError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.");
          return;
        }

        setLoading(true);
        setError(null);

        try {
          setReport(
            await getWorkHistoryReport(target),
          );
        } catch (caught) {
          setError(managerError(caught));
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(
    () => {
      void Promise.all([
        load({}),
        listEmployeeAccounts({
          page: 1,
          pageSize: 100,
        }).then((response) => setEmployees(response.items)),
        listBatches({
          page: 1,
          pageSize: 100,
        }).then((response) => setBatches(response.items)),
        listOperations(true).then((response) =>
          setOperations(
            response.items.map((item) => ({
              id: item.id,
              name: item.name,
            })),
          ),
        ),
        listPersonnel({
          page: 1,
          pageSize: 100,
        }).then((response) =>
          setReviewers(
            response.items.filter(
              (item) =>
                item.role === "MANAGER" ||
                item.role === "SUPERVISOR",
            ),
          ),
        ),
      ]).catch((caught) => {
        setError(managerError(caught));
      });
    },
    [load],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    void load(filters);
  }

  function reset() {
    setEmployeeId("");
    setWorkBatchId("");
    setOperationId("");
    setWorkBatchSizeId("");
    setStatus("");
    setReviewerId("");
    setFrom("");
    setTo("");
    void load({});
  }

  async function excel() {
    if (from && to && from > to) {
      setError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.");
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      await downloadWorkHistoryExcel(filters);
    } catch (caught) {
      setError(managerError(caught));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section>
      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="mb-5 rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <History className="size-4 text-[var(--brand)]" />
          <div>
            <p className="text-sm font-black">سوابق ریز عملیات</p>
            <p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">
              بر اساس شخص، سری‌کار، عملیات، سایز، وضعیت، تأییدکننده و بازه زمانی گزارش بگیرید.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter label="پرسنل">
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className={inputClass}
            >
              <option value="">همه افراد</option>
              {employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} — {roleLabel(item.role)}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="سری‌کار">
            <select
              value={workBatchId}
              onChange={(event) => {
                setWorkBatchId(event.target.value);
                setWorkBatchSizeId("");
              }}
              className={inputClass}
            >
              <option value="">همه سری‌کارها</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code}{batch.modelName ? ` — ${batch.modelName}` : ""}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="عملیات">
            <select
              value={operationId}
              onChange={(event) => setOperationId(event.target.value)}
              className={inputClass}
            >
              <option value="">همه عملیات‌ها</option>
              {operations.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.name}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="سایز">
            <select
              value={workBatchSizeId}
              onChange={(event) => setWorkBatchSizeId(event.target.value)}
              disabled={!workBatchId}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">
                {workBatchId ? "همه سایزهای سری" : "ابتدا سری‌کار را انتخاب کنید"}
              </option>
              {sizeOptions.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.label}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="وضعیت ثبت">
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as typeof status,
                )
              }
              className={inputClass}
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="APPROVED">تأییدشده</option>
              <option value="PENDING">در انتظار</option>
              <option value="REJECTED">ردشده</option>
            </select>
          </Filter>

          <Filter label="تأییدکننده">
            <select
              value={reviewerId}
              onChange={(event) => setReviewerId(event.target.value)}
              className={inputClass}
            >
              <option value="">همه تأییدکننده‌ها</option>
              {reviewers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName} — {roleLabel(item.role)}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="از تاریخ">
            <JalaliDateInput
              dir="ltr"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={inputClass}
            />
          </Filter>

          <Filter label="تا تاریخ">
            <JalaliDateInput
              dir="ltr"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={inputClass}
            />
          </Filter>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-xs font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            اعمال فیلتر
          </button>

          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-xl border border-[var(--line)] bg-white text-xs font-black text-[var(--muted)]"
          >
            پاک کردن فیلترها
          </button>

          <button
            type="button"
            disabled={downloading || loading}
            onClick={() => void excel()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102827] text-xs font-black text-white disabled:opacity-50"
          >
            {downloading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            دانلود Excel همین فیلتر
          </button>
        </div>
      </form>

      {loading && !report ? (
        <Loading />
      ) : report ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-5">
            <ReportStat label="ثبت‌ها" value={number(report.totals.entries)} />
            <ReportStat label="افراد" value={number(report.totals.employees)} />
            <ReportStat label="عملیات" value={number(report.totals.operations)} />
            <ReportStat label="تعداد قطعه" value={number(report.totals.quantity)} />
            <ReportStat label="مبلغ فیلتر" value={money(report.totals.amount)} strong />
          </div>

          {report.employeeSummary.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <p className="text-xs font-black">خلاصه به تفکیک نفر</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  جمع همین فیلتر برای هر فرد
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-right">
                  <thead className="bg-[var(--surface-soft)] text-[10px] text-[var(--muted)]">
                    <tr>
                      <Th>پرسنل</Th>
                      <Th>تعداد ثبت</Th>
                      <Th>تعداد قطعه</Th>
                      <Th>مبلغ</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] text-xs">
                    {report.employeeSummary.map((item) => (
                      <tr key={item.employeeId}>
                        <Td>
                          <div>
                            <p className="font-black">{item.employeeName}</p>
                            <p dir="ltr" className="mt-1 text-right text-[10px] text-[var(--muted)]">
                              {item.employeePhone}
                            </p>
                          </div>
                        </Td>
                        <Td>{number(item.entries)}</Td>
                        <Td>{number(item.quantity)}</Td>
                        <Td>
                          <span className="font-black text-[var(--brand)]">
                            {money(item.amount)}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.items.length === 0 ? (
            <Empty text="برای فیلتر انتخاب‌شده سابقه عملیاتی پیدا نشد." />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[1450px] w-full text-right">
                  <thead className="bg-[var(--surface-soft)] text-[10px] text-[var(--muted)]">
                    <tr>
                      <Th>تاریخ</Th>
                      <Th>پرسنل</Th>
                      <Th>سری‌کار</Th>
                      <Th>عملیات</Th>
                      <Th>سایز</Th>
                      <Th>تعداد</Th>
                      <Th>نرخ</Th>
                      <Th>مبلغ</Th>
                      <Th>وضعیت</Th>
                      <Th>تأییدکننده</Th>
                      <Th>زمان تأیید</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] text-xs">
                    {report.items.map((item) => (
                      <tr key={item.id}>
                        <Td>{date(item.createdAt)}</Td>
                        <Td>
                          <div>
                            <p className="font-black">{item.employeeName}</p>
                            <p dir="ltr" className="mt-1 text-right text-[10px] text-[var(--muted)]">
                              {item.employeePhone}
                            </p>
                          </div>
                        </Td>
                        <Td>
                          <div>
                            <p className="font-black">{item.batchCode}</p>
                            <p className="mt-1 text-[10px] text-[var(--muted)]">
                              {item.modelName ?? item.ownerName}
                            </p>
                          </div>
                        </Td>
                        <Td>{item.operationName}</Td>
                        <Td>{item.sizeLabel}</Td>
                        <Td>{number(item.quantity)}</Td>
                        <Td>{money(item.unitRate)}</Td>
                        <Td>
                          <span className="font-black text-[var(--brand)]">
                            {money(item.totalAmount)}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                              item.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.status === "APPROVED"
                              ? "تأییدشده"
                              : item.status === "PENDING"
                                ? "در انتظار"
                                : "ردشده"}
                          </span>
                        </Td>
                        <Td>{item.reviewer?.fullName ?? "—"}</Td>
                        <Td>{date(item.reviewedAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function OwnerReports() {
  const [
    ownerOptions,
    setOwnerOptions,
  ] =
    useState<
      OwnerItem[]
    >([]);

  const [
    batchOptions,
    setBatchOptions,
  ] =
    useState<
      WorkBatchItem[]
    >([]);

  const [
    report,
    setReport,
  ] =
    useState<
      OwnerReportResponse |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    downloading,
    setDownloading,
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
    detailTab,
    setDetailTab,
  ] =
    useState<OwnerDetailTab>(
      "owners",
    );

  const [
    ownerId,
    setOwnerId,
  ] =
    useState("");

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
    workBatchId,
    setWorkBatchId,
  ] =
    useState("");

  const [
    modelName,
    setModelName,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<
      BatchStatus |
      ""
    >("");

  const [
    from,
    setFrom,
  ] =
    useState("");

  const [
    to,
    setTo,
  ] =
    useState("");

  const filters =
    useMemo<
      OwnerReportFilters
    >(
      () => ({
        ...(ownerId
          ? {
              ownerId,
            }
          : {}),

        ...(q.trim()
          ? {
              q:
                q.trim(),
            }
          : {}),

        ...(active
          ? {
              isActive:
                active,
            }
          : {}),

        ...(workBatchId
          ? {
              workBatchId,
            }
          : {}),

        ...(modelName.trim()
          ? {
              modelName:
                modelName.trim(),
            }
          : {}),

        ...(status
          ? {
              status,
            }
          : {}),

        ...(from
          ? {
              from,
            }
          : {}),

        ...(to
          ? {
              to,
            }
          : {}),
      }),
      [
        active,
        from,
        modelName,
        ownerId,
        q,
        status,
        to,
        workBatchId,
      ],
    );

  const load =
    useCallback(
      async (
        target:
          OwnerReportFilters,
      ) => {
        if (
          target.from &&
          target.to &&
          target.from >
            target.to
        ) {
          setError(
            "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.",
          );

          return;
        }

        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const response =
            await getOwnerReport(
              target,
            );

          setReport(
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
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void Promise.all([
        load({}),

        listOwners().then(
          (
            response,
          ) => {
            setOwnerOptions(
              response.items,
            );
          },
        ),

        listBatches({
          page:
            1,

          pageSize:
            100,
        }).then(
          (
            response,
          ) => {
            setBatchOptions(
              response.items,
            );
          },
        ),
      ]).catch(
        (
          caught,
        ) => {
          setError(
            managerError(
              caught,
            ),
          );
        },
      );
    },
    [
      load,
    ],
  );

  function submit(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    void load(
      filters,
    );
  }

  function reset() {
    setOwnerId("");
    setQ("");
    setActive("");
    setWorkBatchId("");
    setModelName("");
    setStatus("");
    setFrom("");
    setTo("");

    void load({});
  }

  async function excel() {
    if (
      from &&
      to &&
      from >
        to
    ) {
      setError(
        "تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.",
      );

      return;
    }

    setDownloading(
      true,
    );

    setError(
      null,
    );

    try {
      await downloadOwnerReportExcel(
        filters,
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
      setDownloading(
        false,
      );
    }
  }

  return (
    <section>
      {error && (
        <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 p-4 text-xs font-bold leading-6 text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={
          submit
        }
        className="mb-5 rounded-[24px] border border-[var(--line)] bg-white p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="size-4 text-[var(--brand)]" />

          <p className="text-sm font-black">
            فیلتر گزارش صاحبکارها
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter
            label="صاحبکار"
          >
            <select
              value={
                ownerId
              }
              onChange={(
                event,
              ) =>
                setOwnerId(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                همه صاحبکارها
              </option>

              {ownerOptions.map(
                (
                  owner,
                ) => (
                  <option
                    key={
                      owner.id
                    }
                    value={
                      owner.id
                    }
                  >
                    {owner.name}
                  </option>
                ),
              )}
            </select>
          </Filter>

          <Filter
            label="جست‌وجو"
          >
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
              className={
                inputClass
              }
              placeholder="نام یا موبایل"
            />
          </Filter>

          <Filter
            label="سری‌کار"
          >
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
                همه سری‌ها
              </option>

              {batchOptions.map(
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
                    {batch.modelName
                      ? ` — ${batch.modelName}`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </Filter>

          <Filter
            label="مدل"
          >
            <input
              value={
                modelName
              }
              onChange={(
                event,
              ) =>
                setModelName(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
              placeholder="مثلاً مام‌فیت"
            />
          </Filter>

          <Filter
            label="وضعیت سری"
          >
            <select
              value={
                status
              }
              onChange={(
                event,
              ) =>
                setStatus(
                  event.target
                    .value as
                    typeof status,
                )
              }
              className={
                inputClass
              }
            >
              <option value="">
                همه وضعیت‌ها
              </option>

              <option value="ACTIVE">
                فعال
              </option>

              <option value="COMPLETED">
                تکمیل‌شده
              </option>

              <option value="CANCELLED">
                لغوشده
              </option>

              <option value="ARCHIVED">
                بایگانی
              </option>
            </select>
          </Filter>

          <Filter
            label="وضعیت صاحبکار"
          >
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
                همه
              </option>

              <option value="true">
                فعال
              </option>

              <option value="false">
                غیرفعال
              </option>
            </select>
          </Filter>

          <Filter
            label="از تاریخ"
          >
            <JalaliDateInput
              dir="ltr"
              value={
                from
              }
              onChange={(
                event,
              ) =>
                setFrom(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            />
          </Filter>

          <Filter
            label="تا تاریخ"
          >
            <JalaliDateInput
              dir="ltr"
              value={
                to
              }
              onChange={(
                event,
              ) =>
                setTo(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            />
          </Filter>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="submit"
            disabled={
              loading
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-xs font-black text-white disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            اعمال فیلتر
          </button>

          <button
            type="button"
            onClick={
              reset
            }
            className="h-11 rounded-xl border border-[var(--line)] text-xs font-black text-[var(--muted)]"
          >
            پاک کردن فیلترها
          </button>

          <button
            type="button"
            disabled={
              downloading ||
              loading
            }
            onClick={
              () => {
                void excel();
              }
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102827] text-xs font-black text-white disabled:opacity-50"
          >
            {downloading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}

            دانلود Excel
          </button>
        </div>
      </form>

      {loading &&
      !report ? (
        <Loading />
      ) : report ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-6">
            <ReportStat
              label="صاحبکار"
              value={
                number(
                  report.totals
                    .owners,
                )
              }
            />

            <ReportStat
              label="طلب بازه"
              value={
                money(
                  report.totals
                    .periodDue,
                )
              }
            />

            <ReportStat
              label="دریافتی بازه"
              value={
                money(
                  report.totals
                    .periodReceived,
                )
              }
            />

            <ReportStat
              label="طلب کل"
              value={
                money(
                  report.totals
                    .lifetimeDue,
                )
              }
            />

            <ReportStat
              label="دریافتی کل"
              value={
                money(
                  report.totals
                    .lifetimeReceived,
                )
              }
            />

            <ReportStat
              label="مانده فعلی"
              value={
                money(
                  report.totals
                    .currentBalance,
                )
              }
              strong
            />
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-white p-1.5">
            <ReportTab
              active={
                detailTab ===
                "owners"
              }
              label={`صاحبکارها (${number(
                report.items
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "owners",
                  )
              }
            />

            <ReportTab
              active={
                detailTab ===
                "batches"
              }
              label={`سری‌ها (${number(
                report.batches
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "batches",
                  )
              }
            />

            <ReportTab
              active={
                detailTab ===
                "payments"
              }
              label={`دریافتی‌ها (${number(
                report.payments
                  .length,
              )})`}
              onClick={
                () =>
                  setDetailTab(
                    "payments",
                  )
              }
            />
          </div>

          {detailTab ===
          "owners" ? (
            <OwnerSummaryTable
              report={
                report
              }
            />
          ) : detailTab ===
            "batches" ? (
            <OwnerBatchesTable
              report={
                report
              }
            />
          ) : (
            <OwnerPaymentsTable
              report={
                report
              }
            />
          )}
        </>
      ) : null}
    </section>
  );
}

function OwnerSummaryTable({
  report,
}: {
  report:
    OwnerReportResponse;
}) {
  if (
    report.items.length ===
    0
  ) {
    return (
      <Empty text="برای این فیلتر صاحبکاری پیدا نشد." />
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-right">
          <thead className="bg-[var(--surface-soft)] text-[10px] text-[var(--muted)]">
            <tr>
              <Th>
                صاحبکار
              </Th>

              <Th>
                سری‌های فیلتر
              </Th>

              <Th>
                طلب بازه
              </Th>

              <Th>
                دریافتی بازه
              </Th>

              <Th>
                طلب کل
              </Th>

              <Th>
                دریافتی کل
              </Th>

              <Th>
                عمومی
              </Th>

              <Th>
                مانده
              </Th>
            </tr>
          </thead>

          <tbody>
            {report.items.map(
              (
                item,
              ) => (
                <tr
                  key={
                    item.id
                  }
                  className="border-t border-[var(--line)] text-[10px]"
                >
                  <Td>
                    <p className="font-black">
                      {item.name}
                    </p>

                    {item.phone && (
                      <p
                        dir="ltr"
                        className="mt-1 text-right text-[9px] text-[var(--muted)]"
                      >
                        {item.phone}
                      </p>
                    )}
                  </Td>

                  <Td>
                    {number(
                      item.matchedBatchCount,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.periodDue,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.periodReceived,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.lifetimeDue,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.lifetimeReceived,
                    )}
                  </Td>

                  <Td>
                    {money(
                      item.unallocatedReceived,
                    )}
                  </Td>

                  <Td>
                    <span className="font-black text-[var(--brand)]">
                      {money(
                        item.currentBalance,
                      )}
                    </span>
                  </Td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerBatchesTable({
  report,
}: {
  report:
    OwnerReportResponse;
}) {
  if (
    report.batches.length ===
    0
  ) {
    return (
      <Empty text="سری‌کاری با این فیلتر پیدا نشد." />
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {report.batches.map(
        (
          batch,
        ) => (
          <article
            key={
              batch.id
            }
            className="rounded-[22px] border border-[var(--line)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black">
                  {batch.code}
                </p>

                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {batch.ownerName}
                  {batch.modelName
                    ? ` · ${batch.modelName}`
                    : ""}
                </p>
              </div>

              <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[9px] font-black">
                {statusLabel(
                  batch.status,
                )}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SmallStat
                label="تعداد"
                value={`${number(
                  batch.totalQuantity,
                )} عدد`}
              />

              <SmallStat
                label="طلب"
                value={
                  money(
                    batch.due,
                  )
                }
              />

              <SmallStat
                label="دریافتی متصل"
                value={
                  money(
                    batch.linkedReceived,
                  )
                }
              />

              <SmallStat
                label="مانده متصل"
                value={
                  money(
                    batch.linkedBalance,
                  )
                }
                strong
              />
            </div>

            <p className="mt-3 text-[9px] text-[var(--muted)]">
              قیمت‌گذاری:{" "}
              {batch.ownerPricingLabel}
              {" · "}
              شروع:{" "}
              {date(
                batch.startDate,
              )}
            </p>
          </article>
        ),
      )}
    </div>
  );
}

function OwnerPaymentsTable({
  report,
}: {
  report:
    OwnerReportResponse;
}) {
  if (
    report.payments.length ===
    0
  ) {
    return (
      <Empty text="در این بازه دریافتی‌ای پیدا نشد." />
    );
  }

  return (
    <div className="space-y-2">
      {report.payments.map(
        (
          item,
        ) => (
          <article
            key={
              item.id
            }
            className="rounded-[20px] border border-[var(--line)] bg-white p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black">
                  {item.ownerName}
                </p>

                <p className="mt-1 text-[9px] text-[var(--muted)]">
                  {item.batchCode
                    ? `${item.batchCode} · ${item.modelName ?? ""}`
                    : "دریافتی عمومی"}
                  {" · "}
                  {date(
                    item.paidAt,
                  )}
                </p>

                <p className="mt-1 text-[9px] text-[var(--muted)]">
                  ثبت‌کننده:{" "}
                  {item.recordedBy}
                </p>
              </div>

              <p className="text-sm font-black text-emerald-700">
                {money(
                  item.amount,
                )}
              </p>
            </div>

            {item.note && (
              <p className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-[10px] leading-5 text-[var(--muted)]">
                {item.note}
              </p>
            )}
          </article>
        ),
      )}
    </div>
  );
}

function Filter({
  label,
  children,
}: {
  label:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-black text-[var(--muted)]">
        {label}
      </label>

      {children}
    </div>
  );
}

function ReportStat({
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
          : "border border-[var(--line)] bg-white"
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
        {value}
      </p>
    </div>
  );
}

function ReportTab({
  active,
  label,
  onClick,
}: {
  active:
    boolean;

  label:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`h-10 shrink-0 rounded-xl px-4 text-[10px] font-black transition ${
        active
          ? "bg-[var(--brand)] text-white"
          : "text-[var(--muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function SmallStat({
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
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 font-black">
      {children}
    </th>
  );
}

function Td({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3">
      {children}
    </td>
  );
}

function Loading() {
  return (
    <div className="rounded-[26px] border border-[var(--line)] bg-white p-14 text-center">
      <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--brand)]" />

      <p className="mt-3 text-xs font-bold text-[var(--muted)]">
        در حال آماده‌سازی گزارش...
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
      <FileSpreadsheet className="mx-auto size-8 text-slate-300" />

      <p className="mt-4 text-sm font-black">
        نتیجه‌ای وجود ندارد
      </p>

      <p className="mt-2 text-xs text-[var(--muted)]">
        {text}
      </p>
    </div>
  );
}
