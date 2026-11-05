import { prisma } from "../prisma";
import { normalizePhoneNumber, isValidPhone } from "../phone";
import { hashPassword, generateSecurePassword, setAuthCookie, SessionPayload } from "../auth";
import { logActivity } from "../audit";
import { recalculateMemberStats } from "../streaks";
import { getRandomAvatarForGender } from "../avatars";

export interface PhoneCheckResult {
  valid: boolean;
  normalizedPhone: string;
  accountExists: boolean;
  memberExists: boolean;
  memberId?: string;
  memberName?: string;
}

export async function checkPhoneForRegistration(rawPhone: string): Promise<PhoneCheckResult> {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!isValidPhone(normalized)) {
    return {
      valid: false,
      normalizedPhone: normalized,
      accountExists: false,
      memberExists: false,
    };
  }

  // 1. Check if member exists with this phone
  const member = await prisma.member.findUnique({
    where: { phone: normalized },
    include: { loginAccount: true },
  });

  if (!member) {
    return {
      valid: true,
      normalizedPhone: normalized,
      accountExists: false,
      memberExists: false,
    };
  }

  // If member already has an active account
  if (member.loginAccount && member.loginAccount.status === "ACTIVE") {
    return {
      valid: true,
      normalizedPhone: normalized,
      accountExists: true,
      memberExists: true,
      memberId: member.id,
      memberName: member.fullName,
    };
  }

  // Member exists in attendance sheet but has no active login account
  return {
    valid: true,
    normalizedPhone: normalized,
    accountExists: false,
    memberExists: true,
    memberId: member.id,
    memberName: member.fullName,
  };
}

export async function registerNewMember(params: {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  gender?: "MALE" | "FEMALE";
  avatarUrl?: string;
}) {
  const normalizedPhone = normalizePhoneNumber(params.phone);
  if (!isValidPhone(normalizedPhone)) {
    throw new Error("INVALID_PHONE");
  }

  if (!params.password || params.password.length < 6) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  // Use normalized phone as email identifier if email is omitted
  const normalizedEmail = params.email && params.email.trim()
    ? params.email.toLowerCase().trim()
    : normalizedPhone;

  const assignedGender = params.gender === "FEMALE" ? "FEMALE" : "MALE";
  const assignedAvatarUrl = params.avatarUrl && params.avatarUrl.trim()
    ? params.avatarUrl.trim()
    : getRandomAvatarForGender(assignedGender).url;

  // Execute in transaction
  return await prisma.$transaction(async (tx) => {
    // Check if phone or email exists
    const existingMember = await tx.member.findFirst({
      where: {
        OR: [{ phone: normalizedPhone }, { email: normalizedEmail }],
      },
    });

    if (existingMember) {
      if (existingMember.phone === normalizedPhone) throw new Error("PHONE_EXISTS");
      if (existingMember.email === normalizedEmail) throw new Error("EMAIL_EXISTS");
    }

    const existingAccount = await tx.account.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingAccount) throw new Error("ACCOUNT_EXISTS");

    // 1. Create Member Record
    const member = await tx.member.create({
      data: {
        fullName: params.fullName.trim(),
        phone: normalizedPhone,
        email: params.email && params.email.trim() ? normalizedEmail : null,
        avatarUrl: assignedAvatarUrl,
        gender: assignedGender,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    // 2. Hash password & create Login Account
    const passwordHash = await hashPassword(params.password);
    const account = await tx.account.create({
      data: {
        memberId: member.id,
        email: normalizedEmail,
        passwordHash,
        status: "ACTIVE",
      },
    });

    // 3. Initialize MemberStats
    await tx.memberStats.create({
      data: {
        memberId: member.id,
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

    return { member, account };
  });
}

export async function linkExistingMember(params: {
  memberId: string;
  phone: string;
  email?: string;
  password: string;
  gender?: "MALE" | "FEMALE";
  avatarUrl?: string;
}) {
  const normalizedPhone = normalizePhoneNumber(params.phone);
  const normalizedEmail = params.email && params.email.trim()
    ? params.email.toLowerCase().trim()
    : normalizedPhone;

  if (!params.password || params.password.length < 6) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const assignedGender = params.gender === "FEMALE" ? "FEMALE" : "MALE";
  const assignedAvatarUrl = params.avatarUrl && params.avatarUrl.trim()
    ? params.avatarUrl.trim()
    : getRandomAvatarForGender(assignedGender).url;

  return await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: params.memberId },
      include: { loginAccount: true },
    });

    if (!member) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (member.phone !== normalizedPhone) {
      throw new Error("PHONE_MISMATCH");
    }

    if (member.loginAccount && member.loginAccount.status === "ACTIVE") {
      throw new Error("ALREADY_LINKED");
    }

    // Check email uniqueness
    const existingEmailAccount = await tx.account.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmailAccount) {
      throw new Error("EMAIL_ALREADY_IN_USE");
    }

    const passwordHash = await hashPassword(params.password);

    // If an inactive or unlinked account existed for this member, reactivate/update it
    let account;
    if (member.loginAccount) {
      account = await tx.account.update({
        where: { id: member.loginAccount.id },
        data: {
          email: normalizedEmail,
          passwordHash,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });
    } else {
      account = await tx.account.create({
        data: {
          memberId: member.id,
          email: normalizedEmail,
          passwordHash,
          status: "ACTIVE",
        },
      });
    }

    // Update member avatar and gender if appropriate
    await tx.member.update({
      where: { id: member.id },
      data: {
        avatarUrl: member.avatarUrl || assignedAvatarUrl,
        gender: member.gender || assignedGender,
        ...(params.email && params.email.trim() && !member.email ? { email: normalizedEmail } : {}),
      },
    });

    return { member, account };
  });
}

export async function adminGenerateNewPassword(
  adminMemberId: string,
  adminRole: string,
  adminName: string,
  targetMemberId: string
) {
  // Authorization check
  if (adminRole !== "ADMIN" && adminRole !== "DEVELOPER") {
    throw new Error("UNAUTHORIZED");
  }

  const targetMember = await prisma.member.findUnique({
    where: { id: targetMemberId },
    include: { loginAccount: true },
  });

  if (!targetMember) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  // Developer protection: Admin cannot reset Developer account password
  if (targetMember.role === "DEVELOPER" && adminRole !== "DEVELOPER") {
    throw new Error("CANNOT_MODIFY_DEVELOPER");
  }

  const plainPassword = generateSecurePassword(12);
  const passwordHash = await hashPassword(plainPassword);

  let loginIdentifier = targetMember.loginAccount?.email;

  if (targetMember.loginAccount) {
    await prisma.account.update({
      where: { id: targetMember.loginAccount.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });
  } else {
    // If the member is "كشف فقط" (Roster only), automatically create their login account now!
    loginIdentifier = targetMember.email || targetMember.phone;
    await prisma.account.create({
      data: {
        memberId: targetMember.id,
        email: loginIdentifier,
        passwordHash,
        status: "ACTIVE",
      },
    });
  }

  // Log action (DO NOT LOG PASSWORD)
  await logActivity({
    actorId: adminMemberId,
    actorName: adminName,
    actorRole: adminRole,
    action: "GENERATE_NEW_PASSWORD",
    targetEntity: "Member",
    targetId: targetMember.id,
    reason: `Generated by ${adminName} for member ${targetMember.fullName}`,
  });

  return {
    success: true,
    generatedPassword: plainPassword,
    memberId: targetMember.id,
    memberName: targetMember.fullName,
    email: loginIdentifier,
    phone: targetMember.phone,
  };
}

