import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

