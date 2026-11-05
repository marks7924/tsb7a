import crypto from "crypto";
import { prisma } from "./prisma";

export function generateSecureQRToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createOrRenewSessionQR(sessionId: string, durationMinutes = 180) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const token = generateSecureQRToken();

  const session = await prisma.saturdaySession.update({
    where: { id: sessionId },
    data: {
      qrActive: true,
      qrToken: token,
      qrExpiresAt: expiresAt,
    },
  });

  return {
    sessionId: session.id,
    token,
    expiresAt,
  };
}

export async function revokeSessionQR(sessionId: string) {
  return await prisma.saturdaySession.update({
    where: { id: sessionId },
    data: {
      qrActive: false,
      qrToken: null,
      qrExpiresAt: null,
    },
  });
}

export async function verifyAndRecordQRScan(sessionId: string | undefined | null, token: string, memberId: string) {
  let session = null;
  if (sessionId) {
    session = await prisma.saturdaySession.findUnique({
      where: { id: sessionId },
    });
  } else {
    session = await prisma.saturdaySession.findFirst({
      where: {
        qrToken: token,
        status: { notIn: ["OFF", "CANCELLED"] },
      },
    });
  }

  if (!session) {
    return { success: false, error: "SESSION_NOT_FOUND" };
  }

  if (session.status !== "ACTIVE" && session.status !== "COMPLETED") {
    return { success: false, error: "SESSION_NOT_ACTIVE" };
  }

  if (!session.qrActive || !session.qrToken || session.qrToken !== token) {
    return { success: false, error: "INVALID_TOKEN" };
  }

  if (session.qrExpiresAt && new Date() > session.qrExpiresAt) {
    return { success: false, error: "TOKEN_EXPIRED" };
  }

  // Check if member already has attendance
  const existing = await prisma.attendance.findUnique({
    where: {
      memberId_sessionId: {
        memberId,
        sessionId: session.id,
      },
    },
  });

  if (existing) {
    if (existing.status === "PRESENT") {
      return {
        success: false,
        error: "ALREADY_PRESENT",
        alreadyRecorded: true,
        message: "تم تسجيل حضورك مسبقاً في تسبحة اليوم بالفعل (لا يحتسب مرتين)",
      };
    }
    // Update to PRESENT via QR
    await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        status: "PRESENT",
        method: "QR",
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new attendance record
    await prisma.attendance.create({
      data: {
        memberId,
        sessionId: session.id,
        status: "PRESENT",
        method: "QR",
      },
    });
  }

  // Create attendance notification
  try {
    await prisma.notification.create({
      data: {
        memberId,
        titleEn: "Attendance Recorded",
        titleAr: "تم تسجيل الحضور",
        messageEn: "Your attendance was successfully recorded via QR code.",
        messageAr: "تم تسجيل حضورك بنجاح عبر رمز الاستجابة السريعة (QR).",
        type: "ATTENDANCE",
      },
    });
  } catch { }

  return { success: true };
}

