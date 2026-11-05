import { prisma } from "../prisma";
import { logActivity } from "../audit";
import { recalculateMemberStats } from "../streaks";

export interface MergePreview {
  survivingMember: any;
  duplicateMember: any;
  conflictingSessions: Array<{
    sessionId: string;
    sessionDate: Date;
    survivingStatus: string;
    duplicateStatus: string;
  }>;
  uniqueSaturdaysUnionCount: number;
  totalBeforeSum: number;
}

export async function previewMerge(
  survivingMemberId: string,
  duplicateMemberId: string
): Promise<MergePreview> {
  if (survivingMemberId === duplicateMemberId) {
    throw new Error("CANNOT_MERGE_SAME_MEMBER");
  }

  const [surviving, duplicate] = await Promise.all([
    prisma.member.findUnique({
      where: { id: survivingMemberId },
      include: {
        attendances: { include: { session: true } },
        rewards: true,
        achievements: true,
        loginAccount: true,
        stats: true,
      },
    }),
    prisma.member.findUnique({
      where: { id: duplicateMemberId },
      include: {
        attendances: { include: { session: true } },
        rewards: true,
        achievements: true,
        loginAccount: true,
        stats: true,
      },
    }),
  ]);

  if (!surviving || !duplicate) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  // Detect session conflicts and union count
  const survivingMap = new Map(surviving.attendances.map((a) => [a.sessionId, a]));
  const duplicateMap = new Map(duplicate.attendances.map((a) => [a.sessionId, a]));

  const allSessionIds = new Set([
    ...Array.from(survivingMap.keys()),
    ...Array.from(duplicateMap.keys()),
  ]);

  const conflictingSessions: MergePreview["conflictingSessions"] = [];
  let uniqueUnionPresentCount = 0;

  for (const sId of Array.from(allSessionIds)) {
    const sAtt = survivingMap.get(sId);
    const dAtt = duplicateMap.get(sId);

    if (sAtt && dAtt) {
      if (sAtt.status !== dAtt.status) {
        conflictingSessions.push({
          sessionId: sId,
          sessionDate: sAtt.session.date,
          survivingStatus: sAtt.status,
          duplicateStatus: dAtt.status,
        });
      }
      if (sAtt.status === "PRESENT" || dAtt.status === "PRESENT") {
        uniqueUnionPresentCount++;
      }
    } else if (sAtt?.status === "PRESENT" || dAtt?.status === "PRESENT") {
      uniqueUnionPresentCount++;
    }
  }

  const totalBeforeSum =
    surviving.attendances.filter((a) => a.status === "PRESENT").length +
    duplicate.attendances.filter((a) => a.status === "PRESENT").length;

  return {
    survivingMember: surviving,
    duplicateMember: duplicate,
    conflictingSessions,
    uniqueSaturdaysUnionCount: uniqueUnionPresentCount,
    totalBeforeSum,
  };
}

export async function executeMemberMerge(params: {
  survivingMemberId: string;
  duplicateMemberId: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  survivingAccountId?: string;
  conflictResolutions?: Record<string, "PRESENT" | "ABSENT">; // sessionId -> resolved status
}) {
  const { survivingMemberId, duplicateMemberId, adminId, adminName, adminRole } = params;

  if (survivingMemberId === duplicateMemberId) {
    throw new Error("CANNOT_MERGE_SAME_MEMBER");
  }

  return await prisma.$transaction(async (tx) => {
    const surviving = await tx.member.findUnique({
      where: { id: survivingMemberId },
      include: {
        attendances: true,
        rewards: true,
        achievements: true,
        loginAccount: true,
        stats: true,
      },
    });

    const duplicate = await tx.member.findUnique({
      where: { id: duplicateMemberId },
      include: {
        attendances: true,
        rewards: true,
        achievements: true,
        loginAccount: true,
        stats: true,
      },
    });

    if (!surviving || !duplicate) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (duplicate.status === "MERGED") {
      throw new Error("DUPLICATE_ALREADY_MERGED");
    }

    // 1. Process Attendance Union and Conflict Resolution
    const survivingAttMap = new Map(surviving.attendances.map((a) => [a.sessionId, a]));

    for (const dupAtt of duplicate.attendances) {
      const survAtt = survivingAttMap.get(dupAtt.sessionId);

      if (!survAtt) {
        // Attendance exists only in duplicate record -> Move to surviving member
        await tx.attendance.update({
          where: { id: dupAtt.id },
          data: { memberId: survivingMemberId },
        });
      } else {
        // Both have attendance for this Saturday session
        // If there is any discrepancy/conflict, take the highest score (PRESENT always takes precedence over ABSENT/UNMARKED)
        if (survAtt.status !== dupAtt.status) {
          const resolvedStatus = (survAtt.status === "PRESENT" || dupAtt.status === "PRESENT")
            ? "PRESENT"
            : (params.conflictResolutions?.[dupAtt.sessionId] || "PRESENT");
          await tx.attendance.update({
            where: { id: survAtt.id },
            data: { status: resolvedStatus, updatedAt: new Date() },
          });
        }
        // Delete the duplicate record so unique constraint [memberId, sessionId] is preserved
        await tx.attendance.delete({
          where: { id: dupAtt.id },
        });
      }
    }

    // 2. Merge Rewards (Milestone union: ensure no duplicates for same milestone)
    const survivingMilestones = new Set(surviving.rewards.map((r) => r.milestone));
    for (const dupReward of duplicate.rewards) {
      if (!survivingMilestones.has(dupReward.milestone)) {
        // Re-assign reward to surviving member
        await tx.memberReward.update({
          where: { id: dupReward.id },
          data: { memberId: survivingMemberId },
        });
      } else {
        // If surviving has EARNED but duplicate has DELIVERED, upgrade surviving to DELIVERED
        if (dupReward.status === "DELIVERED") {
          const survReward = surviving.rewards.find((r) => r.milestone === dupReward.milestone);
          if (survReward && survReward.status !== "DELIVERED") {
            await tx.memberReward.update({
              where: { id: survReward.id },
              data: {
                status: "DELIVERED",
                deliveredAt: dupReward.deliveredAt || new Date(),
                deliveredById: dupReward.deliveredById,
              },
            });
          }
        }
        // Delete duplicate reward record
        await tx.memberReward.delete({
          where: { id: dupReward.id },
        });
      }
    }

    // 3. Merge Achievements (Union of keys)
    const survivingAchievementKeys = new Set(surviving.achievements.map((a) => a.achievementKey));
    for (const dupAch of duplicate.achievements) {
      if (!survivingAchievementKeys.has(dupAch.achievementKey)) {
        await tx.memberAchievement.update({
          where: { id: dupAch.id },
          data: { memberId: survivingMemberId },
        });
      } else {
        await tx.memberAchievement.delete({
          where: { id: dupAch.id },
        });
      }
    }

    // 4. Merge StreakResetRequests
    await tx.streakResetRequest.updateMany({
      where: { memberId: duplicateMemberId },
      data: { memberId: survivingMemberId },
    });

    // 5. Merge Notifications
    await tx.notification.updateMany({
      where: { memberId: duplicateMemberId },
      data: { memberId: survivingMemberId },
    });

    // 6. Handle Login Accounts
    // If duplicate has an account:
    if (duplicate.loginAccount) {
      if (params.survivingAccountId === duplicate.loginAccount.id) {
        // Admin chose duplicate's login account to be surviving
        if (surviving.loginAccount) {
          // Disable surviving's old account
          await tx.account.update({
            where: { id: surviving.loginAccount.id },
            data: { status: "DISABLED" },
          });
        }
        // Link duplicate's account to surviving member
        await tx.account.update({
          where: { id: duplicate.loginAccount.id },
          data: { memberId: survivingMemberId },
        });
      } else {
        // Surviving keeps its account (or duplicate's account disabled)
        await tx.account.update({
          where: { id: duplicate.loginAccount.id },
          data: { status: "DISABLED" },
        });
      }
    }

    // 7. Mark duplicate member as MERGED (archived, preserving historical identifier)
    await tx.member.update({
      where: { id: duplicateMemberId },
      data: {
        status: "MERGED",
        updatedAt: new Date(),
      },
    });

    // 8. Record MemberMergeHistory
    const beforeStats = {
      surviving: {
        id: surviving.id,
        name: surviving.fullName,
        attendances: surviving.attendances.length,
        rewards: surviving.rewards.length,
      },
      duplicate: {
        id: duplicate.id,
        name: duplicate.fullName,
        attendances: duplicate.attendances.length,
        rewards: duplicate.rewards.length,
      },
    };

    const mergeHistory = await tx.memberMergeHistory.create({
      data: {
        survivingMemberId,
        mergedMemberId: duplicateMemberId,
        mergedMemberName: duplicate.fullName,
        mergedMemberPhone: duplicate.phone,
        adminId,
        adminName,
        beforeStatsJson: JSON.stringify(beforeStats),
        afterStatsJson: JSON.stringify({ status: "Merged successfully" }),
        conflictDecisionsJson: params.conflictResolutions
          ? JSON.stringify(params.conflictResolutions)
          : null,
      },
    });

    // 9. Activity Log
    await tx.activityLog.create({
      data: {
        actorId: adminId,
        actorName: adminName,
        actorRole: adminRole,
        action: "MERGE_MEMBERS",
        targetEntity: "Member",
        targetId: survivingMemberId,
        reason: `Merged duplicate record ${duplicate.fullName} (${duplicate.phone}) into ${surviving.fullName}`,
      },
    });

    return mergeHistory;
  }).then(async (result) => {
    // 10. Recalculate statistics deterministically after transaction commits
    await recalculateMemberStats(survivingMemberId);

    // Ensure highest historical score/streak between both accounts is preserved
    const [survivingStats, duplicateStats] = await Promise.all([
      prisma.memberStats.findUnique({ where: { memberId: survivingMemberId } }),
      prisma.memberStats.findUnique({ where: { memberId: duplicateMemberId } }),
    ]);

    if (survivingStats && duplicateStats) {
      const highestLongest = Math.max(survivingStats.longestStreak, duplicateStats.longestStreak);
      const highestCurrent = Math.max(survivingStats.currentStreak, duplicateStats.currentStreak);
      if (highestLongest > survivingStats.longestStreak || highestCurrent > survivingStats.currentStreak) {
        await prisma.memberStats.update({
          where: { memberId: survivingMemberId },
          data: {
            longestStreak: highestLongest,
            currentStreak: highestCurrent,
          },
        });
      }
    }
    return result;
  });
}

