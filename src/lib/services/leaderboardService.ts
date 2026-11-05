import { prisma } from "../prisma";

export interface LeaderboardEntry {
  rank: number;
  isTied?: boolean;
  memberId: string;
  fullName: string;
  avatarUrl: string | null;
  attendanceCount: number;
  currentStreak: number;
  longestStreak: number;
  rewardsCount: number;
}

export function computeCompetitionRanks(
  entries: Array<{
    memberId: string;
    fullName: string;
    avatarUrl: string | null;
    primaryValue: number;
    currentStreak: number;
    longestStreak: number;
    rewardsCount: number;
  }>
): LeaderboardEntry[] {
  // Sort descending with multi-tier deterministic tie-breaking:
  // 1. primaryValue (Attendance count) DESC
  // 2. currentStreak DESC
  // 3. longestStreak DESC
  // 4. rewardsCount DESC
  // 5. fullName ASC
  const sorted = [...entries].sort((a, b) => {
    if (b.primaryValue !== a.primaryValue) return b.primaryValue - a.primaryValue;
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    if (b.longestStreak !== a.longestStreak) return b.longestStreak - a.longestStreak;
    if (b.rewardsCount !== a.rewardsCount) return b.rewardsCount - a.rewardsCount;
    return a.fullName.localeCompare(b.fullName, "ar");
  });

  const result: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    // If ANY of the performance metrics differ, update rank to the actual 1-based index (Competition Rank: 1, 2, 2, 4)
    if (
      i > 0 &&
      (sorted[i].primaryValue !== sorted[i - 1].primaryValue ||
        sorted[i].currentStreak !== sorted[i - 1].currentStreak ||
        sorted[i].longestStreak !== sorted[i - 1].longestStreak ||
        sorted[i].rewardsCount !== sorted[i - 1].rewardsCount)
    ) {
      currentRank = i + 1;
    }

    result.push({
      rank: currentRank,
      memberId: sorted[i].memberId,
      fullName: sorted[i].fullName,
      avatarUrl: sorted[i].avatarUrl,
      attendanceCount: sorted[i].primaryValue,
      currentStreak: sorted[i].currentStreak,
      longestStreak: sorted[i].longestStreak,
      rewardsCount: sorted[i].rewardsCount,
    });
  }

  // Mark entries that share a rank as isTied = true
  const rankCounts = new Map<number, number>();
  for (const r of result) {
    rankCounts.set(r.rank, (rankCounts.get(r.rank) || 0) + 1);
  }
  for (const r of result) {
    r.isTied = (rankCounts.get(r.rank) || 0) > 1;
  }

  return result;
}

export async function getStreakLeaderboard(): Promise<LeaderboardEntry[]> {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { stats: true },
  });

  const rawEntries = members.map((m) => ({
    memberId: m.id,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    primaryValue: m.stats?.currentStreak || 0,
    currentStreak: m.stats?.currentStreak || 0,
    longestStreak: m.stats?.longestStreak || 0,
    rewardsCount: m.stats?.rewardsEarned || 0,
  }));

  return computeCompetitionRanks(rawEntries);
}

export async function getAnnualLeaderboard(year?: number): Promise<LeaderboardEntry[]> {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));

  // Find all active members
  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      stats: true,
      attendances: {
        where: {
          status: "PRESENT",
          session: {
            date: { gte: startDate, lte: endDate },
            status: { notIn: ["OFF", "CANCELLED"] },
          },
        },
      },
    },
  });

  const rawEntries = members.map((m) => ({
    memberId: m.id,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    primaryValue: m.attendances.length,
    currentStreak: m.stats?.currentStreak || 0,
    longestStreak: m.stats?.longestStreak || 0,
    rewardsCount: m.stats?.rewardsEarned || 0,
  }));

  return computeCompetitionRanks(rawEntries);
}

export async function getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      stats: true,
      attendances: {
        where: {
          status: "PRESENT",
          session: {
            status: { notIn: ["OFF", "CANCELLED"] },
          },
        },
      },
    },
  });

  const rawEntries = members.map((m) => ({
    memberId: m.id,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    primaryValue: m.attendances.length,
    currentStreak: m.stats?.currentStreak || 0,
    longestStreak: m.stats?.longestStreak || 0,
    rewardsCount: m.stats?.rewardsEarned || 0,
  }));

  return computeCompetitionRanks(rawEntries);
}

export async function getGeneralAnalytics() {
  const [sessions, attendances, members, rewards] = await Promise.all([
    prisma.saturdaySession.findMany({
      orderBy: { date: "asc" },
      include: {
        attendances: true,
      },
    }),
    prisma.attendance.findMany(),
    prisma.member.findMany({ where: { status: "ACTIVE" }, include: { stats: true } }),
    prisma.memberReward.findMany(),
  ]);

  const totalSaturdaysHeld = sessions.filter((s) => s.status === "COMPLETED" || s.status === "ACTIVE").length;
  const totalOffSaturdays = sessions.filter((s) => s.status === "OFF").length;
  const totalCancelled = sessions.filter((s) => s.status === "CANCELLED").length;

  const totalPresentAttendance = attendances.filter((a) => a.status === "PRESENT").length;
  const averageAttendance = totalSaturdaysHeld > 0 ? Math.round(totalPresentAttendance / totalSaturdaysHeld) : 0;

  let highestAttendance = 0;
  const weeklyTrends = sessions
    .filter((s) => s.status !== "CANCELLED")
    .map((s) => {
      const presentCount = s.attendances.filter((a) => a.status === "PRESENT").length;
      if (presentCount > highestAttendance) highestAttendance = presentCount;
      return {
        date: s.date.toISOString().split("T")[0],
        title: s.title || s.date.toISOString().split("T")[0],
        isOff: s.status === "OFF",
        presentCount: s.status === "OFF" ? 0 : presentCount,
      };
    });

  const totalRewardsEarned = rewards.length;
  const totalRewardsDelivered = rewards.filter((r) => r.status === "DELIVERED").length;

  return {
    totalSaturdaysHeld,
    totalOffSaturdays,
    totalCancelled,
    totalPresentAttendance,
    averageAttendance,
    highestAttendance,
    weeklyTrends,
    totalMembers: members.length,
    totalRewardsEarned,
    totalRewardsDelivered,
  };
}

