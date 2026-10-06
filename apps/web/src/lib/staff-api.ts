import {
  apiFetch,
} from "@/lib/api";

import type {
  EmployeeAccountResponse,
  WorkEntryStatus,
} from "@/lib/worker-api";

export type TimeEntryStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type MyTimeEntry = {
  id: string;
  workDate: string;
  startedAt: string | null;
  endedAt: string | null;
  minutesWorked: number;
  note: string | null;
  status: TimeEntryStatus;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type MonthlySalarySnapshot = {
  id: string;
  year: number;
  month: number;
  amount: string;
  note: string | null;
};

export type MyTimeEntriesResponse = {
  entries: MyTimeEntry[];
  monthlySalaries: MonthlySalarySnapshot[];
  currentDefaultMonthlySalary: string;
};

export type CreateTimeEntryInput = {
  workDate: string;
  minutesWorked: number;
  note?: string;
};

export type SupervisorPendingWorkItem = {
  id: string;

  worker: {
    id: string;
    fullName: string;
  };

  batchOperationId?: string;
  batchId?: string;
  batchCode?: string;
  modelName?:
    | string
    | null;
  operationId?: string;
  operationName?: string;

  quantity: number;

  workerNote?: string | null;

  status?: WorkEntryStatus;
  createdAt: string;
};

export type PendingWorkResponse = {
  items: SupervisorPendingWorkItem[];
};

export type PendingTimeItem = {
  id: string;

  employee: {
    id: string;
    fullName: string;
    role: string;
  };

  workDate: string;
  startedAt: string | null;
  endedAt: string | null;
  minutesWorked: number;
  note: string | null;
  status: TimeEntryStatus;
  createdAt: string;
};

export type PendingTimeResponse = {
  items: PendingTimeItem[];
};

export function getMyTimeEntries(): Promise<MyTimeEntriesResponse> {
  return apiFetch<MyTimeEntriesResponse>(
    "/time-entries/mine",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function createMyTimeEntry(
  input: CreateTimeEntryInput,
): Promise<unknown> {
  return apiFetch(
    "/time-entries",
    {
      method:
        "POST",
      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

export function getMyStaffAccount(): Promise<EmployeeAccountResponse> {
  return apiFetch<EmployeeAccountResponse>(
    "/employee-account/mine",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getPendingWorkerEntries(): Promise<PendingWorkResponse> {
  return apiFetch<PendingWorkResponse>(
    "/work-entries/pending",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function reviewWorkerEntry(
  id: string,
  action:
    | "approve"
    | "reject",
  reviewerNote?: string,
): Promise<unknown> {
  return apiFetch(
    `/work-entries/${id}/${action}`,
    {
      method:
        "POST",
      body:
        JSON.stringify({
          ...(reviewerNote?.trim()
            ? {
                reviewerNote:
                  reviewerNote.trim(),
              }
            : {}),
        }),
    },
  );
}

export function getPendingAssistantTimeEntries(): Promise<PendingTimeResponse> {
  return apiFetch<PendingTimeResponse>(
    "/time-entries/pending",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function reviewTimeEntry(
  id: string,
  action:
    | "approve"
    | "reject",
  reviewerNote?: string,
): Promise<unknown> {
  return apiFetch(
    `/time-entries/${id}/${action}`,
    {
      method:
        "POST",
      body:
        JSON.stringify({
          ...(reviewerNote?.trim()
            ? {
                reviewerNote:
                  reviewerNote.trim(),
              }
            : {}),
        }),
    },
  );
}
