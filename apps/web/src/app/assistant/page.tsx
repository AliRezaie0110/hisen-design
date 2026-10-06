"use client";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

import {
  FixedSalaryDashboard,
} from "@/components/staff/fixed-salary-dashboard";

export default function AssistantPage() {
  return (
    <RoleGuard role="ASSISTANT">
      {(user) => (
        <FixedSalaryDashboard
          user={user}
        />
      )}
    </RoleGuard>
  );
}