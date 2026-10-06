"use client";

import {
  Camera,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ProfileAvatar,
} from "@/components/profile/profile-avatar";
import {
  ApiError,
} from "@/lib/api";
import type {
  AuthUser,
} from "@/lib/auth";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  type UserProfile,
} from "@/lib/profile-api";

function errorText(
  caught: unknown,
): string {
  if (caught instanceof ApiError) {
    return caught.message;
  }

  if (caught instanceof Error) {
    return caught.message;
  }

  return "خطایی رخ داد. دوباره تلاش کنید.";
}

export function ProfileSection({
  user,
}: {
  user: AuthUser;
}) {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);
  const [title, setTitle] =
    useState("");
  const [bio, setBio] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [uploading, setUploading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const next =
            await getMyProfile();

          setProfile(next);
          setTitle(
            next.profileTitle ?? "",
          );
          setBio(
            next.profileBio ?? "",
          );
        } catch (caught) {
          setError(
            errorText(caught),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(
    () => {
      void load();
    },
    [load],
  );

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const next =
        await updateMyProfile({
          profileTitle:
            title.trim(),
          profileBio:
            bio.trim(),
        });

      setProfile(next);
      setSuccess(
        "پروفایل با موفقیت ذخیره شد.",
      );
    } catch (caught) {
      setError(
        errorText(caught),
      );
    } finally {
      setSaving(false);
    }
  }

  async function choosePhoto(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const next =
        await uploadMyProfilePhoto(
          file,
        );

      setProfile(next);
      setSuccess(
        "عکس پروفایل به‌روزرسانی شد.",
      );
    } catch (caught) {
      setError(
        errorText(caught),
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[26px] border border-[var(--line)] bg-white p-14 text-center">
        <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--brand)]" />
        <p className="mt-3 text-xs font-bold text-[var(--muted)]">
          در حال دریافت پروفایل...
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
          {success}
        </div>
      )}

      <div className="rounded-[28px] border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfileAvatar
            userId={user.id}
            hasPhoto={Boolean(profile?.hasProfilePhoto)}
            version={profile?.profilePhotoVersion}
            className="size-24 rounded-[26px]"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-[var(--brand)]" />
              <p className="text-lg font-black">
                {profile?.fullName ?? user.fullName}
              </p>
            </div>

            <p dir="ltr" className="mt-1 text-right text-xs text-[var(--muted)]">
              {profile?.phone ?? user.phone}
            </p>

            <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[var(--brand-soft)] px-4 text-xs font-black text-[var(--brand)]">
              {uploading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              تغییر عکس
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => void choosePhoto(event)}
                className="hidden"
              />
            </label>

            <p className="mt-2 text-[10px] text-[var(--muted)]">
              JPG، PNG یا WEBP تا ۳ مگابایت
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-black">
              عنوان کوتاه
            </label>
            <input
              value={title}
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً همکار بخش اتو یا چرخ"
              className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-bold outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black">
              توضیح کوتاه
            </label>
            <textarea
              value={bio}
              maxLength={500}
              onChange={(event) => setBio(event.target.value)}
              placeholder="توضیح اختیاری درباره مهارت یا حوزه کاری"
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--line)] bg-white p-4 text-sm font-bold leading-7 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
            />
          </div>

          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-[11px] leading-6 text-[var(--muted)]">
            نام، شماره موبایل، نقش و اطلاعات حقوقی از بخش مدیریت تعیین می‌شوند و از پروفایل شخصی قابل تغییر نیستند.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] text-xs font-black text-white disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            ذخیره پروفایل
          </button>
        </form>
      </div>
    </section>
  );
}
