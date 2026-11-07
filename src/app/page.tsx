"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { MemberAvatar } from "@/components/MemberAvatar";
import { LaurelRankBadge } from "@/components/LaurelRankBadge";
import {
  Trophy,
  Flame,
  Search,
  CalendarCheck,
  QrCode,
  Award,
} from "lucide-react";

// Arabic dual and plural unit rules as requested:
// Saturdays: 0: 0 سبت | 1: سبت | 2: سبتان | 3-10: X سبوت | 11+: X سبت
export function formatSaturdays(count: number, language: string = "ar"): string {
  if (language !== "ar") {
    return count === 1 ? "1 Saturday" : `${count} Saturdays`;
  }
  if (count === 0) return "0 سبت";
  if (count === 1) return "سبت";
  if (count === 2) return "سبتان";
  if (count >= 3 && count <= 10) return `${count} سبوت`;
  return `${count} سبت`;
}

// Weeks: 0: 0 اسبوع | 1: اسبوع | 2: اسبوعان | 3-10: X اسابيع | 11+: X اسبوع
export function formatWeeks(count: number, language: string = "ar"): string {
  if (language !== "ar") {
    return count === 1 ? "1 week" : `${count} weeks`;
  }
  if (count === 0) return "0 اسبوع";
  if (count === 1) return "اسبوع";
  if (count === 2) return "اسبوعان";
  if (count >= 3 && count <= 10) return `${count} اسابيع`;
  return `${count} اسبوع`;
}

export default function HomePage() {
  const { language, t } = useLanguage();
  // Only two tabs: "streak" (السلسلة الحالية) and "all-time" (عدد الحضور)
  const [boardType, setBoardType] = useState<"streak" | "all-time">("streak");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [boardType]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setCurrentUser(data.user || null);
    } catch { }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const url =
        boardType === "streak"
          ? `/api/leaderboard?type=streak`
          : `/api/leaderboard?type=all-time`;
      const res = await fetch(url);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const cleanName = (fullName: string) =>
    fullName
      ? fullName
        .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
        .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
        .trim()
      : "";

  const filteredEntries = entries.filter((e) =>
    cleanName(e.fullName).toLowerCase().includes(search.toLowerCase().trim())
  );

  // Score value helper for podium evaluation
  const getScoreValue = (e: any) => {
    if (!e) return 0;
    return boardType === "streak" ? (e.currentStreak ?? 0) : (e.attendanceCount ?? 0);
  };

  const formatPodiumScore = (e: any) => {
    const val = getScoreValue(e);
    if (boardType === "streak") {
      return formatWeeks(val, language);
    }
    return formatSaturdays(val, language);
  };

  // Podium visibility & Tie-breaking logic:
  // 1. if all scores 0 -> hide podium section completely, all users in table
  // 2. if more than one user has the same point as 1st place -> hide podium section completely
  // 3. if more than one user has the same points as 2nd place -> only show 1st on podium
  // 4. if more than one user has the same points as 3rd place -> only show 1st and 2nd on podium
  const hasSearch = search.trim().length > 0;
  const scores = filteredEntries.map((e) => getScoreValue(e));
  const allZero = scores.length === 0 || scores.every((s) => s === 0);

  let show1st = false;
  let show2nd = false;
  let show3rd = false;
  let podiumCount = 0;

  if (!hasSearch && !allZero && scores.length > 0) {
    const s0 = scores[0];
    const firstCount = scores.filter((s) => s === s0).length;

    if (firstCount === 1) {
      show1st = true;
      podiumCount = 1;

      if (scores.length > 1) {
        const s1 = scores[1];
        const secondCount = scores.filter((s) => s === s1).length;

        if (secondCount === 1) {
          show2nd = true;
          podiumCount = 2;

          if (scores.length > 2) {
            const s2 = scores[2];
            const thirdCount = scores.filter((s) => s === s2).length;

            if (thirdCount === 1) {
              show3rd = true;
              podiumCount = 3;
            }
          }
        }
      }
    }
  }

  const top1 = show1st ? filteredEntries[0] : null;
  const top2 = show2nd ? filteredEntries[1] : null;
  const top3 = show3rd ? filteredEntries[2] : null;

  // The rest of the members (or all members if podium is hidden) go into the normal leaderboard
  const tableEntries = filteredEntries.slice(podiumCount);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1] dark:bg-[#0B0C14] text-[#252922] dark:text-white selection:bg-[#10B981]/30 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Header Title & Scripture Verse */}
        <div className="text-center space-y-2 pt-2">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#233D30] dark:text-white flex items-center justify-center gap-2">
            <span>{language === "ar" ? "لوحة حضور التسبحة" : "Tasbeha Leaderboard"}</span>
            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#F59E0B] inline-block animate-pulse" />
          </h1>

          <div className="text-xs sm:text-sm text-[#77786F] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed space-y-1">
            <p className="font-semibold text-[#B58A3A] dark:text-[#FDE68A]">
              {language === "ar"
                ? "«سَبِّحُوا الرَّبَّ لأَنَّ الرَّبَّ صَالِحٌ. رَنِّمُوا لاسْمِهِ لأَنَّ ذَاكَ حُلْوٌ.» (مز 135: 3)"
                : "“Praise the Lord, for the Lord is good; sing praises to His name, for it is pleasant.” (Psalm 135:3)"}
            </p>
            <p className="text-xs text-[#77786F] dark:text-[#94A3B8]">
              {language === "ar"
                ? "لوحه ترتيب حضور تسبحه نصف الليل"
                : "Midnight Praises Attendance Leaderboard"}
            </p>
          </div>
        </div>

        {/* Personalized User Status Bar (if logged in) */}
        {currentUser && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-[#16182C] dark:via-[#1A1D34] dark:to-[#16182C] border border-[#E4E0D5] dark:border-[#2B2F4C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <MemberAvatar
                memberId={currentUser.memberId}
                avatarUrl={currentUser.avatarUrl}
                fullName={currentUser.fullName}
                size="md"
                className="border-2 border-[#F59E0B]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-[#252922] dark:text-white" dir="ltr">
                    {cleanName(currentUser.fullName)}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF5EA] dark:bg-[#242944] text-[#B58A3A] dark:text-[#F59E0B] border border-[#B58A3A]/30 dark:border-[#F59E0B]/30">
                    {t(`roles.${currentUser.role}`)}
                  </span>
                </div>
                <p className="text-[11px] text-[#77786F] dark:text-[#94A3B8] mt-0.5 font-mono">
                  {currentUser.phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0C14] text-xs font-black transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "بطاقة حضوري (QR)" : "My Pass"}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Filter Capsule Tabs (Only two tabs: السلسلة الحالية & عدد الحضور) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Neon Capsule Tabs */}
          <div className="bg-[#EFEDE5] dark:bg-[#121422] p-1.5 rounded-2xl border border-[#E4E0D5] dark:border-[#232740] flex items-center gap-1 w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setBoardType("streak")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${boardType === "streak"
                ? "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0B0C14] shadow-md font-black"
                : "text-[#77786F] dark:text-[#94A3B8] hover:text-[#233D30] dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#1A1D30]"
                }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "السلسلة الحالية" : "Current Streak"}</span>
            </button>

            <button
              onClick={() => setBoardType("all-time")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${boardType === "all-time"
                ? "bg-gradient-to-r from-[#10B981] to-[#059669] text-[#0B0C14] shadow-md font-black"
                : "text-[#94A3B8] hover:text-white hover:bg-[#1A1D30]"
                }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "عدد الحضور" : "Total Attendance"}</span>
            </button>
          </div>

          {/* Quick Search with placeholder: ابحث عن اسم */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute top-3 rtl:right-3.5 ltr:left-3.5 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "ar" ? "ابحث عن اسم" : "Search name..."}
              className="w-full text-xs py-2 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 rounded-xl border border-[#232740] bg-[#121422] text-white placeholder-[#64748B] focus:border-[#F59E0B] focus:bg-[#161828] transition-colors"
            />
          </div>
        </div>

        {/* PODIUM SECTION (Dynamically conditionally rendered according to exact tie rules) */}
        {podiumCount > 0 && (
          <section className="pt-4 pb-2">
            <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto px-2">
              {/* 2nd Place (Left) - Only if 2nd place is uniquely qualified */}
              {show2nd && top2 && (
                <div className="flex flex-col items-center justify-end flex-1 max-w-[150px]">
                  <LaurelRankBadge rank={2} size="md" className="mb-2 sm:mb-3" />
                  <div className="relative group cursor-pointer">
                    <MemberAvatar
                      memberId={top2.memberId}
                      avatarUrl={top2.avatarUrl}
                      fullName={cleanName(top2.fullName)}
                      size="lg"
                      className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[#94A3B8] shadow-[0_0_20px_rgba(148,163,184,0.3)] transition-transform group-hover:scale-105"
                    />
                  </div>

                  <h4
                    dir="ltr"
                    className="font-bold text-xs sm:text-sm text-white mt-2.5 text-center truncate max-w-full"
                  >
                    {cleanName(top2.fullName)}
                  </h4>

                  {/* Emerald Diamond Badge with proper Arabic dual/plural unit */}
                  <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold text-[11px] sm:text-xs">
                    <span>◆</span>
                    <span>{formatPodiumScore(top2)}</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Center - Elevated Prominently) */}
              {show1st && top1 && (
                <div className="flex flex-col items-center justify-end flex-1 max-w-[170px] -translate-y-3 sm:-translate-y-5">
                  <LaurelRankBadge rank={1} size="md" hasCrown={true} className="mb-2 sm:mb-3" />
                  <div className="relative group cursor-pointer">
                    <MemberAvatar
                      memberId={top1.memberId}
                      avatarUrl={top1.avatarUrl}
                      fullName={cleanName(top1.fullName)}
                      size="xl"
                      className="w-20 h-20 sm:w-24 sm:h-24 border-3 border-[#F59E0B] shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-105"
                    />
                  </div>

                  <h3
                    dir="ltr"
                    className="font-black text-sm sm:text-base text-white mt-2.5 text-center truncate max-w-full"
                  >
                    {cleanName(top1.fullName)}
                  </h3>

                  {/* Emerald Diamond Badge with proper Arabic dual/plural unit */}
                  <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-black text-xs sm:text-sm shadow-sm">
                    <span>◆</span>
                    <span>{formatPodiumScore(top1)}</span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Right) - Only if 3rd place is uniquely qualified */}
              {show3rd && top3 && (
                <div className="flex flex-col items-center justify-end flex-1 max-w-[150px]">
                  <LaurelRankBadge rank={3} size="md" className="mb-2 sm:mb-3" />
                  <div className="relative group cursor-pointer">
                    <MemberAvatar
                      memberId={top3.memberId}
                      avatarUrl={top3.avatarUrl}
                      fullName={cleanName(top3.fullName)}
                      size="lg"
                      className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-[#D97706] shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-transform group-hover:scale-105"
                    />
                  </div>

                  <h4
                    dir="ltr"
                    className="font-bold text-xs sm:text-sm text-white mt-2.5 text-center truncate max-w-full"
                  >
                    {cleanName(top3.fullName)}
                  </h4>

                  {/* Emerald Diamond Badge with proper Arabic dual/plural unit */}
                  <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold text-[11px] sm:text-xs">
                    <span>◆</span>
                    <span>{formatPodiumScore(top3)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* FULL LEADERBOARD HONOR ROLL TABLE (All columns shown together with LTR names) */}
        <section className="bg-white dark:bg-[#121422] rounded-2xl sm:rounded-3xl border border-[#E4E0D5] dark:border-[#232742] shadow-md dark:shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Section Divider Header */}
          <div className="py-2.5 px-3 sm:py-3 sm:px-6 border-b border-[#E4E0D5] dark:border-[#1E2238] flex items-center justify-between text-xs font-bold text-[#B58A3A] dark:text-[#F59E0B]">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[#10B981]">◆</span>
              <span className="tracking-wider uppercase text-[11px] sm:text-xs text-[#233D30] dark:text-[#F59E0B]">
                {language === "ar" ? "قائمة حضور التسبحة والترتيب العام" : "Leaderboard Honor Roll"}
              </span>
              <span className="text-[#10B981]">◆</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-normal text-[#77786F] dark:text-[#94A3B8]">
              {language === "ar"
                ? `${tableEntries.length} مخدوم`
                : `${tableEntries.length} members`}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-[#77786F] dark:text-[#94A3B8]">
              {t("common.loading")}
            </div>
          ) : tableEntries.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#77786F] dark:text-[#94A3B8] space-y-2">
              <Trophy className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
              <p>{t("common.noData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right rtl:text-right ltr:text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E4E0D5] dark:border-[#1E2238] bg-[#EFEDE5]/80 dark:bg-[#161828]/60 text-[10px] sm:text-[11px] font-bold text-[#77786F] dark:text-[#94A3B8] uppercase">
                    <th className="py-2.5 px-1 sm:py-3.5 sm:px-4 text-center w-8 sm:w-16">
                      <span className="hidden sm:inline">{language === "ar" ? "المركز" : "Rank"}</span>
                      <span className="sm:hidden font-black">#</span>
                    </th>
                    <th className="py-2.5 px-1.5 sm:py-3.5 sm:px-4 text-start">
                      <span className="hidden sm:inline">{language === "ar" ? "اسم المخدوم" : "Member Name"}</span>
                      <span className="sm:hidden font-bold">{language === "ar" ? "المخدوم" : "Name"}</span>
                    </th>
                    <th className="py-2.5 px-0.5 sm:py-3.5 sm:px-4 text-center">
                      <span className="hidden sm:inline">{language === "ar" ? "مرات الحضور" : "Attendances"}</span>
                      <span className="sm:hidden font-bold">{language === "ar" ? "الحضور" : "Att."}</span>
                    </th>
                    <th className="py-2.5 px-0.5 sm:py-3.5 sm:px-4 text-center">
                      <span className="hidden sm:inline">{language === "ar" ? "السلسلة الحالية" : "Current Streak"}</span>
                      <span className="sm:hidden font-bold">{language === "ar" ? "الحالية" : "Streak"}</span>
                    </th>
                    <th className="py-2.5 px-0.5 sm:py-3.5 sm:px-4 text-center">
                      <span className="hidden sm:inline">{language === "ar" ? "أطول سلسلة متصلة" : "Longest Streak"}</span>
                      <span className="sm:hidden font-bold">{language === "ar" ? "الأطول" : "Best"}</span>
                    </th>
                    <th className="py-2.5 px-0.5 sm:py-3.5 sm:px-4 text-center">
                      <span className="hidden sm:inline">{language === "ar" ? "المكافآت" : "Rewards"}</span>
                      <span className="sm:hidden font-bold">{language === "ar" ? "الجوائز" : "Rew."}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D5] dark:divide-[#1C2036]">
                  {tableEntries.map((e) => {
                    const isCurrent = currentUser?.memberId === e.memberId;

                    return (
                      <tr
                        key={e.memberId}
                        className={`transition-colors ${isCurrent
                          ? "bg-[#FAF5EA] dark:bg-[#1C2038] border-s-4 border-[#F59E0B]"
                          : "hover:bg-[#F7F6F1] dark:hover:bg-[#16192C]"
                          }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-2 px-1 sm:py-3.5 sm:px-4 text-center">
                          <div className="flex items-center justify-center">
                            <LaurelRankBadge rank={e.rank} size="sm" />
                          </div>
                        </td>

                        {/* Member Name (Always LTR) */}
                        <td className="py-2 px-1 sm:py-3.5 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-3">
                            <MemberAvatar
                              memberId={e.memberId}
                              avatarUrl={e.avatarUrl}
                              fullName={e.fullName}
                              size="xs"
                              className="sm:hidden shrink-0 border border-[#2B304C]"
                            />
                            <MemberAvatar
                              memberId={e.memberId}
                              avatarUrl={e.avatarUrl}
                              fullName={e.fullName}
                              size="md"
                              className="hidden sm:block shrink-0 border border-[#2B304C]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span
                                  dir="ltr"
                                  className="font-bold text-[11px] sm:text-sm text-[#252922] dark:text-white leading-tight break-words text-left block"
                                >
                                  {cleanName(e.fullName)}
                                </span>
                                {isCurrent && (
                                  <span className="text-[8px] sm:text-[10px] font-black px-1 py-0.2 rounded bg-[#F59E0B] text-[#0B0C14] shrink-0">
                                    {language === "ar" ? "أنت" : "You"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Attendance Count (مرات الحضور) */}
                        <td className="py-2 px-0.5 sm:py-3.5 sm:px-4 text-center font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#141728] border border-[#232740] text-[#38BDF8] text-[10px] sm:text-xs">
                            <span className="text-[8px] sm:text-xs">◆</span>
                            <span className="hidden sm:inline">{formatSaturdays(e.attendanceCount, language)}</span>
                            <span className="sm:hidden">{e.attendanceCount} {language === "ar" ? "سبت" : "S"}</span>
                          </span>
                        </td>

                        {/* Current Streak (السلسلة الحالية) */}
                        <td className="py-2 px-0.5 sm:py-3.5 sm:px-4 text-center font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#141728] border border-[#232740] text-[#10B981] text-[10px] sm:text-xs">
                            <Flame className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#F59E0B]" />
                            <span className="hidden sm:inline">{formatWeeks(e.currentStreak, language)}</span>
                            <span className="sm:hidden">{e.currentStreak} {language === "ar" ? "أس" : "w"}</span>
                          </span>
                        </td>

                        {/* Longest Streak (أطول سلسلة متصلة) */}
                        <td className="py-2 px-0.5 sm:py-3.5 sm:px-4 text-center font-semibold text-white whitespace-nowrap">
                          <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#141728] border border-[#232740] text-[#A78BFA] text-[10px] sm:text-xs">
                            <span className="hidden sm:inline">{formatWeeks(e.longestStreak, language)}</span>
                            <span className="sm:hidden">{e.longestStreak} {language === "ar" ? "أس" : "w"}</span>
                          </span>
                        </td>

                        {/* Rewards (المكافآت) */}
                        <td className="py-2 px-0.5 sm:py-3.5 sm:px-4 text-center font-bold whitespace-nowrap">
                          {e.rewardsCount > 0 ? (
                            <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[10px] sm:text-xs">
                              <Award className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                              <span>{e.rewardsCount}</span>
                            </span>
                          ) : (
                            <span className="text-[#64748B] font-mono text-[10px] sm:text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
