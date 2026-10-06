import {
  ApiError,
  apiFetch,
} from "@/lib/api";

import type {
  UserRole,
} from "@/lib/auth";

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type QueryValue =
  | string
  | number
  | boolean
  | undefined;

function queryPath(
  path: string,
  values: Record<
    string,
    QueryValue
  >,
): string {
  const params =
    new URLSearchParams();

  Object.entries(
    values,
  ).forEach(
    ([
      key,
      value,
    ]) => {
      if (
        value === undefined ||
        value === ""
      ) {
        return;
      }

      params.set(
        key,
        String(
          value,
        ),
      );
    },
  );

  const query =
    params.toString();

  return query
    ? `${path}?${query}`
    : path;
}

// =========================================================
// PERSONNEL
// =========================================================

export type PersonnelItem = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;

  compensationType:
    | "NONE"
    | "PIECE_RATE"
    | "FIXED_MONTHLY";

  isActive: boolean;

  defaultMonthlySalary:
    | string
    | null;

  phoneVerifiedAt:
    | string
    | null;

  profileTitle:
    | string
    | null;

  profileBio:
    | string
    | null;

  hasProfilePhoto: boolean;
  profilePhotoVersion: string;

  createdAt: string;
  updatedAt: string;
};

export type PersonnelListResponse = {
  items:
    PersonnelItem[];

  pagination:
    Pagination;
};

export type PersonnelInput = {
  fullName: string;
  phone: string;
  role: UserRole;
  defaultMonthlySalary?: string;
};

export function listPersonnel(
  params: {
    q?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PersonnelListResponse> {
  return apiFetch<PersonnelListResponse>(
    queryPath(
      "/admin/personnel",
      params,
    ),
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function createPersonnel(
  input:
    PersonnelInput,
): Promise<PersonnelItem> {
  return apiFetch<PersonnelItem>(
    "/admin/personnel",
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

export function updatePersonnel(
  id: string,
  input:
    Partial<PersonnelInput>,
): Promise<PersonnelItem> {
  return apiFetch<PersonnelItem>(
    `/admin/personnel/${id}`,
    {
      method:
        "PATCH",
      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

export function setPersonnelActive(
  id: string,
  active: boolean,
): Promise<PersonnelItem> {
  return apiFetch<PersonnelItem>(
    `/admin/personnel/${id}/${
      active
        ? "activate"
        : "deactivate"
    }`,
    {
      method:
        "POST",
      body:
        JSON.stringify({}),
    },
  );
}

// =========================================================
// OWNERS
// =========================================================

export type OwnerItem = {
  id: string;
  name: string;

  phone:
    | string
    | null;

  note:
    | string
    | null;

  isActive: boolean;
};

export type OwnerListResponse = {
  items:
    OwnerItem[];
};

export type OwnerInput = {
  name: string;
  phone?: string;
  note?: string;
};

export function listOwners(
  params: {
    q?: string;
    isActive?: boolean;
  } = {},
): Promise<OwnerListResponse> {
  return apiFetch<OwnerListResponse>(
    queryPath(
      "/admin/owners",
      params,
    ),
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function createOwner(
  input:
    OwnerInput,
): Promise<OwnerItem> {
  return apiFetch<OwnerItem>(
    "/admin/owners",
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

export function updateOwner(
  id: string,
  input:
    Partial<OwnerInput>,
): Promise<OwnerItem> {
  return apiFetch<OwnerItem>(
    `/admin/owners/${id}`,
    {
      method:
        "PATCH",
      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

export function setOwnerActive(
  id: string,
  active: boolean,
): Promise<OwnerItem> {
  return apiFetch<OwnerItem>(
    `/admin/owners/${id}/${
      active
        ? "activate"
        : "deactivate"
    }`,
    {
      method:
        "POST",
      body:
        JSON.stringify({}),
    },
  );
}

export function deleteOwner(
  id: string,
): Promise<{
  mode:
    | "DELETED"
    | "DEACTIVATED";
  id: string;
}> {
  return apiFetch(
    `/admin/owners/${id}`,
    {
      method:
        "DELETE",
    },
  );
}

// =========================================================
// OPERATIONS + RATE HISTORY
// =========================================================

export type OperationItem = {
  id: string;
  name: string;
  isActive: boolean;

  currentRate:
    | string
    | null;

  currentRateEffectiveFrom:
    | string
    | null;

  createdAt: string;
  updatedAt: string;
};

export type OperationRateHistory = {
  id: string;
  amount: string;
  effectiveFrom: string;

  effectiveTo:
    | string
    | null;
};

export type OperationDetail =
  OperationItem & {
    rateHistory:
      OperationRateHistory[];
  };

export type OperationsResponse = {
  items:
    OperationItem[];
};

export type OperationChecklistItem =
  OperationItem & {
    selected: boolean;
  };

export type OperationChecklistResponse = {
  items:
    OperationChecklistItem[];
};

export function listOperations(
  includeInactive =
    false,
): Promise<OperationsResponse> {
  return apiFetch<OperationsResponse>(
    queryPath(
      "/admin/operations",
      {
        includeInactive,
      },
    ),
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getOperationChecklist(): Promise<OperationChecklistResponse> {
  return apiFetch<OperationChecklistResponse>(
    "/admin/operations/checklist",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getOperation(
  id: string,
): Promise<OperationDetail> {
  return apiFetch<OperationDetail>(
    `/admin/operations/${id}`,
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function createOperation(
  input: {
    name: string;
    initialRate: string;
  },
): Promise<OperationItem> {
  return apiFetch<OperationItem>(
    "/admin/operations",
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

export function updateOperation(
  id: string,
  input: {
    name?: string;
    isActive?: boolean;
  },
): Promise<OperationItem> {
  return apiFetch<OperationItem>(
    `/admin/operations/${id}`,
    {
      method:
        "PATCH",
      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

export function changeOperationRate(
  id: string,
  amount: string,
): Promise<{
  operationId: string;
  amount: string;
  effectiveFrom: string;
}> {
  return apiFetch(
    `/admin/operations/${id}/rates`,
    {
      method:
        "POST",
      body:
        JSON.stringify({
          amount,
        }),
    },
  );
}

export function deleteOperation(
  id: string,
): Promise<{
  mode:
    | "DELETED"
    | "DEACTIVATED";
  id: string;
}> {
  return apiFetch(
    `/admin/operations/${id}`,
    {
      method:
        "DELETE",
    },
  );
}

// =========================================================
// WORK BATCHES
// =========================================================

export type BatchStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type OwnerPricingType =
  | "PER_PIECE"
  | "FIXED_TOTAL";

export type BatchOperationItem = {
  batchOperationId: string;
  operationId: string;
  name: string;
  isOperationActive: boolean;
  isBatchOperationActive: boolean;
  targetQuantity: number;
  claimedQuantity: number;
  approvedQuantity: number;
  unitRate: string;
  remainingQuantity: number;
};

export type WorkBatchSizeItem = {
  id: string;
  label: string;
  quantity: number;
  sortOrder: number;
  isActive: boolean;
};

export type WorkBatchItem = {
  id: string;
  code: string;

  owner:
    | {
        id: string;
        name: string;
        isActive: boolean;
      }
    | null;

  modelName:
    | string
    | null;
  totalQuantity: number;

  ownerPricingType:
    OwnerPricingType;

  ownerUnitPrice:
    | string
    | null;

  ownerFixedAmount:
    | string
    | null;

  status:
    BatchStatus;

  startDate:
    | string
    | null;

  completedAt:
    | string
    | null;

  note:
    | string
    | null;

  operations:
    BatchOperationItem[];

  sizes:
    WorkBatchSizeItem[];
};

export type WorkBatchListResponse = {
  items:
    WorkBatchItem[];

  pagination:
    Pagination;
};

export type CreateWorkBatchInput = {
  code: string;
  ownerId: string;
  modelName?: string;
  totalQuantity: number;

  ownerPricingType:
    OwnerPricingType;

  ownerUnitPrice?: string;
  ownerFixedAmount?: string;
  startDate?: string;
  note?: string;

  operations: Array<{
    operationId: string;
    targetQuantity?: number;
    unitRate: string;
  }>;

  sizes: Array<{
    label: string;
    quantity: number;
  }>;
};

export function listBatches(
  params: {
    q?: string;
    ownerId?: string;
    status?: BatchStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<WorkBatchListResponse> {
  return apiFetch<WorkBatchListResponse>(
    queryPath(
      "/admin/batches",
      params,
    ),
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getBatch(
  id: string,
): Promise<WorkBatchItem> {
  return apiFetch<WorkBatchItem>(
    `/admin/batches/${id}`,
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function createWorkBatch(
  input:
    CreateWorkBatchInput,
): Promise<WorkBatchItem> {
  return apiFetch<WorkBatchItem>(
    "/admin/batches",
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

export function updateWorkBatch(
  id: string,
  input:
    CreateWorkBatchInput,
): Promise<WorkBatchItem> {
  return apiFetch<WorkBatchItem>(
    `/admin/batches/${id}`,
    {
      method:
        "PATCH",
      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

export function changeBatchStatus(
  id: string,
  status:
    BatchStatus,
): Promise<WorkBatchItem> {
  return apiFetch<WorkBatchItem>(
    `/admin/batches/${id}/status`,
    {
      method:
        "PATCH",
      body:
        JSON.stringify({
          status,
        }),
    },
  );
}
export function deleteWorkBatch(
  id: string,
): Promise<{
  mode: "DELETED";
  id: string;
}> {
  return apiFetch(
    `/admin/batches/${id}`,
    {
      method:
        "DELETE",
    },
  );
}

// =========================================================
// EMPLOYEE ACCOUNTS
// =========================================================

export type PaymentMethod =
  | "CARD_TO_CARD"
  | "BANK_TRANSFER"
  | "CASH"
  | "OTHER";

export type EmployeeAccountSummary = {
  id: string;
  fullName: string;
  phone: string;

  role:
    | "WORKER"
    | "SUPERVISOR"
    | "ASSISTANT";

  compensationType:
    | "PIECE_RATE"
    | "FIXED_MONTHLY";

  isActive: boolean;

  defaultMonthlySalary:
    | string
    | null;

  earned: string;
  pending: string;
  paid: string;
  balance: string;

  approvedWorkEntries: number;
  pendingWorkEntries: number;
};

export type EmployeeAccountsResponse = {
  items:
    EmployeeAccountSummary[];

  pagination:
    Pagination;
};

export type EmployeePaymentItem = {
  id: string;
  amount: string;

  paymentMethod:
    PaymentMethod;

  paidAt: string;

  note:
    | string
    | null;

  hasReceipt: boolean;

  receiptOriginalName:
    | string
    | null;

  recordedBy: {
    id: string;
    fullName: string;
  };

  createdAt: string;
};

export type EmployeeAccountDetail = {
  employee: {
    id: string;
    fullName: string;
    phone: string;

    role:
      | "WORKER"
      | "SUPERVISOR"
      | "ASSISTANT";

    compensationType:
      | "PIECE_RATE"
      | "FIXED_MONTHLY";

    isActive: boolean;

    defaultMonthlySalary:
      | string
      | null;
  };

  totals: {
    earned: string;
    pending: string;
    paid: string;
    balance: string;
    approvedWorkEntries: number;
    pendingWorkEntries: number;
  };

  monthlySalaries: Array<{
    id: string;
    year: number;
    month: number;
    amount: string;

    note:
      | string
      | null;
  }>;

  payments:
    EmployeePaymentItem[];
};

export type RecordEmployeePaymentInput = {
  amount: string;
  paymentMethod:
    PaymentMethod;

  note?: string;

  receipt?:
    File;
};

export function listEmployeeAccounts(
  params: {
    q?: string;

    role?:
      | "WORKER"
      | "SUPERVISOR"
      | "ASSISTANT";

    isActive?: boolean;

    page?: number;
    pageSize?: number;
  } = {},
): Promise<EmployeeAccountsResponse> {
  return apiFetch<EmployeeAccountsResponse>(
    queryPath(
      "/admin/employee-accounts",
      params,
    ),
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

export function getEmployeeAccount(
  employeeId: string,
): Promise<EmployeeAccountDetail> {
  return apiFetch<EmployeeAccountDetail>(
    `/admin/employee-accounts/${employeeId}`,
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

const MANAGER_API_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/+$/, "");

async function managerRawFetch(
  path: string,
  init:
    RequestInit,
): Promise<Response> {
  const response =
    await fetch(
      `${MANAGER_API_URL}/api${path}`,
      {
        ...init,

        credentials:
          "include",
      },
    );

  if (
    response.ok
  ) {
    return response;
  }

  let message =
    `خطای سرور (${response.status})`;

  try {
    const payload =
      await response.json() as {
        message?:
          | string
          | string[];
      };

    if (
      Array.isArray(
        payload.message,
      )
    ) {
      message =
        payload.message.join(
          "، ",
        );
    } else if (
      typeof payload.message ===
      "string"
    ) {
      message =
        payload.message;
    }
  } catch {
    // Response can be empty.
  }

  throw new Error(
    message,
  );
}

export async function recordEmployeePayment(
  employeeId: string,
  input:
    RecordEmployeePaymentInput,
): Promise<void> {
  const form =
    new FormData();

  form.append(
    "amount",
    input.amount,
  );

  form.append(
    "paymentMethod",
    input.paymentMethod,
  );

  if (
    input.note?.trim()
  ) {
    form.append(
      "note",
      input.note.trim(),
    );
  }

  if (
    input.receipt
  ) {
    form.append(
      "receipt",
      input.receipt,
    );
  }

  await managerRawFetch(
    `/admin/employee-accounts/${employeeId}/payments`,
    {
      method:
        "POST",

      body:
        form,
    },
  );
}

async function fetchManagerReceipt(
  paymentId: string,
): Promise<Blob> {
  const response =
    await managerRawFetch(
      `/admin/employee-accounts/payments/${paymentId}/receipt`,
      {
        method:
          "GET",
      },
    );

  return response.blob();
}

export async function openManagerEmployeeReceipt(
  paymentId: string,
): Promise<void> {
  const blob =
    await fetchManagerReceipt(
      paymentId,
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  window.open(
    url,
    "_blank",
    "noopener,noreferrer",
  );

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    60_000,
  );
}

export async function shareManagerEmployeeReceipt(
  paymentId: string,
  employeeName: string,
): Promise<void> {
  const blob =
    await fetchManagerReceipt(
      paymentId,
    );

  const extension =
    blob.type ===
    "application/pdf"
      ? "pdf"
      : blob.type ===
          "image/png"
        ? "png"
        : "jpg";

  const file =
    new File(
      [
        blob,
      ],
      `receipt-${paymentId}.${extension}`,
      {
        type:
          blob.type,
      },
    );

  try {
    if (
      navigator.share
    ) {
      await navigator.share({
        title:
          `رسید پرداخت ${employeeName}`,

        text:
          `رسید پرداخت ${employeeName}`,

        files: [
          file,
        ],
      });

      return;
    }
  } catch (
    error
  ) {
    if (
      error instanceof
        DOMException &&
      error.name ===
        "AbortError"
    ) {
      return;
    }
  }

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href =
    url;

  anchor.download =
    `receipt-${paymentId}.${extension}`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(
    url,
  );
}
// =========================================================
// MANAGER APPROVALS
// =========================================================

export type PendingWorkEntry = {
  id: string;

  worker: {
    id: string;
    fullName: string;
  };

  batchOperationId: string;
  batchId: string;
  batchCode: string;
  modelName:
    | string
    | null;
  workBatchSizeId: string;
  sizeLabel: string;
  operationId: string;
  operationName: string;

  quantity: number;

  workerNote:
    | string
    | null;

  status: "PENDING";

  createdAt: string;

  targetQuantity: number;
  claimedQuantity: number;
  approvedQuantity: number;
  remainingQuantity: number;

  unitRate: string;
  totalAmount: string;
};

export type PendingWorkEntriesResponse = {
  items:
    PendingWorkEntry[];
};

export type PendingTimeEntry = {
  id: string;

  employee: {
    id: string;
    fullName: string;

    role:
      | "SUPERVISOR"
      | "ASSISTANT";
  };

  workDate: string;

  startedAt:
    | string
    | null;

  endedAt:
    | string
    | null;

  minutesWorked: number;

  note:
    | string
    | null;

  status: "PENDING";

  createdAt: string;

  defaultMonthlySalary:
    | string
    | null;
};

export type PendingTimeEntriesResponse = {
  items:
    PendingTimeEntry[];
};

export function listPendingWorkEntries(): Promise<PendingWorkEntriesResponse> {
  return apiFetch<PendingWorkEntriesResponse>(
    "/work-entries/pending",
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

export function reviewWorkEntry(
  id: string,

  decision:
    | "approve"
    | "reject",

  reviewerNote?:
    string,
): Promise<unknown> {
  return apiFetch(
    `/work-entries/${id}/${decision}`,
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

export function listPendingTimeEntries(): Promise<PendingTimeEntriesResponse> {
  return apiFetch<PendingTimeEntriesResponse>(
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

  decision:
    | "approve"
    | "reject",

  reviewerNote?:
    string,
): Promise<unknown> {
  return apiFetch(
    `/time-entries/${id}/${decision}`,
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

// =========================================================
// OWNER ACCOUNTS
// =========================================================

export type OwnerAccountSummary = {
  id: string;
  name: string;

  phone:
    | string
    | null;

  isActive: boolean;

  batchCount: number;

  due: string;
  received: string;
  unallocatedReceived: string;
  balance: string;
};

export type OwnerAccountsResponse = {
  items:
    OwnerAccountSummary[];

  pagination:
    Pagination;
};

export type OwnerAccountBatch = {
  id: string;
  code: string;
  modelName:
    | string
    | null;
  totalQuantity: number;

  status:
    BatchStatus;

  ownerPricingType:
    OwnerPricingType;

  ownerUnitPrice:
    | string
    | null;

  ownerFixedAmount:
    | string
    | null;

  due: string;
  received: string;
  balance: string;

  startDate:
    | string
    | null;

  completedAt:
    | string
    | null;
};

export type OwnerPaymentItem = {
  id: string;
  amount: string;
  paidAt: string;

  note:
    | string
    | null;

  batch:
    | {
        id: string;
        code: string;
        modelName:
          | string
          | null;
      }
    | null;

  recordedBy: {
    id: string;
    fullName: string;
  };

  createdAt: string;
};

export type OwnerAccountDetail = {
  owner: {
    id: string;
    name: string;

    phone:
      | string
      | null;

    note:
      | string
      | null;

    isActive: boolean;
  };

  totals: {
    due: string;
    received: string;
    unallocatedReceived: string;
    balance: string;
  };

  batches:
    OwnerAccountBatch[];

  payments:
    OwnerPaymentItem[];
};

export function listOwnerAccounts(
  params: {
    q?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<OwnerAccountsResponse> {
  return apiFetch<OwnerAccountsResponse>(
    queryPath(
      "/admin/owner-accounts",
      params,
    ),
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

export function getOwnerAccount(
  ownerId: string,
): Promise<OwnerAccountDetail> {
  return apiFetch<OwnerAccountDetail>(
    `/admin/owner-accounts/${ownerId}`,
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

export function recordOwnerPayment(
  ownerId: string,

  input: {
    amount: string;
    workBatchId?: string;
    note?: string;
  },
): Promise<unknown> {
  return apiFetch(
    `/admin/owner-accounts/${ownerId}/payments`,
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
// =========================================================
// REPORTS
// =========================================================

export type EmployeeReportFilters = {
  employeeId?: string;
  q?: string;

  role?:
    | "WORKER"
    | "SUPERVISOR"
    | "ASSISTANT";

  isActive?:
    | "true"
    | "false";

  from?: string;
  to?: string;
};

export type EmployeeReportItem = {
  id: string;
  fullName: string;
  phone: string;

  role:
    | "WORKER"
    | "SUPERVISOR"
    | "ASSISTANT";

  roleLabel: string;

  compensationType:
    | "PIECE_RATE"
    | "FIXED_MONTHLY";

  compensationLabel: string;

  isActive: boolean;

  defaultMonthlySalary:
    | string
    | null;

  periodEarned: string;
  periodPaid: string;
  pendingAmount: string;

  lifetimeEarned: string;
  lifetimePaid: string;
  currentBalance: string;

  approvedWorkEntries: number;
  approvedQuantity: number;

  pendingWorkEntries: number;
  pendingQuantity: number;

  approvedTimeEntries: number;
  approvedMinutes: number;

  pendingTimeEntries: number;
  pendingMinutes: number;
};

export type EmployeeReportPayment = {
  id: string;
  employeeId: string;
  employeeName: string;

  role:
    | "WORKER"
    | "SUPERVISOR"
    | "ASSISTANT";

  roleLabel: string;

  amount: string;
  paidAt: string;

  note:
    | string
    | null;

  recordedBy: string;
};

export type EmployeeReportSalary = {
  employeeId: string;
  employeeName: string;

  role:
    | "SUPERVISOR"
    | "ASSISTANT";

  roleLabel: string;

  year: number;
  month: number;
  amount: string;

  note:
    | string
    | null;
};

export type EmployeeReportResponse = {
  filters: {
    employeeId:
      | string
      | null;

    q:
      | string
      | null;

    role:
      | string
      | null;

    isActive:
      | string
      | null;

    from:
      | string
      | null;

    to:
      | string
      | null;
  };

  totals: {
    employees: number;
    periodEarned: string;
    periodPaid: string;
    lifetimeEarned: string;
    lifetimePaid: string;
    currentBalance: string;
  };

  items:
    EmployeeReportItem[];

  payments:
    EmployeeReportPayment[];

  monthlySalaries:
    EmployeeReportSalary[];
};

export type WorkHistoryFilters = {
  employeeId?: string;
  workBatchId?: string;
  operationId?: string;
  workBatchSizeId?: string;

  status?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  reviewerId?: string;
  from?: string;
  to?: string;
};

export type WorkHistoryItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  batchId: string;
  batchCode: string;
  modelName:
    | string
    | null;
  ownerId: string;
  ownerName: string;
  operationId: string;
  operationName: string;
  workBatchSizeId: string;
  sizeLabel: string;
  quantity: number;
  unitRate: string;
  totalAmount: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  workerNote:
    | string
    | null;
  reviewerNote:
    | string
    | null;
  reviewer:
    | {
        id: string;
        fullName: string;
      }
    | null;
  reviewedAt:
    | string
    | null;
  createdAt: string;
};

export type WorkHistoryResponse = {
  filters: {
    employeeId:
      | string
      | null;
    workBatchId:
      | string
      | null;
    operationId:
      | string
      | null;
    workBatchSizeId:
      | string
      | null;
    status:
      | string
      | null;
    reviewerId:
      | string
      | null;
    from:
      | string
      | null;
    to:
      | string
      | null;
  };

  totals: {
    entries: number;
    employees: number;
    operations: number;
    batches: number;
    quantity: number;
    amount: string;
  };

  employeeSummary: Array<{
    employeeId: string;
    employeeName: string;
    employeePhone: string;
    entries: number;
    quantity: number;
    amount: string;
  }>;

  items:
    WorkHistoryItem[];
};

export type OwnerReportFilters = {
  ownerId?: string;
  q?: string;

  isActive?:
    | "true"
    | "false";

  workBatchId?: string;
  modelName?: string;

  status?:
    BatchStatus;

  from?: string;
  to?: string;
};

export type OwnerReportItem = {
  id: string;
  name: string;

  phone:
    | string
    | null;

  isActive: boolean;

  matchedBatchCount: number;

  periodDue: string;
  periodReceived: string;

  lifetimeDue: string;
  lifetimeReceived: string;

  unallocatedReceived: string;
  currentBalance: string;
};

export type OwnerReportBatch = {
  id: string;
  ownerId: string;
  ownerName: string;

  code: string;
  modelName:
    | string
    | null;

  status:
    BatchStatus;

  totalQuantity: number;

  ownerPricingType:
    OwnerPricingType;

  ownerPricingLabel: string;

  ownerUnitPrice:
    | string
    | null;

  ownerFixedAmount:
    | string
    | null;

  due: string;
  linkedReceived: string;
  linkedBalance: string;

  startDate:
    | string
    | null;

  createdAt: string;
};

export type OwnerReportPayment = {
  id: string;
  ownerId: string;
  ownerName: string;

  workBatchId:
    | string
    | null;

  batchCode:
    | string
    | null;

  modelName:
    | string
    | null;

  amount: string;
  paidAt: string;

  note:
    | string
    | null;

  recordedBy: string;
};

export type OwnerReportResponse = {
  filters: {
    ownerId:
      | string
      | null;

    q:
      | string
      | null;

    isActive:
      | string
      | null;

    workBatchId:
      | string
      | null;

    modelName:
      | string
      | null;

    status:
      | string
      | null;

    from:
      | string
      | null;

    to:
      | string
      | null;
  };

  totals: {
    owners: number;
    periodDue: string;
    periodReceived: string;
    lifetimeDue: string;
    lifetimeReceived: string;
    currentBalance: string;
  };

  items:
    OwnerReportItem[];

  batches:
    OwnerReportBatch[];

  payments:
    OwnerReportPayment[];
};

export function getEmployeeReport(
  filters:
    EmployeeReportFilters,
): Promise<EmployeeReportResponse> {
  return apiFetch<EmployeeReportResponse>(
    queryPath(
      "/admin/reports/employees",
      filters,
    ),
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

export function getWorkHistoryReport(
  filters:
    WorkHistoryFilters,
): Promise<WorkHistoryResponse> {
  return apiFetch<WorkHistoryResponse>(
    queryPath(
      "/admin/reports/work-history",
      filters,
    ),
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getOwnerReport(
  filters:
    OwnerReportFilters,
): Promise<OwnerReportResponse> {
  return apiFetch<OwnerReportResponse>(
    queryPath(
      "/admin/reports/owners",
      filters,
    ),
    {
      method:
        "GET",

      cache:
        "no-store",
    },
  );
}

async function downloadManagerExcel(
  path: string,
  filters:
    Record<
      string,
      QueryValue
    >,
  fileName: string,
): Promise<void> {
  const response =
    await managerRawFetch(
      queryPath(
        path,
        filters,
      ),
      {
        method:
          "GET",
      },
    );

  const blob =
    await response.blob();

  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href =
    url;

  anchor.download =
    fileName;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(
    url,
  );
}

export function downloadEmployeeReportExcel(
  filters:
    EmployeeReportFilters,
): Promise<void> {
  return downloadManagerExcel(
    "/admin/reports/employees.xlsx",
    filters,
    "bagheri-employees-report.xlsx",
  );
}

export function downloadWorkHistoryExcel(
  filters:
    WorkHistoryFilters,
): Promise<void> {
  return downloadManagerExcel(
    "/admin/reports/work-history.xlsx",
    filters,
    "bagheri-work-history.xlsx",
  );
}

export function downloadOwnerReportExcel(
  filters:
    OwnerReportFilters,
): Promise<void> {
  return downloadManagerExcel(
    "/admin/reports/owners.xlsx",
    filters,
    "bagheri-owners-report.xlsx",
  );
}
// =========================================================
// ERROR MAPPING
// =========================================================

export function managerError(
  caught: unknown,
): string {
  if (
    caught instanceof
    ApiError
  ) {
    if (
      caught.code ===
      "ACTIVE_SUPERVISOR_EXISTS"
    ) {
      return "در حال حاضر یک سرپرست فعال وجود دارد.";
    }

    if (
      caught.code ===
      "PHONE_ALREADY_EXISTS"
    ) {
      return "این شماره موبایل قبلاً ثبت شده است.";
    }

    if (
      caught.code ===
      "MONTHLY_SALARY_REQUIRED"
    ) {
      return "برای سرپرست و وردست، حقوق ماهانه الزامی است.";
    }

    if (
      caught.code ===
        "MANAGER_PROTECTED" ||
      caught.code ===
        "MANAGER_ROLE_PROTECTED"
    ) {
      return "حساب یا نقش مدیر از این بخش قابل تغییر نیست.";
    }

    if (
      caught.code ===
      "PERSONNEL_NOT_FOUND"
    ) {
      return "پرسنل موردنظر پیدا نشد.";
    }

    if (
      caught.code ===
      "OWNER_NOT_FOUND"
    ) {
      return "صاحبکار موردنظر پیدا نشد.";
    }

    if (
      caught.code ===
      "OPERATION_ALREADY_EXISTS"
    ) {
      return "عملیاتی با این نام قبلاً ثبت شده است.";
    }

    if (
      caught.code ===
      "OPERATION_NOT_FOUND"
    ) {
      return "عملیات موردنظر پیدا نشد.";
    }

    if (
      caught.code ===
      "BATCH_ARCHIVED_LOCKED"
    ) {
      return "سری‌کار بایگانی‌شده قفل است؛ ابتدا وضعیت آن را تغییر دهید.";
    }

    if (
      caught.code ===
      "BATCH_DELETE_HAS_HISTORY"
    ) {
      return "این سری‌کار سابقه واقعی دارد و قابل حذف نیست؛ آن را لغو یا بایگانی کنید.";
    }

    if (
      caught.code ===
      "BATCH_NOT_FOUND"
    ) {
      return "سری‌کار موردنظر پیدا نشد.";
    }

    if (
      caught.code ===
      "BATCH_CODE_ALREADY_EXISTS"
    ) {
      return "این کد سری‌کار قبلاً ثبت شده است.";
    }

    if (
      caught.code ===
      "OWNER_NOT_ACTIVE"
    ) {
      return "صاحبکار انتخاب‌شده فعال نیست.";
    }

    if (
      caught.code ===
      "OWNER_UNIT_PRICE_REQUIRED"
    ) {
      return "برای قرارداد دانه‌ای، قیمت هر عدد الزامی است.";
    }

    if (
      caught.code ===
      "OWNER_FIXED_AMOUNT_REQUIRED"
    ) {
      return "برای قرارداد مبلغ ثابت، مبلغ کل الزامی است.";
    }

    if (
      caught.code ===
      "INVALID_BATCH_OPERATIONS"
    ) {
      return "یک یا چند عملیات انتخاب‌شده غیرفعال یا نامعتبر است.";
    }

    if (
      caught.code ===
      "DUPLICATE_BATCH_OPERATION"
    ) {
      return "یک عملیات بیش از یک بار در سری انتخاب شده است.";
    }

    return caught.message;
  }

  if (
    caught instanceof
    Error &&
    caught.message
  ) {
    return caught.message;
  }

  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}
