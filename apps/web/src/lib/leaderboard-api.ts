import { apiFetch } from "@/lib/api";

export type LeaderboardEntry = {
  workerId: string;
  name: string;
  approvedWorks: number;
  photoUrl: string | null;
  rank: number;
};

export async function getMonthlyLeaderboard(
  month: number,
  year: number,
) {
  return apiFetch<LeaderboardEntry[]>(
    `/leaderboard/monthly?month=${month}&year=${year}`,
  );
}
