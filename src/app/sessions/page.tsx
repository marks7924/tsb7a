"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function SessionsPage() {
  const { language, t } = useLanguage();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Session Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Mark OFF Modal
  const [showOffModal, setShowOffModal] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState<string>("");
  const [offReason, setOffReason] = useState("");

  useEffect(() => {
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

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          title: newTitle,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setShowCreateModal(false);
      setNewDate("");
      setNewTitle("");
      fetchSessions();
    } catch (err: any) {
      setCreateError(
        err.message === "SESSION_ALREADY_EXISTS_FOR_SATURDAY"
          ? language === "ar"
            ? "يوجد بالفعل تسبحة مسجلة لهذا السبت (ممنوع تكرار جلسات السبت)"
            : "A session already exists for this Saturday"
          : err.message
      );
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E0D5]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#233D30]" />
              <span>{t("nav.sessions")}</span>
            </h1>
            <p className="text-xs text-[#77786F] mt-1">
              {language === "ar"
                ? "إدارة سبوت التسبحة وإجازات الأعياد (OFF) دون كسر سلاسل المخدومين"
                : "Manage Saturday praise sessions, feasts, and OFF days"}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "ar" ? "إضافة سبت تسبحة جديد" : "New Saturday Session"}</span>
          </button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => {
            const dt = new Date(s.date);
            const isOff = s.status === "OFF";
            const isActive = s.status === "ACTIVE";

            return (
              <div
                key={s.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${isOff
                  ? "bg-[#FAF5EA] border-[#B58A3A]/40"
                  : isActive
                    ? "bg-white border-[#233D30] ring-1 ring-[#233D30]/20 shadow-xs"
                    : "bg-white border-[#E4E0D5] shadow-xs"
                  }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold font-mono text-[#77786F]">
                    {dt.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isOff
                      ? "bg-[#B58A3A]/20 text-[#B58A3A]"
                      : isActive
                        ? "bg-[#EEF5F1] text-[#233D30]"
                        : "bg-[#EFEDE5] text-[#77786F]"
                      }`}
                  >
                    {t(`statuses.${s.status}`)}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#252922] mt-2">
                  {s.title || (language === "ar" ? "تسبحة نصف الليل" : "Saturday Praise")}
                </h3>

                {isOff && (
                  <p className="text-xs text-[#B58A3A] mt-2 bg-white/70 p-2.5 rounded-lg border border-[#B58A3A]/20 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>{s.offReason || t("attendance.markOffNotice")}</span>
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-[#EFEDE5] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-[#233D30] font-bold">
                      ✓ {s.presentCount} {language === "ar" ? "حاضر" : "Pres."}
                    </span>
                    <span className="text-[#8C2929] font-bold">
                      ✗ {s.absentCount} {language === "ar" ? "غائب" : "Abs."}
                    </span>
                  </div>

                  {isOff ? (
                    <button
                      onClick={() => handleReverseOff(s.id)}
                      className="text-xs font-sans text-[#233D30] hover:underline font-bold flex items-center gap-1 cursor-pointer"
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
                      className="text-xs font-sans text-[#B58A3A] hover:underline font-semibold cursor-pointer"
                    >
                      {t("attendance.markOffTitle")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Session Dialog */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-[#E4E0D5] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#252922]">
                {language === "ar" ? "جدولة سبت تسبحة جديد" : "Schedule New Saturday"}
              </h3>

              {createError && (
                <div className="p-3 rounded-lg bg-[#FAF0F0] text-[#8C2929] text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateSession} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#252922] mb-1">
                    {language === "ar" ? "تاريخ السبت" : "Saturday Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252922] mb-1">
                    {language === "ar" ? "عنوان / مناسبة التسبحة (اختياري)" : "Title (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: تسبحة كيهك الأولى أو تسبحة سبت الفرح"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#233D30] text-white text-xs font-bold shadow-xs hover:bg-[#192D24]"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mark OFF Dialog */}
        {showOffModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-[#E4E0D5] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#252922]">
                {t("attendance.markOffTitle")}
              </h3>

              <div className="p-3 rounded-lg bg-[#FAF5EA] border border-[#B58A3A]/30 text-xs text-[#B58A3A]">
                {t("attendance.markOffNotice")}
              </div>

              <form onSubmit={handleMarkOff} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#252922] mb-1">
                    {t("attendance.markOffReason")}
                  </label>
                  <input
                    type="text"
                    value={offReason}
                    onChange={(e) => setOffReason(e.target.value)}
                    placeholder="مثال: أسبوع الآلام أو عيد القيامة أو عيد الغطاس"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOffModal(false)}
                    className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#B58A3A] hover:bg-[#96702A] text-white text-xs font-bold shadow-xs"
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
