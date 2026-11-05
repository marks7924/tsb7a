import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";
import {
  createSaturdaySession,
  markSaturdayAsOff,
  reverseSaturdayOff,
  ensureSaturdaySessionsExist,
} from "@/lib/services/attendanceService";

export async function GET() {
  try {
    // Ensure all Saturday sessions exist automatically
    await ensureSaturdaySessionsExist();

    const sessions = await prisma.saturdaySession.findMany({
      orderBy: { date: "desc" },
      include: {
        attendances: true,
      },
    });

    const formatted = sessions.map((s) => {
      const presentCount = s.attendances.filter((a) => a.status === "PRESENT").length;
      const absentCount = s.attendances.filter((a) => a.status === "ABSENT").length;
      return {
        id: s.id,
        date: s.date,
        status: s.status,
        title: s.title,
        offReason: s.offReason,
        qrActive: s.qrActive,
        qrToken: s.qrToken,
        qrExpiresAt: s.qrExpiresAt,
        presentCount,
        absentCount,
      };
    });

    return NextResponse.json({ sessions: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentSession();
    if (!sessionUser || !hasRole(sessionUser.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const body = await req.json();

    if (body.action === "mark-off") {
      const updated = await markSaturdayAsOff({
        sessionId: body.sessionId,
        reason: body.reason,
        actorId: sessionUser.memberId,
        actorName: sessionUser.fullName,
        actorRole: sessionUser.role,
      });
      return NextResponse.json({ success: true, session: updated });
    }

    if (body.action === "reverse-off") {
      const updated = await reverseSaturdayOff({
        sessionId: body.sessionId,
        actorId: sessionUser.memberId,
        actorName: sessionUser.fullName,
        actorRole: sessionUser.role,
      });
      return NextResponse.json({ success: true, session: updated });
    }

    // Create session
    const session = await createSaturdaySession({
      date: body.date,
      title: body.title,
      createdById: sessionUser.memberId,
      createdByName: sessionUser.fullName,
      createdByRole: sessionUser.role,
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

