import {
  apiFetch,
} from "@/lib/api";

export type WorkEntryStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type AvailableWorkItem = {
  batchOperationId: string;
  batchId: string;
  batchCode: string;
  modelName:
    | string
    | null;
  operationId: string;
  operationName: string;
  targetQuantity: number;
  claimedQuantity: number;
  approvedQuantity: number;
  remainingQuantity: number;
  sizes: Array<{
    id: string;
    label: string;
    quantity: number;
    claimedQuantity: number;
    remainingQuantity: number;
  }>;
};

export type WorkerAvailableResponse = {
  items: AvailableWorkItem[];
};

export type WorkerHistoryEntry = {
  id: string;
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
  unitRate: string;
  totalAmount: string;
  status: WorkEntryStatus;
  workerNote: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type WorkerHistoryResponse = {
  items: WorkerHistoryEntry[];
};

export type EmployeePayment = {
  id: string;
  amount: string;

  paymentMethod:
    | "CARD_TO_CARD"
    | "BANK_TRANSFER"
    | "CASH"
    | "OTHER";

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

export type EmployeeAccountResponse = {
  employee: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
    compensationType: string;
    isActive: boolean;
    defaultMonthlySalary: string | null;
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
    note: string | null;
  }>;

  payments: EmployeePayment[];
};

export type CreateWorkerEntryInput = {
  batchOperationId: string;
  workBatchSizeId: string;
  quantity: number;
};

export function getAvailableWork(): Promise<WorkerAvailableResponse> {
  return apiFetch<WorkerAvailableResponse>(
    "/work-entries/available",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getWorkerHistory(): Promise<WorkerHistoryResponse> {
  return apiFetch<WorkerHistoryResponse>(
    "/work-entries/mine",
    {
      method:
        "GET",
      cache:
        "no-store",
    },
  );
}

export function getWorkerAccount(): Promise<EmployeeAccountResponse> {
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
const EMPLOYEE_API_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/+$/, "");

async function fetchEmployeeReceipt(
  paymentId: string,
): Promise<Blob> {
  const response =
    await fetch(
      `${EMPLOYEE_API_URL}/api/employee-account/payments/${paymentId}/receipt`,
      {
        method:
          "GET",

        credentials:
          "include",
      },
    );

  if (
    response.ok
  ) {
    return response.blob();
  }

  let message =
    `خطا در دریافت رسید (${response.status})`;

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
    // Response may have no JSON body.
  }

  throw new Error(
    message,
  );
}

export async function openEmployeeReceipt(
  paymentId: string,
): Promise<void> {
  const blob =
    await fetchEmployeeReceipt(
      paymentId,
    );

  const url =
    URL.createObjectURL(
      blob,
    );

  const opened =
    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );

  if (!opened) {
    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.target =
      "_blank";

    anchor.rel =
      "noopener noreferrer";

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();
  }

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    60_000,
  );
}

export function createWorkerEntry(
  input: CreateWorkerEntryInput,
): Promise<unknown> {
  return apiFetch(
    "/work-entries",
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
