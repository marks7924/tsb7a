"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import {
  Calendar,
  Plus,
  PauseCircle,
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  RefreshCw,
  Archive,
  Search,
  Sparkles,
  Check,
} from "lucide-react";

export default function SessionsPage() {
  const { language, t } = useLanguage();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: "CURRENT" (2-3 Saturdays) or "ARCHIVE" (past praises)
  const [viewTab, setViewTab] = useState<"CURRENT" | "ARCHIVE">("CURRENT");
  const [archiveSearch, setArchiveSearch] = useState("");

  // New Praise / Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mark OFF Modal
  const [showOffModal, setShowOffModal] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [offReason, setOffReason] = useState("");

  useEffect(() => {
    setMounted(true);
    setNewDate(new Date().toISOString().split("T")[0]);
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      setSessions(json.sessions || []);
    } catch { }
    setLoading(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          title: newTitle.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setShowCreateModal(false);
      setNewDate(new Date().toISOString().split("T")[0]);
      setNewTitle("");
      fetchSessions();
    } catch (err: any) {
      setCreateError(
        err.message === "SESSION_ALREADY_EXISTS_FOR_DATE" || err.message === "SESSION_ALREADY_EXISTS_FOR_SATURDAY"
          ? language === "ar"
            ? "يوجد بالفعل تسبحة مسجلة لهذا التاريخ (ممنوع تكرار الجلسات في نفس اليوم)"
            : "A session already exists for this date"
          : err.message
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMarkOff = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-off",
          sessionId: targetSessionId,
          reason: offReason,
        }),
      });

      setShowOffModal(false);
      setOffReason("");
      fetchSessions();
    } catch { }
  };

  const handleReverseOff = async (sessionId: string) => {
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse-off",
          sessionId,
        }),
      });
      fetchSessions();
    } catch { }
  };

  // Partition sessions into:
  // 1- Current active Saturdays: Last Saturday, Today (only if Saturday), and Next Saturday
  // 2- Archive: all other past praises
  const { currentSessions, archiveSessions } = useMemo(() => {
    if (!mounted) {
      return {
        currentSessions: [],
        archiveSessions: sessions,
      };
    }

    const now = new Date();
    const cairoStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
    const cairoNow = new Date(cairoStr);
    cairoNow.setHours(0, 0, 0, 0);

    const isTodaySat = cairoNow.getDay() === 6;
    const cairoMidnightTime = cairoNow.getTime();

    // Sort chronologically ascending
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let todayItem: any = null;
    if (isTodaySat) {
      todayItem =
        sorted.find((s) => {
          const sDate = new Date(s.date);
          sDate.setUTCHours(0, 0, 0, 0);
          return Math.abs(sDate.getTime() - cairoMidnightTime) < 86400000;
        }) || null;
    }

    const pastItems = sorted.filter((s) => {
      const sTime = new Date(s.date).getTime();
      return todayItem ? s.id !== todayItem.id && sTime < cairoMidnightTime : sTime < cairoMidnightTime;
    });

    const futureItems = sorted.filter((s) => {
      const sTime = new Date(s.date).getTime();
      return todayItem ? s.id !== todayItem.id && sTime > cairoMidnightTime : sTime >= cairoMidnightTime;
    });

    const lastItem = pastItems.length > 0 ? pastItems[pastItems.length - 1] : null;
    const nextItem = futureItems.length > 0 ? futureItems[0] : null;

    const current: Array<{ item: any; badgeAr: string; badgeEn: string; type: "last" | "today" | "next" }> = [];
    if (lastItem) {
      current.push({ item: lastItem, badgeAr: "السبت السابق", badgeEn: "Previous", type: "last" });
    }
    if (todayItem) {
      current.push({ item: todayItem, badgeAr: "تسبحة اليوم", badgeEn: "Today", type: "today" });
    }
    if (nextItem) {
      current.push({ item: nextItem, badgeAr: "التسبحة القادمة", badgeEn: "Upcoming", type: "next" });
    }

    const currentIds = new Set(current.map((c) => c.item.id));
    const archive = sorted.filter((s) => !currentIds.has(s.id)).reverse();

    return {
      currentSessions: current,
      archiveSessions: archive,
    };
  }, [sessions, mounted]);

  const filteredArchive = useMemo(() => {
    if (!archiveSearch.trim()) return archiveSessions;
    const q = archiveSearch.toLowerCase();
    return archiveSessions.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(q);
      const dateMatch = new Date(s.date).toISOString().includes(q);
      return titleMatch || dateMatch;
    });
  }, [archiveSessions, archiveSearch]);

  const renderSessionCard = (s: any, badge?: { badgeAr: string; badgeEn: string; type: string }) => {
    const dt = new Date(s.date);
    const isOff = s.status === "OFF";
    const isActive = s.status === "ACTIVE";

    return (
      <div
        key={s.id}
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isOff
            ? "bg-[#FAF5EA] dark:bg-[#F59E0B]/10 border-[#B58A3A]/40 dark:border-[#F59E0B]/30"
            : isActive
            ? "bg-white dark:bg-[#161828] border-[#233D30] dark:border-[#10B981] ring-1 ring-[#233D30]/20 dark:ring-[#10B981]/30 shadow-md"
            : "bg-white dark:bg-[#121422] border-[#E4E0D5] dark:border-[#262A42] shadow-xs"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-[#77786F] dark:text-[#94A3B8]">
              {dt.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {badge && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  badge.type === "today"
                    ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                    : badge.type === "next"
                    ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30"
                    : "bg-[#77786F]/20 text-[#77786F] dark:text-[#94A3B8]"
                }`}
              >
                {language === "ar" ? badge.badgeAr : badge.badgeEn}
              </span>
            )}
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
              isOff
                ? "bg-[#B58A3A]/20 text-[#B58A3A] dark:text-[#F59E0B]"
                : isActive
                ? "bg-[#EEF5F1] text-[#233D30] dark:bg-[#10B981]/20 dark:text-[#10B981]"
                : "bg-[#EFEDE5] dark:bg-[#1E2238] text-[#77786F] dark:text-[#94A3B8]"
            }`}
          >
            {t(`statuses.${s.status}`)}
          </span>
        </div>

        <h3 className="font-bold text-sm text-[#252922] dark:text-white mt-2">
          {s.title || (language === "ar" ? "تسبحة نصف الليل" : "Saturday Praise")}
        </h3>

        {isOff && (
          <p className="text-xs text-[#B58A3A] dark:text-[#F59E0B] mt-2 bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-[#B58A3A]/20 dark:border-[#F59E0B]/20 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{s.offReason || t("attendance.markOffNotice")}</span>
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-[#EFEDE5] dark:border-[#262A42] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-[#233D30] dark:text-[#10B981] font-bold">
              ✓ {s.presentCount || 0} {language === "ar" ? "حاضر" : "Pres."}
            </span>
            <span className="text-[#8C2929] dark:text-[#EF4444] font-bold">
              ✗ {s.absentCount || 0} {language === "ar" ? "غائب" : "Abs."}
            </span>
          </div>

          {isOff ? (
            <button
              onClick={() => handleReverseOff(s.id)}
              className="text-xs font-sans text-[#233D30] dark:text-[#10B981] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === "ar" ? "تفعيل تسبحة هذا السبت" : "Activate / Reverse OFF"}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setTargetSessionId(s.id);
                setShowOffModal(true);
              }}
              className="text-xs font-sans text-[#B58A3A] dark:text-[#F59E0B] hover:underline font-semibold cursor-pointer"
            >
              {t("attendance.markOffTitle")}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1] dark:bg-[#0B0C14] text-[#252922] dark:text-white">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E0D5] dark:border-[#232740]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#252922] dark:text-white flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#233D30] dark:text-[#F59E0B]" />
              <span>{t("nav.sessions")}</span>
            </h1>
            <p className="text-xs text-[#77786F] dark:text-[#94A3B8] mt-1">
              {language === "ar"
                ? "إدارة سبوت التسبحة والأعياد (OFF) — تظهر الجلسات الحالية (السابقة، اليوم، والقادمة) مع وصول سريع للأرشيف"
                : "Manage Saturday praise sessions, feasts, and OFF days"}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة تسبحة جديدة (يوم خاص)" : "New Praise Session"}</span>
          </button>
        </div>

        {/* View Switcher Tabs: Current (2-3) vs Archive */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="bg-[#EFEDE5] dark:bg-[#121422] p-1.5 rounded-2xl border border-[#E4E0D5] dark:border-[#232740] flex items-center gap-1 w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => setViewTab("CURRENT")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                viewTab === "CURRENT"
                  ? "bg-[#233D30] text-white shadow-xs dark:bg-[#1E2238] dark:border dark:border-[#F59E0B]/40"
                  : "text-[#77786F] dark:text-[#94A3B8] hover:text-[#233D30] dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {language === "ar"
                  ? `التسبحات الحالية (${currentSessions.length})`
                  : `Current Praises (${currentSessions.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab("ARCHIVE")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                viewTab === "ARCHIVE"
                  ? "bg-[#233D30] text-white shadow-xs dark:bg-[#1E2238] dark:border dark:border-[#F59E0B]/40"
                  : "text-[#77786F] dark:text-[#94A3B8] hover:text-[#233D30] dark:hover:text-white"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>
                {language === "ar"
                  ? `أرشيف التسبحات السابقة (${archiveSessions.length})`
                  : `Past Praises Archive (${archiveSessions.length})`}
              </span>
            </button>
          </div>

          {viewTab === "ARCHIVE" && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-[#77786F] dark:text-[#94A3B8]" />
              <input
                type="text"
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder={language === "ar" ? "بحث في التسبحات السابقة..." : "Search past praises..."}
                className="w-full text-xs py-1.5 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-white dark:bg-[#121422] text-[#252922] dark:text-white focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Current Sessions View: only shows 2 or 3 Saturdays */}
        {viewTab === "CURRENT" ? (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-[#77786F] dark:text-[#94A3B8]">
              <span>
                {language === "ar"
                  ? "عرض التسبحات النشطة والسابقة والقادمة فقط لتركيز الإدارة:"
                  : "Showing active, previous, and upcoming praise sessions:"}
              </span>
              <span className="font-bold font-mono">
                {currentSessions.length} {language === "ar" ? "سبوت معروضة" : "Saturdays shown"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSessions.map(({ item, badgeAr, badgeEn, type }) =>
                renderSessionCard(item, { badgeAr, badgeEn, type })
              )}
            </div>
          </div>
        ) : (
          /* Archive View: all older praises with search */
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-[#77786F] dark:text-[#94A3B8]">
              <span>
                {language === "ar"
                  ? "كافة التسبحات السابقة المؤرشفة في تاريخ الكنيسة:"
                  : "All past archived praises in church history:"}
              </span>
              <span className="font-bold font-mono">
                {filteredArchive.length} {language === "ar" ? "تسبحة" : "praises"}
              </span>
            </div>

            {filteredArchive.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-[#E4E0D5] dark:border-[#262A42] text-[#77786F] dark:text-[#94A3B8]">
                <Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">
                  {language === "ar" ? "لا توجد تسبحات سابقة في الأرشيف" : "No praises in archive"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArchive.map((s) => renderSessionCard(s))}
              </div>
            )}
          </div>
        )}

        {/* Create Session Dialog */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-[#121422] rounded-2xl shadow-xl border border-[#E4E0D5] dark:border-[#262A42] p-6 space-y-4 text-[#252922] dark:text-white animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B58A3A] dark:text-[#F59E0B]" />
                <span>{language === "ar" ? "إضافة تسبحة جديدة (يوم خاص)" : "Schedule New Praise Session"}</span>
              </h3>

              <p className="text-xs text-[#77786F] dark:text-[#94A3B8] leading-relaxed">
                {language === "ar"
                  ? "يمكنك جدولة تسبحة في أي يوم (السبت، الأربعاء، مناسبة كنسية، كيهك، عيد) وتُحتسب لجميع المخدومين في سلاسل الحضور."
                  : "Schedule a praise session on any day (Saturday, Wednesday, feast, Kiahk) and it will count in attendances."}
              </p>

              {createError && (
                <div className="p-3 rounded-lg bg-[#FAF0F0] dark:bg-[#EF4444]/20 text-[#8C2929] dark:text-[#EF4444] text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateSession} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {language === "ar" ? "تاريخ التسبحة" : "Praise Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {language === "ar" ? "عنوان / مناسبة التسبحة (اختياري)" : "Title (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={language === "ar" ? "مثال: تسبحة كيهك الأولى أو تسبحة سبت الفرح" : "e.g., Midnight Praise - Kiahk"}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white font-medium focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] text-xs font-semibold text-[#77786F] dark:text-[#94A3B8] hover:bg-[#F7F6F1] dark:hover:bg-[#161828] cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading || !newDate}
                    className="px-4 py-2 rounded-xl bg-[#233D30] text-white text-xs font-bold shadow-xs hover:bg-[#192D24] cursor-pointer disabled:opacity-50"
                  >
                    {createLoading ? t("common.loading") : t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark OFF Dialog */}
        {showOffModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-[#121422] rounded-2xl shadow-xl border border-[#E4E0D5] dark:border-[#262A42] p-6 space-y-4 text-[#252922] dark:text-white animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-bold">
                {t("attendance.markOffTitle")}
              </h3>

              <div className="p-3 rounded-lg bg-[#FAF5EA] dark:bg-[#F59E0B]/20 border border-[#B58A3A]/30 text-xs text-[#B58A3A] dark:text-[#F59E0B]">
                {t("attendance.markOffNotice")}
              </div>

              <form onSubmit={handleMarkOff} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t("attendance.markOffReason")}
                  </label>
                  <input
                    type="text"
                    value={offReason}
                    onChange={(e) => setOffReason(e.target.value)}
                    placeholder={language === "ar" ? "مثال: أسبوع الآلام أو عيد القيامة أو عيد الغطاس" : "e.g., Holy Week or Feast of Epiphany"}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOffModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] text-xs font-semibold text-[#77786F] dark:text-[#94A3B8] hover:bg-[#F7F6F1] dark:hover:bg-[#161828] cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#B58A3A] hover:bg-[#96702A] text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
