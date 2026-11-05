import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/auth";
import { generateCSV, generateExcelBuffer, generatePDFDocument } from "@/lib/services/exportService";

export async function GET(req: Request) {
  try {
    const user = await getCurrentSession();
    if (!user || !hasRole(user.role, "ADMIN")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv"; // csv, excel, pdf
    const type = searchParams.get("type") || "members"; // members, attendance, rewards

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `church_export_${type}_${new Date().toISOString().split("T")[0]}`;

    if (type === "members") {
      const members = await prisma.member.findMany({
        where: { status: { not: "MERGED" } },
        orderBy: { fullName: "asc" },
        include: { stats: true },
      });

      headers = ["Member ID", "Full Name", "Phone", "Role", "Current Streak", "Longest Streak", "Total Attendance", "Rewards"];
      rows = members.map((m) => [
        m.id,
        m.fullName,
        m.phone,
        m.role,
        m.stats?.currentStreak || 0,
        m.stats?.longestStreak || 0,
        m.stats?.totalAttendance || 0,
        m.stats?.rewardsEarned || 0,
      ]);
    } else if (type === "rewards") {
      const rewards = await prisma.memberReward.findMany({
        include: { member: true },
        orderBy: { earnedDate: "desc" },
      });

      headers = ["Reward ID", "Member Name", "Milestone", "Status", "Earned Date", "Delivered At"];
      rows = rewards.map((r) => [
        r.id,
        r.member.fullName,
        `${r.milestone} Sessions`,
        r.status,
        r.earnedDate.toISOString().split("T")[0],
        r.deliveredAt ? r.deliveredAt.toISOString().split("T")[0] : "-",
      ]);
    } else {
      // Sessions
      const sessions = await prisma.saturdaySession.findMany({
        orderBy: { date: "desc" },
        include: { attendances: true },
      });

      headers = ["Date", "Status", "Present Count", "Absent Count", "Notes/Reason"];
      rows = sessions.map((s) => [
        s.date.toISOString().split("T")[0],
        s.status,
        s.attendances.filter((a) => a.status === "PRESENT").length,
        s.attendances.filter((a) => a.status === "ABSENT").length,
        s.offReason || s.title || "",
      ]);
    }

    if (format === "csv") {
      const csv = generateCSV(headers, rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === "excel") {
      const buffer = generateExcelBuffer(type.toUpperCase(), headers, rows);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    if (format === "pdf") {
      const buffer = generatePDFDocument(`Church Report - ${type.toUpperCase()}`, headers, rows);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "UNSUPPORTED_FORMAT" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

