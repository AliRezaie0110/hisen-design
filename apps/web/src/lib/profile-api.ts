import {
  API_URL,
  ApiError,
  apiFetch,
} from "@/lib/api";

export type UserProfile = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  profileTitle: string | null;
  profileBio: string | null;
  hasProfilePhoto: boolean;
  profilePhotoVersion: string;
};

export function getMyProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    "/profile/mine",
    {
      method: "GET",
      cache: "no-store",
    },
  );
}

export function updateMyProfile(input: {
  profileTitle?: string;
  profileBio?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>(
    "/profile/mine",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

async function rawProfileFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const response =
    await fetch(
      `${API_URL}/api${path}`,
      {
        ...options,
        credentials: "include",
      },
    );

  if (response.ok) {
    return response;
  }

  let message =
    "خطا در دریافت اطلاعات پروفایل.";
  let code:
    | string
    | undefined;

  try {
    const payload =
      await response.json() as {
        message?: string | string[];
        code?: string;
      };

    if (Array.isArray(payload.message)) {
      message =
        payload.message[0] ?? message;
    } else if (payload.message) {
      message =
        payload.message;
    }

    code =
      payload.code;
  } catch {
    // Response may not contain JSON.
  }

  throw new ApiError(
    response.status,
    message,
    code,
  );
}

export async function uploadMyProfilePhoto(
  photo: File,
): Promise<UserProfile> {
  const formData =
    new FormData();

  formData.append(
    "photo",
    photo,
  );

  const response =
    await rawProfileFetch(
      "/profile/mine/photo",
      {
        method: "POST",
        body: formData,
      },
    );

  return response.json() as Promise<UserProfile>;
}

export async function getProfilePhotoBlob(
  userId: string,
): Promise<Blob> {
  const response =
    await rawProfileFetch(
      `/profile/photo/${userId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

  return response.blob();
}
