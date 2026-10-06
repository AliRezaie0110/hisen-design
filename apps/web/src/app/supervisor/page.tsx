"use client";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

import {
  FixedSalaryDashboard,
} from "@/components/staff/fixed-salary-dashboard";

export default function SupervisorPage() {
  return (
    <RoleGuard role="SUPERVISOR">
      {(user) => (
        <FixedSalaryDashboard
          user={user}
        />
      )}
    </RoleGuard>
  );
}