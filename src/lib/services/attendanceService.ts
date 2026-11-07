import { prisma } from "../prisma";
import { logActivity } from "../audit";
import { recalculateMemberStats } from "../streaks";

export function normalizeToSaturdayMidnight(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Automatically ensures that Saturday sessions exist according to church schedule:
 * 1. The last completed Saturday
 * 2. Today's Saturday (only if today is Saturday, and becomes ACTIVE at 10 AM)
 * 3. The next upcoming Saturday
 * Also automatically cleans up any distant future scheduled sessions (> next Saturday).
 */
export async function ensureSaturdaySessionsExist() {
  const now = new Date();
  // Egypt Cairo time (+2 or +3)
  const cairoStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const cairoNow = new Date(cairoStr);
  const cairoDay = cairoNow.getDay(); // 0 = Sun, 6 = Sat
  const cairoHour = cairoNow.getHours();

  // Find next Saturday
  let daysUntilNextSat = (6 - cairoDay + 7) % 7;
  if (daysUntilNextSat === 0) {
    daysUntilNextSat = 7; // If today is Saturday, next Saturday is 7 days ahead
  }
  const nextSat = new Date(cairoNow);
  nextSat.setDate(nextSat.getDate() + daysUntilNextSat);
  nextSat.setUTCHours(0, 0, 0, 0);

  // 1. Clean up excessive future scheduled sessions without attendances (> next Saturday)
  try {
    await prisma.saturdaySession.deleteMany({
      where: {
        date: { gt: nextSat },
        attendances: { none: {} },
      },
    });

    // Clean up any test session titles like "Test Sat 2026-11-07T00:00:00.000Z"
    const testSessions = await prisma.saturdaySession.findMany({
      where: {
        OR: [
          { title: { startsWith: "Test Sat" } },
          { title: { contains: "T00:00:00" } },
        ],
      },
    });
    for (const ts of testSessions) {
      const dateStr = ts.date.toISOString().split("T")[0];
      await prisma.saturdaySession.update({
        where: { id: ts.id },
        data: { title: `تسبحة سبت ${dateStr}` },
      });
    }
  } catch { }

  // 2. Identify the 2 or 3 Saturdays
  const lastSat = new Date(cairoNow);
  let todaySat: Date | null = null;

  if (cairoDay === 6) {
    // Today is Saturday
    todaySat = new Date(cairoNow);
    todaySat.setUTCHours(0, 0, 0, 0);

    lastSat.setDate(lastSat.getDate() - 7);
    lastSat.setUTCHours(0, 0, 0, 0);
  } else {
    // Today is NOT Saturday
    const daysSinceLastSat = (cairoDay + 1) % 7;
    lastSat.setDate(lastSat.getDate() - daysSinceLastSat);
    lastSat.setUTCHours(0, 0, 0, 0);
  }

  // Ensure last Saturday exists
  try {
    const existingLast = await prisma.saturdaySession.findUnique({
      where: { date: lastSat },
    });
    if (!existingLast) {
      await prisma.saturdaySession.create({
        data: {
          date: lastSat,
          title: `تسبحة سبت ${lastSat.toISOString().split("T")[0]}`,
          status: "COMPLETED",
        },
      });
    }
  } catch { }

  // If today is Saturday, ensure today's session exists and is ACTIVE if >= 10 am
  if (todaySat) {
    try {
      const existingToday = await prisma.saturdaySession.findUnique({
        where: { date: todaySat },
      });
      const isPast10Am = cairoHour >= 10;
      if (!existingToday) {
        await prisma.saturdaySession.create({
          data: {
            date: todaySat,
            title: `تسبحة سبت ${todaySat.toISOString().split("T")[0]}`,
            status: isPast10Am ? "ACTIVE" : "SCHEDULED",
            qrActive: isPast10Am,
          },
        });
      } else if (isPast10Am && existingToday.status === "SCHEDULED") {
        await prisma.saturdaySession.update({
          where: { id: existingToday.id },
          data: { status: "ACTIVE", qrActive: true },
        });
      }
    } catch { }
  }

  // Ensure next Saturday exists
  try {
    const existingNext = await prisma.saturdaySession.findUnique({
      where: { date: nextSat },
    });
    if (!existingNext) {
      await prisma.saturdaySession.create({
        data: {
          date: nextSat,
          title: `تسبحة سبت ${nextSat.toISOString().split("T")[0]}`,
          status: "SCHEDULED",
        },
      });
    }
  } catch { }
}

export async function createSaturdaySession(params: {
  date: Date | string;
  title?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
}) {
  const sessionDate = normalizeToSaturdayMidnight(params.date);

  const existing = await prisma.saturdaySession.findUnique({
    where: { date: sessionDate },
  });

  if (existing) {
    throw new Error("SESSION_ALREADY_EXISTS_FOR_DATE");
  }

  const session = await prisma.saturdaySession.create({
    data: {
      date: sessionDate,
      title: params.title || `تسبحة ${sessionDate.toISOString().split("T")[0]}`,
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
    newValue: { date: sessionDate, title: session.title },
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

/**
 * Permanently delete a praise session and its attendances (used for Archive cleanup).
 */
export async function deleteSaturdaySession(params: {
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

  // Delete attendances first
  if (session.attendances.length > 0) {
    await prisma.attendance.deleteMany({
      where: { sessionId: params.sessionId },
    });
  }

  const deleted = await prisma.saturdaySession.delete({
    where: { id: params.sessionId },
  });

  // Recompute stats for affected members
  for (const att of session.attendances) {
    await recalculateMemberStats(att.memberId);
  }

  await logActivity({
    action: "DELETE_SATURDAY_SESSION",
    targetEntity: "SaturdaySession",
    targetId: params.sessionId,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    oldValue: { date: session.date, status: session.status, title: session.title },
    reason: "Deleted from past praises archive",
  });

  return deleted;
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
  } catch { }

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
