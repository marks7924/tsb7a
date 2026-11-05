import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";
import { reviewStreakResetRequest } from "@/lib/services/resetService";

export async function GET() {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const requests = await prisma.streakResetRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            stats: true,
          },
        },
        session: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const body = await req.json();
    const result = await reviewStreakResetRequest({
      requestId: body.requestId,
      decision: body.decision,
      reviewerId: user.memberId,
      reviewerName: user.fullName,
      reviewerRole: user.role,
      decisionNotes: body.decisionNotes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

