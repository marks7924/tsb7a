"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/context";
import {
  Calendar,
  ChevronDown,
  Check,
  Plus,
  Archive,
  Search,
  Sparkles,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

export interface SessionItem {
  id: string;
  date: string | Date;
  title?: string | null;
  status: string;
  offReason?: string | null;
  presentCount?: number;
  absentCount?: number;
}

interface SessionSelectProps {
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onPraiseAdded?: (newSession: SessionItem) => void;
  className?: string;
  variant?: "default" | "compact";
}

export function SessionSelect({
  sessions,
  selectedSessionId,
  onSelectSession,
  onPraiseAdded,
  className = "",
  variant = "default",
}: SessionSelectProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");

  // Modal for adding a new praise (on any day)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNewDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cairo now & partitioning: Last, Today (if Sat), Next, and Archive
  const { activePraises, archivePraises, selectedSession } = useMemo(() => {
    if (!mounted) {
      const selected = sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;
      return {
        activePraises: [],
        archivePraises: sessions,
        selectedSession: selected,
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

    // Identify Today session (if today is Sat and a session date matches today)
    let todayItem: SessionItem | null = null;
    if (isTodaySat) {
      todayItem =
        sorted.find((s) => {
          const sDate = new Date(s.date);
          sDate.setUTCHours(0, 0, 0, 0);
          return Math.abs(sDate.getTime() - cairoMidnightTime) < 86400000;
        }) || null;
    }

    // Past sessions before today
    const pastItems = sorted.filter((s) => {
      const sTime = new Date(s.date).getTime();
      return todayItem ? s.id !== todayItem.id && sTime < cairoMidnightTime : sTime < cairoMidnightTime;
    });

    // Future sessions after today
    const futureItems = sorted.filter((s) => {
      const sTime = new Date(s.date).getTime();
      return todayItem ? s.id !== todayItem.id && sTime > cairoMidnightTime : sTime >= cairoMidnightTime;
    });

    // The Last One (most recent completed/past)
    const lastItem = pastItems.length > 0 ? pastItems[pastItems.length - 1] : null;

    // The Next One (upcoming)
    const nextItem = futureItems.length > 0 ? futureItems[0] : null;

    // Active list: 2 or 3 items
    const active: Array<{ item: SessionItem; labelAr: string; labelEn: string; badge: string }> = [];

    if (lastItem) {
      active.push({
        item: lastItem,
        labelAr: "السبت السابق",
        labelEn: "Previous",
        badge: "last",
      });
    }

    if (todayItem) {
      active.push({
        item: todayItem,
        labelAr: "تسبحة اليوم",
        labelEn: "Today",
        badge: "today",
      });
    }

    if (nextItem) {
      active.push({
        item: nextItem,
        labelAr: "التسبحة القادمة",
        labelEn: "Upcoming",
        badge: "next",
      });
    }

    // All active item IDs
    const activeIds = new Set(active.map((a) => a.item.id));

    // Archive: all other sessions (sorted newest first)
    const archive = sorted.filter((s) => !activeIds.has(s.id)).reverse();

    const selected = sessions.find((s) => s.id === selectedSessionId) || active[0]?.item || sessions[0];

    return {
      activePraises: active,
      archivePraises: archive,
      selectedSession: selected,
    };
  }, [sessions, selectedSessionId]);

  const formatDateLabel = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal);
      const isArabic = language === "ar";
      const weekday = d.toLocaleDateString(isArabic ? "ar-EG" : "en-US", { weekday: "short" });
      const day = d.getDate();
      const month = d.toLocaleDateString(isArabic ? "ar-EG" : "en-US", { month: "short" });
      const year = d.getFullYear();
      return `${weekday}، ${day} ${month} ${year}`;
    } catch {
      return String(dateVal);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          text: language === "ar" ? "نشط الآن" : "Active",
          cls: "bg-[#EEF5F1] text-[#233D30] dark:bg-[#10B981]/20 dark:text-[#10B981] border-[#10B981]/30",
        };
      case "SCHEDULED":
        return {
          text: language === "ar" ? "مجدولة" : "Scheduled",
          cls: "bg-[#EFEDE5] text-[#77786F] dark:bg-[#1E2238] dark:text-[#94A3B8] border-transparent",
        };
      case "COMPLETED":
        return {
          text: language === "ar" ? "مكتملة" : "Completed",
          cls: "bg-[#F7F6F1] text-[#77786F] dark:bg-[#161828] dark:text-[#94A3B8] border-transparent",
        };
      case "OFF":
        return {
          text: language === "ar" ? "لا توجد تسبحة" : "OFF",
          cls: "bg-[#FAF5EA] text-[#B58A3A] dark:bg-[#F59E0B]/20 dark:text-[#F59E0B] border-[#F59E0B]/30",
        };
      default:
        return {
          text: status,
          cls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent",
        };
    }
  };

  const handleCreatePraise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    setAddLoading(true);
    setAddError(null);

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

      setShowAddModal(false);
      setNewTitle("");
      if (json.session) {
        onSelectSession(json.session.id);
        if (onPraiseAdded) {
          onPraiseAdded(json.session);
        }
      }
      setIsOpen(false);
    } catch (err: any) {
      setAddError(
        err.message === "SESSION_ALREADY_EXISTS_FOR_DATE" || err.message === "SESSION_ALREADY_EXISTS_FOR_SATURDAY"
          ? language === "ar"
            ? "يوجد بالفعل تسبحة مسجلة لهذا التاريخ"
            : "A praise session already exists for this date"
          : err.message || "Failed to create praise session"
      );
    } finally {
      setAddLoading(false);
    }
  };

  const filteredArchive = useMemo(() => {
    if (!archiveSearch.trim()) return archivePraises;
    const q = archiveSearch.toLowerCase();
    return archivePraises.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(q);
      const dateMatch = new Date(s.date).toISOString().includes(q);
      return titleMatch || dateMatch;
    });
  }, [archivePraises, archiveSearch]);

  const currentBadge = selectedSession ? getStatusBadge(selectedSession.status) : null;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto flex items-center justify-between gap-2.5 rounded-xl border transition-all cursor-pointer shadow-xs text-start ${
          variant === "compact"
            ? "py-1.5 px-3 text-xs"
            : "py-2 px-3.5 text-xs sm:text-sm font-bold"
        } bg-[#F7F6F1] dark:bg-[#161828] border-[#E4E0D5] dark:border-[#2B304C] text-[#233D30] dark:text-white hover:border-[#B58A3A] dark:hover:border-[#F59E0B] focus:outline-hidden focus:ring-2 focus:ring-[#F59E0B]/30`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-[#B58A3A] dark:text-[#F59E0B] shrink-0" />
          <div className="truncate flex items-center gap-2">
            <span className="font-bold truncate">
              {selectedSession ? formatDateLabel(selectedSession.date) : (language === "ar" ? "اختر التسبحة..." : "Select Praise...")}
            </span>
            {selectedSession?.title && (
              <span className="hidden md:inline text-[11px] font-normal text-[#77786F] dark:text-[#94A3B8] truncate">
                ({selectedSession.title})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 rtl:mr-1 ltr:ml-1">
          {currentBadge && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentBadge.cls}`}
            >
              {currentBadge.text}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#77786F] dark:text-[#94A3B8] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Modern Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 w-full sm:w-96 rounded-2xl border shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 ${
            language === "ar" ? "right-0" : "left-0"
          } bg-white dark:bg-[#121422] border-[#E4E0D5] dark:border-[#262A42] text-[#252922] dark:text-white`}
        >
          {/* Header Action: Add Praise Button */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EFEDE5] dark:border-[#262A42]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#77786F] dark:text-[#94A3B8]">
              {language === "ar" ? "تسبحات السبت الحالية" : "Saturday Praise Sessions"}
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#233D30] hover:bg-[#192D24] text-white transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "أضف تسبحة" : "Add a Praise"}</span>
            </button>
          </div>

          {/* Active 2 or 3 Saturdays */}
          <div className="space-y-1">
            {activePraises.map(({ item, labelAr, labelEn, badge }) => {
              const isSelected = selectedSession?.id === item.id;
              const statusInfo = getStatusBadge(item.status);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSession(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#233D30] text-white shadow-xs dark:bg-[#1E2238] dark:border dark:border-[#F59E0B]/40"
                      : "hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] text-[#252922] dark:text-white"
                  }`}
                >
                  <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs truncate">
                        {formatDateLabel(item.date)}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : badge === "today"
                            ? "bg-[#10B981]/15 text-[#10B981]"
                            : badge === "next"
                            ? "bg-[#38BDF8]/15 text-[#38BDF8]"
                            : "bg-[#77786F]/15 text-[#77786F] dark:text-[#94A3B8]"
                        }`}
                      >
                        {language === "ar" ? labelAr : labelEn}
                      </span>
                    </div>
                    {item.title && (
                      <p
                        className={`text-[11px] mt-0.5 truncate ${
                          isSelected
                            ? "text-white/80"
                            : "text-[#77786F] dark:text-[#94A3B8]"
                        }`}
                      >
                        {item.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isSelected ? "bg-white/20 text-white border-transparent" : statusInfo.cls
                      }`}
                    >
                      {statusInfo.text}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Past Praises Archive Trigger */}
          <div className="pt-2 mt-2 border-t border-[#EFEDE5] dark:border-[#262A42]">
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-[#77786F] dark:text-[#94A3B8] hover:text-[#233D30] dark:hover:text-white hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-[#B58A3A] dark:text-[#F59E0B]" />
                <span>
                  {language === "ar"
                    ? `أرشيف التسبحات السابقة (${archivePraises.length})`
                    : `Past Praises Archive (${archivePraises.length})`}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showArchive ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expanded Archive Section */}
            {showArchive && (
              <div className="mt-2 space-y-2 pt-1">
                {/* Search in Archive */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-[#77786F] dark:text-[#94A3B8]" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder={language === "ar" ? "بحث في أرشيف التسبحات..." : "Search past praises..."}
                    className="w-full text-xs py-1.5 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white focus:outline-hidden"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredArchive.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#77786F] dark:text-[#94A3B8]">
                      {language === "ar" ? "لا توجد تسبحات سابقة مطابقة" : "No past praises found"}
                    </div>
                  ) : (
                    filteredArchive.map((item) => {
                      const isSelected = selectedSession?.id === item.id;
                      const statusInfo = getStatusBadge(item.status);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectSession(item.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-start transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#233D30] text-white dark:bg-[#1E2238]"
                              : "hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] text-[#252922] dark:text-white"
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-xs font-semibold block truncate">
                              {formatDateLabel(item.date)}
                            </span>
                            {item.title && (
                              <span
                                className={`text-[10px] truncate block ${
                                  isSelected ? "text-white/80" : "text-[#77786F] dark:text-[#94A3B8]"
                                }`}
                              >
                                {item.title}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              isSelected ? "bg-white/20 text-white border-transparent" : statusInfo.cls
                            }`}
                          >
                            {statusInfo.text}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Praise Modal (Any day) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#121422] rounded-2xl shadow-2xl border border-[#E4E0D5] dark:border-[#262A42] p-5 sm:p-6 space-y-4 text-[#252922] dark:text-white animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EFEDE5] dark:border-[#262A42] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EA] dark:bg-[#F59E0B]/20 text-[#B58A3A] dark:text-[#F59E0B] flex items-center justify-center border border-[#B58A3A]/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">
                  {language === "ar" ? "إضافة تسبحة جديدة (يوم خاص)" : "Add New Praise Session"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#77786F] dark:text-[#94A3B8] hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#77786F] dark:text-[#94A3B8] leading-relaxed">
              {language === "ar"
                ? "يمكنك جدولة تسبحة في أي يوم (الأربعاء، مناسبة كنسية، أعياد، كيهك) وستُضاف للكشوف وتُحتسب في سلاسل الحضور."
                : "Schedule a praise session on any day (Wednesday, feast, Kiahk) and it will be recorded in attendance and streaks."}
            </p>

            {addError && (
              <div className="p-3 rounded-lg bg-[#FAF0F0] dark:bg-[#EF4444]/20 text-[#8C2929] dark:text-[#EF4444] text-xs font-semibold flex items-center gap-2 border border-[#8C2929]/30">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePraise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  {language === "ar" ? "تاريخ التسبحة:" : "Praise Date:"}
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] font-bold text-[#252922] dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  {language === "ar" ? "اسم أو مناسبة التسبحة (اختياري):" : "Praise Title / Occasion (Optional):"}
                </label>
                <input
                  type="text"
                  placeholder={
                    language === "ar"
                      ? "مثال: تسبحة نصف الليل - كيهك / تسبحة العيد"
                      : "e.g., Midnight Praise - Kiahk"
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] font-medium text-[#252922] dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] text-xs font-semibold text-[#77786F] dark:text-[#94A3B8] hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] transition-colors cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !newDate}
                  className="px-4 py-2 rounded-xl bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {addLoading
                    ? language === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : language === "ar"
                    ? "إضافة التسبحة الآن"
                    : "Add Praise Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
