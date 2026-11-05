import { NextResponse } from "next/server";
import { getAnnualLeaderboard, getAllTimeLeaderboard, getStreakLeaderboard } from "@/lib/services/leaderboardService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "streak";
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    if (type === "streak") {
      const data = await getStreakLeaderboard();
      return NextResponse.json({ type: "streak", entries: data });
    }

    if (type === "all-time") {
      const data = await getAllTimeLeaderboard();
      return NextResponse.json({ type: "all-time", entries: data });
    }

    const data = await getAnnualLeaderboard(year);
    return NextResponse.json({ type: "annual", year, entries: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

