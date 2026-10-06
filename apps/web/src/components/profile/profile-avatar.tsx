"use client";

import {
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  getProfilePhotoBlob,
} from "@/lib/profile-api";

export function ProfileAvatar({
  userId,
  hasPhoto,
  version,
  className = "size-11",
}: {
  userId: string;
  hasPhoto: boolean;
  version?: string;
  className?: string;
}) {
  const [url, setUrl] =
    useState<string | null>(null);

  useEffect(
    () => {
      let active = true;
      let objectUrl:
        | string
        | null =
        null;

      setUrl(null);

      if (!hasPhoto) {
        return () => {
          active = false;
        };
      }

      void getProfilePhotoBlob(
        userId,
      )
        .then((blob) => {
          if (!active) {
            return;
          }

          objectUrl =
            URL.createObjectURL(blob);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (active) {
            setUrl(null);
          }
        });

      return () => {
        active = false;

        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl,
          );
        }
      };
    },
    [
      hasPhoto,
      userId,
      version,
    ],
  );

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt="عکس پروفایل"
          className="size-full object-cover"
        />
      ) : (
        <UserRound className="size-[45%]" />
      )}
    </div>
  );
}
