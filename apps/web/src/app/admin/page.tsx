"use client";

import {
  RoleGuard,
} from "@/components/auth/role-guard";

import {
  ManagerDashboard,
} from "@/components/admin/manager-dashboard";

export default function AdminPage() {
  return (
    <RoleGuard role="MANAGER">
      {(user) => (
        <ManagerDashboard
          user={user}
        />
      )}
    </RoleGuard>
  );
}