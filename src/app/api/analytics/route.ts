import { NextResponse } from "next/server";
import { getGeneralAnalytics } from "@/lib/services/leaderboardService";
import { getCurrentSession, hasRole } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "MODERATOR")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const data = await getGeneralAnalytics();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

