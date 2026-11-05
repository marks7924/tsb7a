import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const JWT_SECRET = process.env.JWT_SECRET || "church_tasbeha_secure_jwt_token_secret_key_2026_coptic";
const TOKEN_COOKIE_NAME = "tsb7a_auth_token";

export interface SessionPayload {
  accountId: string;
  memberId: string;
  role: "MEMBER" | "MODERATOR" | "ADMIN" | "DEVELOPER";
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateSecurePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  // Ensure at least one upper, one lower, one digit, one special
  password += "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
  password += "abcdefghijkmnpqrstuvwxyz"[Math.floor(Math.random() * 24)];
  password += "23456789"[Math.floor(Math.random() * 8)];
  password += "!@#$%&*"[Math.floor(Math.random() * 7)];

  for (let i = password.length; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Shuffle
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;

    // Check account status in DB
    const account = await prisma.account.findUnique({
      where: { id: payload.accountId },
      include: { member: true },
    });

    if (!account || account.status !== "ACTIVE" || account.member.status !== "ACTIVE") {
      return null;
    }

    return {
      accountId: account.id,
      memberId: account.member.id,
      role: account.member.role as SessionPayload["role"],
      fullName: account.member.fullName,
      email: account.email,
      phone: account.member.phone,
      avatarUrl: account.member.avatarUrl,
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(payload: SessionPayload) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

// Role Hierarchy:
// DEVELOPER (4) > ADMIN (3) > MODERATOR (2) > MEMBER (1)
const ROLE_LEVELS: Record<string, number> = {
  DEVELOPER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  MEMBER: 1,
};

export function hasRole(currentRole: string, requiredRole: string): boolean {
  return (ROLE_LEVELS[currentRole] || 0) >= (ROLE_LEVELS[requiredRole] || 0);
}

export function canManageRole(actorRole: string, targetCurrentRole: string, newRole?: string): boolean {
  // DEVELOPER is a hidden role: no one can give or take it in the web platform
  if (targetCurrentRole === "DEVELOPER" && actorRole !== "DEVELOPER") {
    return false; // Cannot modify or demote a DEVELOPER
  }
  if (newRole === "DEVELOPER") {
    return false; // No one can assign DEVELOPER in the app
  }

  // DEVELOPER has internal full authority
  if (actorRole === "DEVELOPER") {
    return true;
  }

  // ADMIN: can assign Admins, Mods, and Members. Cannot touch DEVELOPER.
  if (actorRole === "ADMIN") {
    if (targetCurrentRole === "DEVELOPER") return false;
    if (newRole) {
      return ["MEMBER", "MODERATOR", "ADMIN"].includes(newRole);
    }
    return true;
  }

  // MODERATOR: can assign Mods and Members. Cannot touch Admin or Developer.
  if (actorRole === "MODERATOR") {
    if (targetCurrentRole === "ADMIN" || targetCurrentRole === "DEVELOPER") {
      return false;
    }
    if (newRole) {
      return ["MEMBER", "MODERATOR"].includes(newRole);
    }
    return true;
  }

  return false;
}

export function canApproveResetRequest(
  actorRole: string,
  actorMemberId: string,
  request: { memberId: string; requestedById?: string | null }
): boolean {
  // Only Admin or Developer can approve/reject
  if (!hasRole(actorRole, "ADMIN")) return false;
  // Admin cannot approve their own reset request or a request they submitted
  if (request.memberId === actorMemberId) return false;
  if (request.requestedById === actorMemberId) return false;
  return true;
}

