import {
  AuthUser,
  isAuthUser,
} from "@/lib/auth";

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export const API_URL =
  rawApiUrl.replace(
    /\/+$/,
    "",
  );

type ApiErrorPayload = {
  message?:
    | string
    | string[];
  code?: string;
  error?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(
    status: number,
    message: string,
    code?: string,
  ) {
    super(message);

    this.name =
      "ApiError";

    this.status =
      status;

    this.code =
      code;
  }
}

function extractMessage(
  payload: unknown,
): string {
  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    return "خطایی رخ داد. دوباره تلاش کنید.";
  }

  const data =
    payload as ApiErrorPayload;

  if (
    Array.isArray(
      data.message,
    )
  ) {
    return (
      data.message[0] ??
      "اطلاعات واردشده معتبر نیست."
    );
  }

  if (
    typeof data.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    typeof data.error ===
    "string"
  ) {
    return data.error;
  }

  return "خطایی رخ داد. دوباره تلاش کنید.";
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response =
    await fetch(
      `${API_URL}/api${path}`,
      {
        ...options,
        credentials:
          "include",
        headers: {
          ...(options?.body
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
          ...options?.headers,
        },
      },
    );

  const contentType =
    response.headers.get(
      "content-type",
    );

  let payload:
    unknown =
      null;

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    payload =
      await response.json();
  } else {
    const text =
      await response.text();

    payload =
      text || null;
  }

  if (
    !response.ok
  ) {
    const code =
      payload &&
      typeof payload ===
        "object" &&
      "code" in payload &&
      typeof (
        payload as {
          code?: unknown;
        }
      ).code ===
        "string"
        ? (
            payload as {
              code: string;
            }
          ).code
        : undefined;

    throw new ApiError(
      response.status,
      extractMessage(
        payload,
      ),
      code,
    );
  }

  return payload as T;
}

export async function requestOtp(
  phone: string,
): Promise<void> {
  await apiFetch(
    "/auth/request-otp",
    {
      method:
        "POST",
      body:
        JSON.stringify({
          phone,
        }),
    },
  );
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<AuthUser> {
  await apiFetch(
    "/auth/verify-otp",
    {
      method:
        "POST",
      body:
        JSON.stringify({
          phone,
          code,
        }),
    },
  );

  return getCurrentUser();
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response =
    await apiFetch<unknown>(
      "/auth/me",
      {
        method:
          "GET",
        cache:
          "no-store",
      },
    );

  let candidate:
    unknown =
      response;

  if (
    response &&
    typeof response ===
      "object" &&
    "user" in response
  ) {
    candidate =
      (
        response as {
          user?: unknown;
        }
      ).user;
  }

  if (
    !isAuthUser(
      candidate,
    )
  ) {
    throw new ApiError(
      500,
      "اطلاعات حساب کاربری از سرور معتبر نیست.",
      "INVALID_ME_RESPONSE",
    );
  }

  return candidate;
}

export async function logout(): Promise<void> {
  await apiFetch(
    "/auth/logout",
    {
      method:
        "POST",
      body:
        JSON.stringify({}),
    },
  );
}