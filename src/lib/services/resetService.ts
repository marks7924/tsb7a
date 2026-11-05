import { prisma } from "../prisma";
import { logActivity } from "../audit";
import { recalculateMemberStats } from "../streaks";

export async function reviewStreakResetRequest(params: {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  decisionNotes?: string;
}) {
  const { requestId, decision, reviewerId, reviewerName, reviewerRole, decisionNotes } = params;

  // Authorization check
  if (reviewerRole !== "ADMIN" && reviewerRole !== "DEVELOPER") {
    throw new Error("UNAUTHORIZED");
  }

  const req = await prisma.streakResetRequest.findUnique({
    where: { id: requestId },
    include: { member: true, session: true },
  });

  if (!req) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  if (req.status !== "PENDING") {
    throw new Error("REQUEST_ALREADY_RESOLVED");
  }

  // Admin cannot approve their own reset request
  if (req.memberId === reviewerId) {
    throw new Error("CANNOT_APPROVE_OWN_REQUEST");
  }

  // Moderator/Admin who created request cannot approve own request
  if (req.requestedById === reviewerId) {
    throw new Error("CANNOT_APPROVE_SELF_REQUESTED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.streakResetRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        decisionNotes: decisionNotes || null,
      },
    });

    await tx.activityLog.create({
      data: {
        actorId: reviewerId,
        actorName: reviewerName,
        actorRole: reviewerRole,
        action: decision === "APPROVED" ? "APPROVE_STREAK_RESET" : "REJECT_STREAK_RESET",
        targetEntity: "StreakResetRequest",
        targetId: requestId,
        reason: decisionNotes || `Decision: ${decision} for member ${req.member.fullName}`,
      },
    });

    // Notify member
    await tx.notification.create({
      data: {
        memberId: req.memberId,
        titleEn: decision === "APPROVED" ? "Streak Reset Confirmed" : "Absence Excused (Streak Maintained)",
        titleAr: decision === "APPROVED" ? "تم تأكيد كسر السلسلة" : "تم قبول العذر واستمرار السلسلة",
        messageEn:
          decision === "APPROVED"
            ? "Your previous streak was reset. Your provisional streak is now your official streak."
            : "Your absence was excused! Your streak has been preserved and merged.",
        messageAr:
          decision === "APPROVED"
            ? "تم اعتماد تصفير السلسلة السابقة، وأصبح حضورك الأخير هو سلسلتك الرسمية الجديدة."
            : "تم قبول عذرك بنجاح وتم استمرار سلسلتك المتصلة دون انقطاع.",
        type: "STREAK",
      },
    });
  });

  // Recompute member stats
  await recalculateMemberStats(req.memberId);

  return { success: true, decision };
}

