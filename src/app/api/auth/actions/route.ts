import { NextResponse } from "next/server";
import { checkPhoneForRegistration, registerNewMember, linkExistingMember } from "@/lib/services/accountService";
import { setAuthCookie, getCurrentSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { action, ...data } = await req.json();

    if (action === "check-phone") {
      const result = await checkPhoneForRegistration(data.phone);
      return NextResponse.json(result);
    }

    if (action === "register-new") {
      const { member, account } = await registerNewMember({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        password: data.password,
        gender: data.gender,
        avatarUrl: data.avatarUrl,
      });

      const sessionPayload = {
        accountId: account.id,
        memberId: member.id,
        role: member.role as any,
        fullName: member.fullName,
        email: account.email,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
      };

      await setAuthCookie(sessionPayload);

      return NextResponse.json({ success: true, user: sessionPayload });
    }

    if (action === "link-account") {
      const { member, account } = await linkExistingMember({
        memberId: data.memberId,
        phone: data.phone,
        email: data.email,
        password: data.password,
        gender: data.gender,
        avatarUrl: data.avatarUrl,
      });

      const sessionPayload = {
        accountId: account.id,
        memberId: member.id,
        role: member.role as any,
        fullName: member.fullName,
        email: account.email,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
      };

      await setAuthCookie(sessionPayload);

      return NextResponse.json({ success: true, user: sessionPayload });
    }

    if (action === "change-password") {
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }

      const account = await prisma.account.findUnique({
        where: { id: session.accountId },
      });

      if (!account) {
        return NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 404 });
      }

      const isMatch = await verifyPassword(data.currentPassword, account.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "CURRENT_PASSWORD_INCORRECT" }, { status: 400 });
      }

      if (!data.newPassword || data.newPassword.length < 6) {
        return NextResponse.json({ error: "NEW_PASSWORD_TOO_SHORT" }, { status: 400 });
      }

      const newHash = await hashPassword(data.newPassword);
      await prisma.account.update({
        where: { id: account.id },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "update-avatar") {
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }

      const { avatarUrl } = data;
      await prisma.member.update({
        where: { id: session.memberId },
        data: { avatarUrl },
      });

      return NextResponse.json({ success: true, avatarUrl });
    }

    if (action === "update-name") {
      const session = await getCurrentSession();
      if (!session) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }

      const { fullName } = data;
      if (!fullName || !fullName.trim()) {
        return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
      }

      const updated = await prisma.member.update({
        where: { id: session.memberId },
        data: { fullName: fullName.trim(), updatedAt: new Date() },
      });

      const updatedSession = { ...session, fullName: updated.fullName };
      await setAuthCookie(updatedSession);

      return NextResponse.json({ success: true, fullName: updated.fullName });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "SERVER_ERROR" }, { status: 400 });
  }
}

