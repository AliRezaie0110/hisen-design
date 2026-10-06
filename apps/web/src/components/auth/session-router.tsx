"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  ApiError,
  getCurrentUser,
} from "@/lib/api";
import {
  roleHomePath,
} from "@/lib/auth";
import {
  FullPageLoader,
} from "@/components/auth/full-page-loader";

export function SessionRouter() {
  const router =
    useRouter();

  const [
    message,
    setMessage,
  ] =
    useState(
      "در حال ورود به پنل...",
    );

  useEffect(
    () => {
      let alive =
        true;

      async function run() {
        try {
          const user =
            await getCurrentUser();

          if (!alive) {
            return;
          }

          router.replace(
            roleHomePath(
              user.role,
            ),
          );
        } catch (error) {
          if (!alive) {
            return;
          }

          if (
            error instanceof
              ApiError &&
            error.status !==
              401
          ) {
            setMessage(
              "ارتباط با سرور برقرار نشد؛ انتقال به ورود...",
            );
          }

          window.setTimeout(
            () => {
              router.replace(
                "/login",
              );
            },
            250,
          );
        }
      }

      void run();

      return () => {
        alive =
          false;
      };
    },
    [
      router,
    ],
  );

  return (
    <FullPageLoader
      text={message}
    />
  );
}