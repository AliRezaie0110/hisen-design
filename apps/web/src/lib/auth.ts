export type UserRole =
  | "MANAGER"
  | "SUPERVISOR"
  | "ASSISTANT"
  | "WORKER";

export type CompensationType =
  | "NONE"
  | "PIECE_RATE"
  | "FIXED_MONTHLY";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
  compensationType?: CompensationType;
};

export const ROLE_HOME: Record<UserRole, string> = {
  MANAGER: "/admin",
  SUPERVISOR: "/supervisor",
  ASSISTANT: "/assistant",
  WORKER: "/worker",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  MANAGER: "مدیر",
  SUPERVISOR: "سرپرست",
  ASSISTANT: "وردست",
  WORKER: "همکار",
};

export function roleHomePath(
  role: UserRole,
): string {
  return ROLE_HOME[role];
}

export function isUserRole(
  value: unknown,
): value is UserRole {
  return (
    value === "MANAGER" ||
    value === "SUPERVISOR" ||
    value === "ASSISTANT" ||
    value === "WORKER"
  );
}

export function isAuthUser(
  value: unknown,
): value is AuthUser {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof record.id === "string" &&
    typeof record.phone === "string" &&
    typeof record.fullName === "string" &&
    isUserRole(record.role)
  );
}