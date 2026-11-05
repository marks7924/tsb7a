import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";
import {
  markAttendance,
  quickAddMemberToAttendance,
  ensureSaturdaySessionsExist,
  normalizeToSaturdayMidnight,
  recordMemberAttendanceViaQRScan,
  reverseSaturdayOff,
} from "@/lib/services/attendanceService";
import { createOrRenewSessionQR, revokeSessionQR, verifyAndRecordQRScan } from "@/lib/qr";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let sessionId = searchParams.get("sessionId");

    // Automatically make sure Saturday sessions are populated
    await ensureSaturdaySessionsExist();

    let session = null;
    if (sessionId) {
      session = await prisma.saturdaySession.findUnique({
        where: { id: sessionId },
      });
    }

    // If no sessionId specified or invalid, pick the current active or nearest Saturday session
    if (!session) {
      const currentSat = normalizeToSaturdayMidnight(new Date());
      session = await prisma.saturdaySession.findFirst({
        where: {
          OR: [{ status: "ACTIVE" }, { date: currentSat }],
        },
        orderBy: { date: "desc" },
      });

      if (!session) {
        session = await prisma.saturdaySession.findFirst({
          orderBy: { date: "desc" },
        });
      }

      if (session) {
        sessionId = session.id;
      }
    }

    if (!session || !sessionId) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    // Get all active members
    const members = await prisma.member.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      include: {
        stats: true,
        attendances: {
          where: { sessionId },
        },
      },
    });

    const rows = members.map((m) => {
      const att = m.attendances[0];
      return {
        memberId: m.id,
        fullName: m.fullName,
        phone: m.phone,
        role: m.role,
        avatarUrl: m.avatarUrl,
        attendanceStatus: att ? att.status : "UNMARKED",
        method: att ? att.method : null,
        markedAt: att ? att.markedAt : null,
        currentStreak: m.stats?.currentStreak || 0,
        longestStreak: m.stats?.longestStreak || 0,
        provisionalStreak: m.stats?.provisionalStreak || 0,
        hasPendingReset: m.stats?.hasPendingReset || false,
        rewardsEarned: m.stats?.rewardsEarned || 0,
      };
    });

    return NextResponse.json({
      session,
      members: rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();
    const body = await req.json();

    // 1. Member self QR Scan (Scanning church screen)
    // 1. Self Attendance via Scanning Session QR Code (projected on church screen)
    if (body.action === "qr-scan" || body.action === "scan-session-qr") {
      if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
      const rawToken = (body.token || body.qrPayload || "").trim();
      const scanResult = await verifyAndRecordQRScan(body.sessionId, rawToken, user.memberId);
      if (!scanResult.success) {
        if (scanResult.alreadyRecorded) {
          return NextResponse.json({
            success: true,
            alreadyRecorded: true,
            message: "تم تسجيل حضورك مسبقاً في تسبحة اليوم بالفعل",
          });
        }
        return NextResponse.json({ error: scanResult.error, message: scanResult.error }, { status: 400 });
      }
      const { recalculateMemberStats } = await import("@/lib/streaks");
      await recalculateMemberStats(user.memberId);
      return NextResponse.json({
        success: true,
        message: "تم تسجيل حضورك بنجاح في تسبحة اليوم!",
      });
    }

    // Moderator or Admin required for all other actions
    if (!user || !hasRole(user.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    // 2. Scan Member's Personal Attendance QR Pass (by Moderator/Admin)
    if (body.action === "scan-member-pass" || body.action === "scan-member") {
      const qrPayload = body.qrPayload || body.token || body.memberId;
      if (!qrPayload) {
        return NextResponse.json({ error: "QR_PAYLOAD_REQUIRED" }, { status: 400 });
      }

      const scanResult = await recordMemberAttendanceViaQRScan({
        qrPayload,
        sessionId: body.sessionId,
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
      });

      return NextResponse.json(scanResult);
    }

    // 3. Mark Attendance (Manual toggle Present/Absent)
    if (body.action === "mark") {
      if (!body.sessionId || !body.memberId || !body.status) {
        return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
      }

      const att = await markAttendance({
        memberId: body.memberId,
        sessionId: body.sessionId,
        status: body.status,
        method: "MANUAL",
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
      });
      return NextResponse.json({ success: true, attendance: att });
    }

    // 4. Reverse Saturday OFF status back to ACTIVE/COMPLETED
    if (body.action === "reverse-off") {
      if (!body.sessionId) {
        return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
      }
      const session = await reverseSaturdayOff({
        sessionId: body.sessionId,
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
      });
      return NextResponse.json({ success: true, session });
    }

    // 5. Quick Add Member to Attendance
    if (body.action === "quick-add") {
      const member = await quickAddMemberToAttendance({
        fullName: body.fullName,
        phone: body.phone,
        sessionId: body.sessionId,
        markPresent: body.markPresent,
        actorId: user.memberId,
        actorName: user.fullName,
        actorRole: user.role,
      });
      return NextResponse.json({ success: true, member });
    }

    // 6. Church Session QR Token Generation
    if (body.action === "qr-generate") {
      const qrData = await createOrRenewSessionQR(body.sessionId, body.durationMinutes || 180);
      return NextResponse.json({ success: true, ...qrData });
    }

    // 7. Church Session QR Token Revoke
    if (body.action === "qr-revoke") {
      await revokeSessionQR(body.sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error: any) {
    const errorMsg = error?.message || "INTERNAL_ERROR";
    const isOffError = errorMsg === "CANNOT_MARK_ON_OFF_OR_CANCELLED_SESSION";
    return NextResponse.json(
      {
        error: errorMsg,
        message: isOffError
          ? "هذا السبت لا توجد به تسبحة. يرجى تفعيل التسبحة أولاً لتسجيل الحضور."
          : errorMsg,
      },
      { status: 400 }
    );
  }
}

