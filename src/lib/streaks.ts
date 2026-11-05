import { prisma } from "./prisma";

export interface RebuiltStats {
  memberId: string;
  currentStreak: number;
  longestStreak: number;
  provisionalStreak: number;
  hasPendingReset: number | boolean;
  totalAttendance: number;
  annualAttendance: number;
  rewardsEarned: number;
  rewardsDelivered: number;
  nextRewardProgress: number;
  newMilestones: number[];
}

/**
 * Authoritative, deterministic chronological streak calculation engine.
 * Recomputes all streak metrics from the chronological history of Saturday sessions,
 * attendance records, and StreakResetRequests.
 */
export async function recalculateMemberStats(
  memberId: string,
  threshold = 4
): Promise<RebuiltStats> {
  const currentYear = new Date().getFullYear();

  // 1. Fetch member with existing rewards
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      rewards: true,
      achievements: true,
      stats: true,
    },
  });

  if (!member) {
    throw new Error(`Member with ID ${memberId} not found`);
  }

  // 2. Fetch all valid sessions (excluding OFF and CANCELLED) in chronological order
  const sessions = await prisma.saturdaySession.findMany({
    where: {
      status: { notIn: ["OFF", "CANCELLED"] },
    },
    orderBy: { date: "asc" },
  });

  const sessionIds = sessions.map((s) => s.id);

  // 3. Fetch all attendance records for this member in these sessions
  const attendances = await prisma.attendance.findMany({
    where: {
      memberId,
      sessionId: { in: sessionIds },
    },
  });

  const attendanceMap = new Map<string, (typeof attendances)[0]>();
  attendances.forEach((a) => attendanceMap.set(a.sessionId, a));

  // 4. Fetch all StreakResetRequests for this member
  const resetRequests = await prisma.streakResetRequest.findMany({
    where: { memberId },
    orderBy: { requestedAt: "asc" },
  });

  const resetRequestMap = new Map<string, (typeof resetRequests)[0]>();
  resetRequests.forEach((r) => resetRequestMap.set(r.sessionId, r));

  // 5. Run chronological simulation
  let officialStreak = 0;
  let longestStreak = 0;
  let provisionalStreak = 0;
  let pendingResetCount = 0;
  let totalAttendance = 0;
  let annualAttendance = 0;

  // Track milestones earned along the official streak
  const earnedMilestonesSet = new Set<number>();
  // Pre-seed with any existing earned or delivered rewards so historical deliveries are NEVER deleted
  member.rewards.forEach((r) => {
    if (r.status === "EARNED" || r.status === "DELIVERED") {
      earnedMilestonesSet.add(r.milestone);
    }
  });

  for (const session of sessions) {
    const attendance = attendanceMap.get(session.id);
    const sessionYear = new Date(session.date).getFullYear();

    if (!attendance) {
      // Unmarked session: does not break streak unless explicitly marked absent
      continue;
    }

    if (attendance.status === "PRESENT") {
      totalAttendance++;
      if (sessionYear === currentYear) {
        annualAttendance++;
      }

      if (pendingResetCount > 0) {
        // While there is an unresolved reset request, post-absence attendances build provisional streak
        provisionalStreak++;
      } else {
        // Normal official streak
        officialStreak++;
        if (officialStreak > longestStreak) {
          longestStreak = officialStreak;
        }

        // Check if milestone achieved
        if (officialStreak >= threshold && officialStreak % threshold === 0) {
          earnedMilestonesSet.add(officialStreak);
        }
      }
    } else if (attendance.status === "ABSENT") {
      const resetReq = resetRequestMap.get(session.id);
      const reqStatus = resetReq?.status || "PENDING";

      if (reqStatus === "APPROVED") {
        // The absence was confirmed as a reset
        // The old official streak ends here.
        // Any provisional streak accumulated after this absence becomes the new official streak!
        officialStreak = provisionalStreak;
        provisionalStreak = 0;
        if (officialStreak > longestStreak) {
          longestStreak = officialStreak;
        }
        // If there were further pending requests, decrement count, else reset to 0
        pendingResetCount = Math.max(0, pendingResetCount - 1);
      } else if (reqStatus === "REJECTED") {
        // The absence was excused! It does NOT break the streak.
        // The provisional streak accumulated merges back into the official streak.
        officialStreak += provisionalStreak;
        provisionalStreak = 0;
        if (officialStreak > longestStreak) {
          longestStreak = officialStreak;
        }
        // Check if newly merged streak hit milestone
        if (officialStreak >= threshold && officialStreak % threshold === 0) {
          earnedMilestonesSet.add(officialStreak);
        }
        pendingResetCount = Math.max(0, pendingResetCount - 1);
      } else {
        // PENDING reset request:
        // The official streak remains preserved as of the moment before absence.
        // Future attendances will accumulate in provisionalStreak.
        pendingResetCount++;
        provisionalStreak = 0;
      }
    }
  }

  const hasPendingReset = pendingResetCount > 0;
  const nextRewardProgress = officialStreak % threshold;

  // 6. Synchronize MemberRewards
  // Find newly achieved milestones not yet in DB
  const existingMilestones = new Set(member.rewards.map((r) => r.milestone));
  const newMilestones: number[] = [];

  for (const milestone of Array.from(earnedMilestonesSet)) {
    if (!existingMilestones.has(milestone)) {
      newMilestones.push(milestone);
      await prisma.memberReward.create({
        data: {
          memberId,
          milestone,
          status: "EARNED",
        },
      });
    }
  }

  // Count delivered vs earned
  const allRewards = await prisma.memberReward.findMany({
    where: { memberId },
  });
  const rewardsEarned = allRewards.length;
  const rewardsDelivered = allRewards.filter((r) => r.status === "DELIVERED").length;

  // 7. Update or create MemberStats
  await prisma.memberStats.upsert({
    where: { memberId },
    create: {
      memberId,
      currentStreak: officialStreak,
      longestStreak,
      provisionalStreak,
      hasPendingReset,
      totalAttendance,
      annualAttendance,
      rewardsEarned,
      rewardsDelivered,
      nextRewardProgress,
    },
    update: {
      currentStreak: officialStreak,
      longestStreak,
      provisionalStreak,
      hasPendingReset,
      totalAttendance,
      annualAttendance,
      rewardsEarned,
      rewardsDelivered,
      nextRewardProgress,
    },
  });

  // 8. Evaluate and unlock achievements
  await evaluateAchievements(memberId, totalAttendance, longestStreak, rewardsEarned);

  return {
    memberId,
    currentStreak: officialStreak,
    longestStreak,
    provisionalStreak,
    hasPendingReset,
    totalAttendance,
    annualAttendance,
    rewardsEarned,
    rewardsDelivered,
    nextRewardProgress,
    newMilestones,
  };
}

/**
 * Checks and awards standard achievements based on recalculated stats
 */
export async function evaluateAchievements(
  memberId: string,
  totalAttendance: number,
  longestStreak: number,
  rewardsEarned: number
) {
  const achievementsToAward: string[] = [];

  if (totalAttendance >= 1) achievementsToAward.push("FIRST_ATTENDANCE");
  if (totalAttendance >= 10) achievementsToAward.push("ATTENDANCE_10");
  if (totalAttendance >= 25) achievementsToAward.push("ATTENDANCE_25");
  if (totalAttendance >= 50) achievementsToAward.push("ATTENDANCE_50");
  if (totalAttendance >= 100) achievementsToAward.push("ATTENDANCE_100");

  if (longestStreak >= 4) achievementsToAward.push("STREAK_4");
  if (longestStreak >= 8) achievementsToAward.push("STREAK_8");
  if (longestStreak >= 12) achievementsToAward.push("STREAK_12");
  if (longestStreak >= 24) achievementsToAward.push("STREAK_24");

  if (rewardsEarned >= 1) achievementsToAward.push("FIRST_REWARD");
  if (rewardsEarned >= 5) achievementsToAward.push("REWARDS_5");

  for (const key of achievementsToAward) {
    try {
      await prisma.memberAchievement.upsert({
        where: {
          memberId_achievementKey: {
            memberId,
            achievementKey: key,
          },
        },
        create: {
          memberId,
          achievementKey: key,
        },
        update: {},
      });
    } catch {
      // Ignore if exists
    }
  }
}

