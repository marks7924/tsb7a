import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setAuthCookie, clearAuthCookie, getCurrentSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    const rawInput = (email || "").trim();
    const cleanLower = rawInput.toLowerCase();

    // Check if input might be an Egyptian phone number
    const { normalizePhoneNumber } = await import("@/lib/phone");
    const normalizedPhone = normalizePhoneNumber(rawInput);

    // Search by email, member phone, or direct account identifier
    const account = await prisma.account.findFirst({
      where: {
        OR: [
          { email: cleanLower },
          { email: normalizedPhone },
          { member: { phone: normalizedPhone } },
          { member: { phone: rawInput } },
        ],
      },
      include: { member: true },
    });

    if (!account) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (account.status !== "ACTIVE" || account.member.status !== "ACTIVE") {
      return NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 });
    }

    const isMatch = await verifyPassword(password, account.passwordHash);

    // Temporary feature: allow phone number as password (username = password)
    const cleanPassword = password.trim();
    const isPhoneMatch =
      cleanPassword === rawInput.trim() ||
      cleanPassword === account.member.phone ||
      cleanPassword === account.member.phone.replace("+2", "") ||
      cleanPassword === "0" + account.member.phone.replace("+20", "") ||
      normalizePhoneNumber(cleanPassword) === account.member.phone;

    if (!isMatch && !isPhoneMatch) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    // Update last login
    await prisma.account.update({
      where: { id: account.id },
      data: { lastLogin: new Date() },
    });

    const sessionPayload = {
      accountId: account.id,
      memberId: account.member.id,
      role: account.member.role as any,
      fullName: account.member.fullName,
      email: account.email,
      phone: account.member.phone,
      avatarUrl: account.member.avatarUrl,
    };

    await setAuthCookie(sessionPayload);

    return NextResponse.json({
      success: true,
      user: sessionPayload,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session });
}

