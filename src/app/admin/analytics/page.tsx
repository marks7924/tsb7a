"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { BarChart3, TrendingUp, Calendar, Users, Award } from "lucide-react";

export default function AnalyticsPage() {
  const { language, t } = useLanguage();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      setAnalytics(json);
    } catch { }
    setLoading(false);
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#77786F]">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  const {
    totalSaturdaysHeld,
    totalOffSaturdays,
    totalCancelled,
    totalPresentAttendance,
    averageAttendance,
    highestAttendance,
    weeklyTrends,
    totalMembers,
    totalRewardsEarned,
    totalRewardsDelivered,
  } = analytics;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-[#233D30]" />
            <span>{t("nav.analytics")}</span>
          </h1>
          <p className="text-xs text-[#77786F] mt-1">
            {language === "ar"
              ? "مؤشرات أداء تسبحة السبت، ومعدلات الحضور الأسبوعي دون خلط بأيام الأسبوع العادية"
              : "Saturday praise analytics strictly aggregated from weekly sessions"}
          </p>
        </div>

        {/* High-level Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-mono">
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-sans font-semibold text-[#77786F] block">
              {language === "ar" ? "سبوت التسبحة المقامة" : "Saturdays Held"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#252922]">
              {totalSaturdaysHeld}
            </div>
            <span className="text-[10px] text-[#B58A3A] block">
              {totalOffSaturdays} {language === "ar" ? "سبوت بدون تسبحة (OFF)" : "OFF Saturdays"}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E4E0D5] p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-sans font-semibold text-[#77786F] block">
              {language === "ar" ? "متوسط الحضور بالسبت" : "Avg. Attendance"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#233D30]">
              {averageAttendance}
            </div>
            <span className="text-[10px] text-[#77786F] block">
              {language === "ar" ? "مخدوم / تسبحة" : "members / session"}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E4E0D5] p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-sans font-semibold text-[#77786F] block">
              {language === "ar" ? "أعلى حضور في سبت" : "Peak Attendance"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#B58A3A]">
              {highestAttendance}
            </div>
            <span className="text-[10px] text-[#77786F] block">
              {language === "ar" ? "الرقم القياسي للتسبحة" : "highest session record"}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E4E0D5] p-4 sm:p-5 shadow-xs space-y-1">
            <span className="text-[11px] font-sans font-semibold text-[#77786F] block">
              {language === "ar" ? "المكافآت المسلمة" : "Rewards Delivered"}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#252922]">
              {totalRewardsDelivered} / {totalRewardsEarned}
            </div>
            <span className="text-[10px] text-[#233D30] block">
              {totalRewardsEarned > 0
                ? `${Math.round((totalRewardsDelivered / totalRewardsEarned) * 100)}% ${language === "ar" ? "تم التسليم" : "delivered"
                }`
                : "-"}
            </span>
          </div>
        </div>

        {/* Weekly Attendance Trend Chart */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE5]">
            <h3 className="font-bold text-xs sm:text-sm text-[#252922]">
              {language === "ar" ? "منحنى الحضور الأسبوعي لسبوت التسبحة" : "Weekly Saturday Attendance Trend"}
            </h3>
            <span className="text-[11px] text-[#77786F] font-mono">
              {language === "ar" ? "سبوت التسبحة فقط" : "Saturdays Only"}
            </span>
          </div>

          <div className="h-56 flex items-end gap-3 sm:gap-4 pt-6 pb-2 overflow-x-auto">
            {weeklyTrends.map((w: any) => {
              const maxVal = Math.max(highestAttendance, 5);
              const heightPercent = w.isOff ? 10 : Math.max(12, Math.round((w.presentCount / maxVal) * 100));

              return (
                <div key={w.date} className="flex-1 min-w-[48px] flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-mono font-bold text-[#252922] opacity-80 group-hover:opacity-100">
                    {w.isOff ? t("statuses.OFF") : w.presentCount}
                  </span>
                  <div
                    className={`w-full rounded-t-sm transition-all ${w.isOff ? "bg-[#B58A3A]/30 border border-dashed border-[#B58A3A]" : "bg-[#233D30] hover:bg-[#192D24]"
                      }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] font-mono text-[#77786F] truncate w-full text-center">
                    {w.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
