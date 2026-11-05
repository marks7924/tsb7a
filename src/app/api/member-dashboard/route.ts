import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";
import { getAnnualLeaderboard, getAllTimeLeaderboard } from "@/lib/services/leaderboardService";

export async function GET() {
  try {
    const user = await getCurrentSession();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const member = await prisma.member.findUnique({
      where: { id: user.memberId },
      include: {
        stats: true,
        rewards: {
          orderBy: { earnedDate: "desc" },
        },
        achievements: {
          orderBy: { earnedAt: "desc" },
        },
        attendances: {
          include: {
            session: true,
          },
          orderBy: { session: { date: "desc" } },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
    }

    // Get all achievements catalog
    const allAchievementTypes = await prisma.achievementType.findMany();

    // Get all sessions for personal attendance calendar
    const allSessions = await prisma.saturdaySession.findMany({
      orderBy: { date: "asc" },
    });

    const attendanceMap = new Map(member.attendances.map((a) => [a.sessionId, a]));

    const calendarSessions = allSessions.map((s) => {
      const att = attendanceMap.get(s.id);
      return {
        sessionId: s.id,
        date: s.date,
        status: s.status, // SCHEDULED, ACTIVE, COMPLETED, OFF, CANCELLED
        title: s.title,
        offReason: s.offReason,
        attendanceStatus: att ? att.status : "UNMARKED", // PRESENT, ABSENT, UNMARKED
        method: att ? att.method : null,
      };
    });

    // Compute ranks
    const [annualBoard, allTimeBoard] = await Promise.all([
      getAnnualLeaderboard(new Date().getFullYear()),
      getAllTimeLeaderboard(),
    ]);

    const annualRank = annualBoard.find((e) => e.memberId === member.id)?.rank || "-";
    const allTimeRank = allTimeBoard.find((e) => e.memberId === member.id)?.rank || "-";

    return NextResponse.json({
      member: {
        id: member.id,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role,
        joinedDate: member.joinedDate,
      },
      stats: member.stats,
      calendar: calendarSessions,
      rewards: member.rewards,
      achievements: member.achievements,
      achievementTypes: allAchievementTypes,
      annualRank,
      allTimeRank,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

