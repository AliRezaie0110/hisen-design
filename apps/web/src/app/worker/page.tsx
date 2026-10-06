"use client";

import {
  RoleGuard,
} from "@/components/auth/role-guard";
import {
  WorkerDashboard,
} from "@/components/worker/worker-dashboard";

export default function WorkerPage() {
  return (
    <RoleGuard role="WORKER">
      {(user) => (
        <WorkerDashboard
          user={user}
        />
      )}
    </RoleGuard>
  );
}