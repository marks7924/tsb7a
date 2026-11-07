import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole, canManageRole } from "@/lib/auth";
import { adminGenerateNewPassword } from "@/lib/services/accountService";
import { previewMerge, executeMemberMerge } from "@/lib/services/mergeService";
import { logActivity } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();

    const where: any = {
      status: { not: "MERGED" }, // Hide archived/merged from primary list
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const members = await prisma.member.findMany({
      where,
      orderBy: { fullName: "asc" },
      include: {
        loginAccount: {
          select: { id: true, email: true, status: true, lastLogin: true },
        },
        stats: true,
        rewards: true,
        achievements: true,
      },
    });

    // Mask DEVELOPER role if requester is not DEVELOPER
    const safeMembers = members.map((m) => {
      const isDev = m.role === "DEVELOPER";
      return {
        ...m,
        role: isDev && user.role !== "DEVELOPER" ? "ADMIN" : m.role,
        isDeveloperHidden: isDev && user.role !== "DEVELOPER",
      };
    });

    return NextResponse.json({ members: safeMembers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const body = await req.json();

    // 1. Generate new password (Admin only)
    if (body.action === "generate-password") {
      if (!hasRole(user.role, "ADMIN")) {
        return NextResponse.json({ error: "ADMIN_REQUIRED" }, { status: 403 });
      }
      const result = await adminGenerateNewPassword(
        user.memberId,
        user.role,
        user.fullName,
        body.targetMemberId,
        body.passwordType,
        body.customPassword
      );
      return NextResponse.json(result);
    }

    // 2. Merge preview (Admin only)
    if (body.action === "merge-preview") {
      if (!hasRole(user.role, "ADMIN")) {
        return NextResponse.json({ error: "ADMIN_REQUIRED" }, { status: 403 });
      }
      const preview = await previewMerge(body.survivingMemberId, body.duplicateMemberId);
      return NextResponse.json(preview);
    }

    // 3. Execute merge (Admin only)
    if (body.action === "merge-execute") {
      if (!hasRole(user.role, "ADMIN")) {
        return NextResponse.json({ error: "ADMIN_REQUIRED" }, { status: 403 });
      }
      const result = await executeMemberMerge({
        survivingMemberId: body.survivingMemberId,
        duplicateMemberId: body.duplicateMemberId,
        adminId: user.memberId,
        adminName: user.fullName,
        adminRole: user.role,
        survivingAccountId: body.survivingAccountId,
        conflictResolutions: body.conflictResolutions,
      });
      return NextResponse.json({ success: true, result });
    }

    // 4. Deliver reward
    if (body.action === "deliver-reward") {
      const reward = await prisma.memberReward.update({
        where: { id: body.rewardId },
        data: {
          status: "DELIVERED",
          deliveredById: user.memberId,
          deliveredAt: new Date(),
        },
      });

      // Update MemberStats delivered count
      const { recalculateMemberStats } = await import("@/lib/streaks");
      await recalculateMemberStats(reward.memberId);

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "DELIVER_REWARD",
        targetEntity: "MemberReward",
        targetId: reward.id,
        reason: `Marked milestone ${reward.milestone} delivered`,
      });

      return NextResponse.json({ success: true, reward });
    }

    // 5. Update Role
    if (body.action === "update-role") {
      const targetMember = await prisma.member.findUnique({
        where: { id: body.targetMemberId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
      }

      if (!canManageRole(user.role, targetMember.role, body.newRole)) {
        return NextResponse.json({ error: "CANNOT_MANAGE_ROLE" }, { status: 403 });
      }

      const updated = await prisma.member.update({
        where: { id: targetMember.id },
        data: { role: body.newRole },
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "UPDATE_ROLE",
        targetEntity: "Member",
        targetId: targetMember.id,
        oldValue: { role: targetMember.role },
        newValue: { role: body.newRole },
      });

      return NextResponse.json({ success: true, member: updated });
    }

    // 6. Adjust Member Score / Streak immediately (Mod & Admin)
    if (body.action === "adjust-score") {
      const { targetMemberId, field, mode, value } = body;
      const targetMember = await prisma.member.findUnique({
        where: { id: targetMemberId },
        include: { stats: true },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
      }

      const stats = targetMember.stats || (await prisma.memberStats.create({
        data: {
          memberId: targetMember.id,
          currentStreak: 0,
          longestStreak: 0,
          provisionalStreak: 0,
          hasPendingReset: false,
          totalAttendance: 0,
          annualAttendance: 0,
          rewardsEarned: 0,
          rewardsDelivered: 0,
          nextRewardProgress: 0,
        },
      }));

      const numVal = Math.max(0, parseInt(value, 10) || 0);
      let newStreak = stats.currentStreak;
      let newTotal = stats.totalAttendance;

      if (field === "currentStreak") {
        if (mode === "SET") newStreak = numVal;
        else if (mode === "ADD") newStreak = stats.currentStreak + numVal;
        else if (mode === "SUBTRACT") newStreak = Math.max(0, stats.currentStreak - numVal);
      } else if (field === "totalAttendance") {
        if (mode === "SET") newTotal = numVal;
        else if (mode === "ADD") newTotal = stats.totalAttendance + numVal;
        else if (mode === "SUBTRACT") newTotal = Math.max(0, stats.totalAttendance - numVal);
      }

      const newLongest = Math.max(stats.longestStreak, newStreak);

      const updatedStats = await prisma.memberStats.update({
        where: { memberId: targetMember.id },
        data: {
          currentStreak: newStreak,
          totalAttendance: newTotal,
          longestStreak: newLongest,
          updatedAt: new Date(),
        },
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "ADJUST_SCORE",
        targetEntity: "MemberStats",
        targetId: targetMember.id,
        reason: `Admin adjusted ${field} via ${mode} (${value}) for ${targetMember.fullName}`,
        oldValue: { currentStreak: stats.currentStreak, totalAttendance: stats.totalAttendance },
        newValue: { currentStreak: newStreak, totalAttendance: newTotal },
      });

      return NextResponse.json({ success: true, stats: updatedStats });
    }

    // 7. Update Member Data (Full Name, Phone, Role, Gender)
    if (body.action === "update-member") {
      const { targetMemberId, fullName, phone, role, gender } = body;
      const targetMember = await prisma.member.findUnique({
        where: { id: targetMemberId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
      }

      const { normalizePhoneNumber, isValidPhone } = await import("@/lib/phone");
      const normalizedPhone = normalizePhoneNumber(phone || targetMember.phone);

      if (!isValidPhone(normalizedPhone)) {
        return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
      }

      // Check phone collision
      if (normalizedPhone !== targetMember.phone) {
        const phoneOwner = await prisma.member.findUnique({
          where: { phone: normalizedPhone },
        });
        if (phoneOwner && phoneOwner.id !== targetMember.id) {
          return NextResponse.json({ error: "PHONE_EXISTS" }, { status: 400 });
        }
      }

      if (role && role !== targetMember.role) {
        if (!canManageRole(user.role, targetMember.role) || !canManageRole(user.role, role)) {
          return NextResponse.json({ error: "CANNOT_MANAGE_ROLE" }, { status: 403 });
        }
      }

      const updated = await prisma.member.update({
        where: { id: targetMember.id },
        data: {
          fullName: fullName ? fullName.trim() : targetMember.fullName,
          phone: normalizedPhone,
          role: role || targetMember.role,
          updatedAt: new Date(),
        },
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "UPDATE_MEMBER",
        targetEntity: "Member",
        targetId: targetMember.id,
        reason: `Updated member information for ${updated.fullName}`,
      });

      return NextResponse.json({ success: true, member: updated });
    }

    // 8. Update Member Avatar
    if (body.action === "update-avatar") {
      const { targetMemberId, avatarUrl } = body;
      const targetMember = await prisma.member.findUnique({
        where: { id: targetMemberId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
      }

      const updated = await prisma.member.update({
        where: { id: targetMember.id },
        data: { avatarUrl: avatarUrl || null, updatedAt: new Date() },
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "UPDATE_AVATAR",
        targetEntity: "Member",
        targetId: targetMember.id,
        reason: `Assigned avatar to ${targetMember.fullName}`,
      });

      return NextResponse.json({ success: true, member: updated });
    }

    // 9. Delete Member and all associated records permanently
    if (body.action === "delete-member") {
      const { targetMemberId } = body;
      if (targetMemberId === user.memberId) {
        return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
      }

      const targetMember = await prisma.member.findUnique({
        where: { id: targetMemberId },
      });

      if (!targetMember) {
        return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
      }

      // Developer is protected and hidden: cannot be deleted
      if (targetMember.role === "DEVELOPER") {
        return NextResponse.json({ error: "CANNOT_DELETE_DEVELOPER" }, { status: 403 });
      }

      // Moderators cannot delete Admins
      if (user.role === "MODERATOR" && (targetMember.role === "ADMIN" || targetMember.role === "DEVELOPER")) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      await prisma.$transaction(async (tx) => {
        // Cascade delete all member relations
        await tx.attendance.deleteMany({ where: { memberId: targetMemberId } });
        await tx.memberReward.deleteMany({ where: { memberId: targetMemberId } });
        await tx.memberAchievement.deleteMany({ where: { memberId: targetMemberId } });
        await tx.streakResetRequest.deleteMany({ where: { memberId: targetMemberId } });
        await tx.notification.deleteMany({ where: { memberId: targetMemberId } });
        await tx.memberStats.deleteMany({ where: { memberId: targetMemberId } });
        await tx.account.deleteMany({ where: { memberId: targetMemberId } });
        await tx.member.delete({ where: { id: targetMemberId } });
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "DELETE_MEMBER",
        targetEntity: "Member",
        targetId: targetMemberId,
        reason: `Permanently deleted member ${targetMember.fullName} (${targetMember.phone}) and all associated records`,
      });

      return NextResponse.json({ success: true, deletedMemberId: targetMemberId });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

