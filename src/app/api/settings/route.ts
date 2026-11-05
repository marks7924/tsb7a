import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));
    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "UNAUTHORIZED_ADMIN_REQUIRED" }, { status: 403 });
    }

    const body = await req.json();

    // Reset All Scores, Streaks, and Attendances to 0
    if (body.action === "reset-all-scores") {
      await prisma.$transaction(async (tx) => {
        // 1. Reset all member stats to 0
        await tx.memberStats.updateMany({
          data: {
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
        });

        // 2. Clear all attendance records
        await tx.attendance.deleteMany({});

        // 3. Clear milestone rewards, reset requests, and achievements
        await tx.memberReward.deleteMany({});
        await tx.streakResetRequest.deleteMany({});
        await tx.memberAchievement.deleteMany({});
      });

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "RESET_ALL_SCORES",
        targetEntity: "MemberStats",
        reason: `Full reset of all member streaks, attendances, and scores to 0 by ${user.fullName} (${user.role})`,
      });

      return NextResponse.json({
        success: true,
        message: "تم تصفير جميع النقاط والسلاسل وسجلات الحضور بنجاح لجميع المخدومين",
      });
    }

    const { settings } = body;
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await prisma.systemSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }

      await logActivity({
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
        action: "UPDATE_SYSTEM_SETTINGS",
        targetEntity: "SystemSetting",
        newValue: settings,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

