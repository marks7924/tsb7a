import { prisma } from "../prisma";
import { logActivity } from "../audit";
import { recalculateMemberStats } from "../streaks";

export function normalizeToSaturdayMidnight(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  const utcDay = d.getUTCDay();
  if (utcDay !== 6) {
    const diff = (6 - utcDay + 7) % 7;
    d.setUTCDate(d.getUTCDate() + diff);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Automatically ensures that Saturday sessions exist for the entire year
 * (16 weeks in the past and 24 weeks in the future).
 * Every Saturday inherently has a Tasbeha unless explicitly marked OFF.
 */
export async function ensureSaturdaySessionsExist() {
  const now = new Date();
  const currentSaturday = normalizeToSaturdayMidnight(now);

  // Generate 16 weeks past to 24 weeks future
  const saturdayDates: Date[] = [];
  for (let offset = -16; offset <= 24; offset++) {
    const sat = new Date(currentSaturday);
    sat.setUTCDate(sat.getUTCDate() + offset * 7);
    sat.setUTCHours(0, 0, 0, 0);
    saturdayDates.push(sat);
  }

  // Find existing sessions in this range
  const existing = await prisma.saturdaySession.findMany({
    where: {
      date: { in: saturdayDates },
    },
    select: { date: true },
  });

  const existingDatesSet = new Set(existing.map((e) => e.date.toISOString()));

  const toCreate: Array<{ date: Date; title: string; status: string }> = [];

  for (const satDate of saturdayDates) {
    if (!existingDatesSet.has(satDate.toISOString())) {
      const isCurrent = satDate.toISOString() === currentSaturday.toISOString();
      const isPast = satDate < currentSaturday;

      toCreate.push({
        date: satDate,
        title: `تسبحة سبت ${satDate.toISOString().split("T")[0]}`,
        status: isCurrent ? "ACTIVE" : isPast ? "COMPLETED" : "SCHEDULED",
      });
    }
  }

  if (toCreate.length > 0) {
    for (const sessionData of toCreate) {
      try {
        await prisma.saturdaySession.create({
          data: sessionData,
        });
      } catch {
        // Ignore if already created concurrently
      }
    }
  }
}

export async function createSaturdaySession(params: {
  date: Date | string;
  title?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
}) {
  const satDate = normalizeToSaturdayMidnight(params.date);

  const existing = await prisma.saturdaySession.findUnique({
    where: { date: satDate },
  });

  if (existing) {
    throw new Error("SESSION_ALREADY_EXISTS_FOR_SATURDAY");
  }

  const session = await prisma.saturdaySession.create({
    data: {
      date: satDate,
      title: params.title || `تسبحة سبت ${satDate.toISOString().split("T")[0]}`,
      status: "SCHEDULED",
      createdById: params.createdById,
    },
  });

  await logActivity({
    actorId: params.createdById,
    actorName: params.createdByName,
    actorRole: params.createdByRole,
    action: "CREATE_SESSION",
    targetEntity: "SaturdaySession",
    targetId: session.id,
    newValue: { date: satDate, title: session.title },
  });

  return session;
}

/**
 * Mark a Saturday session as OFF (even for past dates).
 * Stores optional reason (feasts, holy week).
 */
export async function markSaturdayAsOff(params: {
  sessionId: string;
  reason?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}) {
  const session = await prisma.saturdaySession.findUnique({
    where: { id: params.sessionId },
    include: { attendances: true },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const oldStatus = session.status;
  const updated = await prisma.saturdaySession.update({
    where: { id: params.sessionId },
    data: {
      status: "OFF",
      offReason: params.reason || null,
      updatedById: params.actorId,
    },
  });

  await logActivity({
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: "MARK_SESSION_OFF",
    targetEntity: "SaturdaySession",
    targetId: session.id,
    oldValue: { status: oldStatus },
    newValue: { status: "OFF", reason: params.reason },
    reason: params.reason,
  });

  // Recompute stats for any members who had records on this session
  for (const att of session.attendances) {
    await recalculateMemberStats(att.memberId);
  }

  return updated;
}

/**
 * Reverse an OFF Saturday back to ACTIVE or COMPLETED.
 */
export async function reverseSaturdayOff(params: {
  sessionId: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}) {
  const session = await prisma.saturdaySession.findUnique({
    where: { id: params.sessionId },
    include: { attendances: true },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const currentSat = normalizeToSaturdayMidnight(new Date());
  const isPast = session.date < currentSat;
  const newStatus = isPast ? "COMPLETED" : "ACTIVE";

  const updated = await prisma.saturdaySession.update({
    where: { id: params.sessionId },
    data: {
      status: newStatus,
      offReason: null,
      updatedById: params.actorId,
    },
  });

  await logActivity({
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: "REVERSE_SESSION_OFF",
    targetEntity: "SaturdaySession",
    targetId: session.id,
    oldValue: { status: "OFF" },
    newValue: { status: newStatus },
  });

  for (const att of session.attendances) {
    await recalculateMemberStats(att.memberId);
  }

  return updated;
}

export async function markAttendance(params: {
  memberId: string;
  sessionId: string;
  status: "PRESENT" | "ABSENT";
  method?: "MANUAL" | "QR";
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}) {
  const { memberId, sessionId, status, method = "MANUAL", actorId, actorName, actorRole } = params;

  const session = await prisma.saturdaySession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  if (session.status === "OFF" || session.status === "CANCELLED") {
    throw new Error("CANNOT_MARK_ON_OFF_OR_CANCELLED_SESSION");
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { stats: true },
  });

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const previousStreak = member.stats?.currentStreak || 0;

  const result = await prisma.$transaction(async (tx) => {
    const att = await tx.attendance.upsert({
      where: {
        memberId_sessionId: {
          memberId,
          sessionId,
        },
      },
      create: {
        memberId,
        sessionId,
        status,
        method,
        markedById: actorId,
      },
      update: {
        status,
        method,
        updatedById: actorId,
        updatedAt: new Date(),
      },
    });

    if (status === "ABSENT") {
      const existingReq = await tx.streakResetRequest.findFirst({
        where: {
          memberId,
          sessionId,
        },
      });

      if (!existingReq) {
        await tx.streakResetRequest.create({
          data: {
            memberId,
            sessionId,
            previousStreak,
            status: "PENDING",
            requestedById: actorId,
          },
        });
      }
    } else {
      await tx.streakResetRequest.deleteMany({
        where: {
          memberId,
          sessionId,
          status: "PENDING",
        },
      });
    }

    return att;
  });

  await recalculateMemberStats(memberId);

  return result;
}

/**
 * Scan a Member's Personal QR Pass by a Moderator / Admin
 * Marks the member as PRESENT for the active Saturday session.
 */
export async function recordMemberAttendanceViaQRScan(params: {
  qrPayload: string;
  sessionId?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}) {
  let { qrPayload, sessionId, actorId } = params;
  qrPayload = qrPayload.trim();

  // Extract member ID from payload:
  // Can be "TSB7A:MEMBER:<id>" or "<id>" or phone number
  let targetMemberId = qrPayload;
  if (qrPayload.startsWith("TSB7A:MEMBER:")) {
    const parts = qrPayload.split(":");
    targetMemberId = parts[2] || parts[1];
  }

  // Find member by ID or phone
  let member = await prisma.member.findUnique({
    where: { id: targetMemberId },
    include: { stats: true },
  });

  if (!member) {
    const { normalizePhoneNumber } = await import("../phone");
    const normPhone = normalizePhoneNumber(qrPayload);
    member = await prisma.member.findUnique({
      where: { phone: normPhone },
      include: { stats: true },
    });
  }

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  // If sessionId is not provided, find the active or current Saturday session
  let session;
  if (sessionId) {
    session = await prisma.saturdaySession.findUnique({
      where: { id: sessionId },
    });
  }

  if (!session) {
    await ensureSaturdaySessionsExist();
    const currentSat = normalizeToSaturdayMidnight(new Date());
    session = await prisma.saturdaySession.findFirst({
      where: {
        OR: [
          { status: "ACTIVE" },
          { date: currentSat },
        ],
      },
      orderBy: { date: "desc" },
    });
  }

  if (!session) {
    throw new Error("NO_ACTIVE_SESSION");
  }

  if (session.status === "OFF" || session.status === "CANCELLED") {
    throw new Error("CANNOT_MARK_ON_OFF_OR_CANCELLED_SESSION");
  }

  // Mark attendance as PRESENT via QR
  await prisma.attendance.upsert({
    where: {
      memberId_sessionId: {
        memberId: member.id,
        sessionId: session.id,
      },
    },
    create: {
      memberId: member.id,
      sessionId: session.id,
      status: "PRESENT",
      method: "QR",
      markedById: actorId,
    },
    update: {
      status: "PRESENT",
      method: "QR",
      updatedById: actorId,
      updatedAt: new Date(),
    },
  });

  // Recompute stats
  const stats = await recalculateMemberStats(member.id);

  // Create notification
  try {
    await prisma.notification.create({
      data: {
        memberId: member.id,
        titleEn: "Attendance Recorded (QR Pass)",
        titleAr: "تم تسجيل الحضور ببطاقة الـ QR",
        messageEn: `Your attendance for ${session.title || "Saturday praise"} was recorded.`,
        messageAr: `تم تسجيل حضورك بنجاح في ${session.title || "تسبحة السبت"} عبر بطاقتك الشخصية.`,
        type: "ATTENDANCE",
      },
    });
  } catch {}

  return {
    success: true,
    member: {
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      currentStreak: stats.currentStreak,
      totalAttendance: stats.totalAttendance,
    },
    sessionTitle: session.title,
  };
}

export async function quickAddMemberToAttendance(params: {
  fullName: string;
  phone: string;
  sessionId?: string;
  markPresent?: boolean;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}) {
  const { normalizePhoneNumber } = await import("../phone");
  const normalized = normalizePhoneNumber(params.phone);

  const member = await prisma.$transaction(async (tx) => {
    let m = await tx.member.findUnique({
      where: { phone: normalized },
    });

    if (!m) {
      m = await tx.member.create({
        data: {
          fullName: params.fullName.trim(),
          phone: normalized,
          role: "MEMBER",
          status: "ACTIVE",
          createdById: params.actorId,
        },
      });

      await tx.memberStats.create({
        data: {
          memberId: m.id,
        },
      });
    }

    if (params.sessionId && params.markPresent) {
      await tx.attendance.upsert({
        where: {
          memberId_sessionId: {
            memberId: m.id,
            sessionId: params.sessionId,
          },
        },
        create: {
          memberId: m.id,
          sessionId: params.sessionId,
          status: "PRESENT",
          method: "MANUAL",
          markedById: params.actorId,
        },
        update: {
          status: "PRESENT",
          markedById: params.actorId,
        },
      });
    }

    return m;
  });

  await recalculateMemberStats(member.id);

  return member;
}
