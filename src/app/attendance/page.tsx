"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import {
  Users,
  Search,
  Check,
  X,
  Plus,
  QrCode,
  Calendar,
  AlertTriangle,
  Flame,
  Gift,
  HelpCircle,
  Clock,
  Sparkles,
  UserPlus,
  ScanLine,
  CheckCircle2,
  RefreshCw,
  Camera,
  Keyboard,
  ChevronDown,
} from "lucide-react";
import QRCode from "qrcode";
import { CameraQRScanner } from "@/components/CameraQRScanner";
import { MemberAvatar } from "@/components/MemberAvatar";
import { SessionSelect } from "@/components/SessionSelect";

export default function AttendancePage() {
  const { language, t } = useLanguage();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "UNMARKED">("ALL");

  // Quick Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [markPresentOnAdd, setMarkPresentOnAdd] = useState(true);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Church Session QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Scan Member Pass Modal
  const [showScanPassModal, setShowScanPassModal] = useState(false);
  const [scanModalMethod, setScanModalMethod] = useState<"CAMERA" | "MANUAL">("CAMERA");
  const [passInput, setPassInput] = useState("");
  const [scanPassLoading, setScanPassLoading] = useState(false);
  const [scanPassResult, setScanPassResult] = useState<{
    success: boolean;
    message: string;
    member?: any;
  } | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchAttendanceSheet(selectedSessionId);
    }
  }, [selectedSessionId]);

  const showToast = (text: string, error = false) => {
    setToastMessage({ text, error });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      const list = json.sessions || [];
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        // Default to active or first session
        const active = list.find((s: any) => s.status === "ACTIVE") || list[0];
        setSelectedSessionId(active.id);
      }
    } catch { }
  };

  const fetchAttendanceSheet = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?sessionId=${sessionId}`);
      const json = await res.json();
      setSessionData(json.session);
      setMembers(json.members || []);
    } catch { }
    setLoading(false);
  };

  const handleMarkAttendance = async (memberId: string, status: "PRESENT" | "ABSENT") => {
    if (sessionData?.status === "OFF") {
      showToast(
        language === "ar"
          ? "هذا السبت لا توجد به تسبحة. يرجى تفعيل التسبحة أولاً لتسجيل الحضور."
          : "This Saturday is marked OFF. Please activate the session first.",
        true
      );
      return;
    }

    // Instant optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.memberId === memberId
          ? {
            ...m,
            attendanceStatus: status,
            currentStreak: status === "PRESENT" ? m.currentStreak + 1 : m.currentStreak,
          }
          : m
      )
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          memberId,
          sessionId: selectedSessionId,
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.message || json.error || "Error marking attendance", true);
        fetchAttendanceSheet(selectedSessionId);
      }
    } catch {
      fetchAttendanceSheet(selectedSessionId);
    }
  };

  const handleReverseOff = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse-off",
          sessionId: selectedSessionId,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(
          language === "ar"
            ? "تم تفعيل تسبحة هذا السبت بنجاح"
            : "Session activated successfully"
        );
        fetchSessions();
        fetchAttendanceSheet(selectedSessionId);
      } else {
        showToast(json.message || json.error, true);
      }
    } catch { }
  };

  const executeScanPass = async (payloadToScan: string) => {
    if (!payloadToScan || !payloadToScan.trim() || !selectedSessionId) return;

    if (sessionData?.status === "OFF") {
      setScanPassResult({
        success: false,
        message:
          language === "ar"
            ? "هذا السبت لا توجد به تسبحة. قم بتفعيل التسبحة أولاً لتسجيل الحضور."
            : "This session is marked OFF.",
      });
      return;
    }

    setScanPassLoading(true);
    setScanPassResult(null);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan-member-pass",
          qrPayload: payloadToScan.trim(),
          sessionId: selectedSessionId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error);
      }

      setScanPassResult({
        success: true,
        message:
          language === "ar"
            ? `✓ تم تسجيل حضور ${json.member?.fullName} بنجاح!`
            : `✓ Marked ${json.member?.fullName} as PRESENT!`,
        member: json.member,
      });

      setPassInput("");
      fetchAttendanceSheet(selectedSessionId);
    } catch (err: any) {
      setScanPassResult({
        success: false,
        message:
          err.message === "MEMBER_NOT_FOUND"
            ? language === "ar"
              ? "لم يتم العثور على مخدوم بهذا الرمز أو رقم الهاتف"
              : "Member not found"
            : err.message,
      });
    } finally {
      setScanPassLoading(false);
    }
  };

  const handleScanMemberPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeScanPass(passInput);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-add",
          fullName: newFullName.trim(),
          phone: newPhone.trim(),
          sessionId: selectedSessionId,
          markPresent: markPresentOnAdd,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setShowAddModal(false);
      setNewFullName("");
      setNewPhone("");
      showToast(
        language === "ar" ? "تمت إضافة المخدوم وتحديث الكشف بنجاح" : "Member added successfully"
      );
      fetchAttendanceSheet(selectedSessionId);
    } catch (err: any) {
      setAddError(
        err.message === "INVALID_EGYPTIAN_PHONE"
          ? language === "ar"
            ? "رقم الهاتف غير صالح. يجب أن يكون رقم محمول مصري مكون من 11 رقماً (مثال: 01012345678)"
            : "Invalid Egyptian mobile number (must be 11 digits)"
          : err.message
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleGenerateChurchQR = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qr-generate",
          sessionId: selectedSessionId,
        }),
      });
      const data = await res.json();
      if (data.token) {
        setQrToken(data.token);
        const url = await QRCode.toDataURL(data.token, { width: 320, margin: 2 });
        setQrDataUrl(url);
        setShowQrModal(true);
      }
    } catch { }
  };

  const isOffSession = sessionData?.status === "OFF";
  const presentCount = members.filter((m) => m.attendanceStatus === "PRESENT").length;
  const absentCount = members.filter((m) => m.attendanceStatus === "ABSENT").length;
  const unmarkedCount = members.filter((m) => m.attendanceStatus === "UNMARKED").length;

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase().trim()) ||
      m.phone.includes(search.trim());

    if (!matchesSearch) return false;
    if (filter === "ALL") return true;
    return m.attendanceStatus === filter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold transition-all animate-in fade-in duration-200 ${toastMessage.error
            ? "bg-[#FAF0F0] text-[#8C2929] border-[#8C2929]/30"
            : "bg-[#233D30] text-white border-[#B58A3A]/40"
            }`}
        >
          {toastMessage.text}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Top Operational Bar */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#233D30] text-[#B58A3A] flex items-center justify-center shrink-0 border border-[#B58A3A]/40">
              <CopticCross className="w-5 h-5" color="#B58A3A" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#77786F] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                {t("attendance.saturdaySession")}
              </span>
              <SessionSelect
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={(id) => setSelectedSessionId(id)}
                onPraiseAdded={(newSession) => {
                  fetchSessions();
                  setSelectedSessionId(newSession.id);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scan Member QR Pass Button */}
            <button
              onClick={() => {
                setScanPassResult(null);
                setPassInput("");
                setShowScanPassModal(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ScanLine className="w-4 h-4 text-[#B58A3A]" />
              <span>{language === "ar" ? "مسح بطاقة مخدوم (QR)" : "Scan Member Pass"}</span>
            </button>

            {/* Quick Add Member */}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg border border-[#E4E0D5] bg-[#EFEDE5] hover:bg-[#E4E0D5] text-[#252922] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#77786F]" />
              <span>{t("attendance.quickAddMember")}</span>
            </button>

            {/* Projector Church QR Display */}
            <button
              onClick={handleGenerateChurchQR}
              className="px-3.5 py-2 rounded-lg border border-[#B58A3A] bg-[#FAF5EA] text-[#B58A3A] hover:bg-[#E8D9B8]/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{t("qr.sessionQrDisplay")}</span>
            </button>
          </div>
        </div>

        {/* OFF Session Banner with 1-Click Reverse */}
        {isOffSession && (
          <div className="bg-[#FAF5EA] border-2 border-[#B58A3A]/60 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B58A3A] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#252922]">
                  {language === "ar"
                    ? "تنبيه: هذا السبت مسجل بدون تسبحة"
                    : "Notice: This Saturday is marked as OFF"}
                </h4>
                <p className="text-xs text-[#77786F] mt-0.5">
                  {sessionData?.offReason
                    ? `${language === "ar" ? "السبب المذكور:" : "Reason:"} ${sessionData.offReason}`
                    : language === "ar"
                      ? "السبوت التي لا توجد بها تسبحة لا تكسر سلاسل المواظبة أو الأرقام القياسية للمخدومين."
                      : "Official OFF sessions do not break member attendance streaks."}
                </p>
              </div>
            </div>

            <button
              onClick={handleReverseOff}
              className="px-4 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "تفعيل تسبحة هذا السبت" : "Activate Session / Reverse OFF"}</span>
            </button>
          </div>
        )}

        {/* Metric Tickers */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 font-mono">
          <div
            onClick={() => setFilter("PRESENT")}
            className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${filter === "PRESENT"
              ? "bg-[#EEF5F1] border-[#233D30] shadow-xs"
              : "bg-white border-[#E4E0D5] hover:bg-[#F7F6F1]"
              }`}
          >
            <span className="text-[11px] font-sans font-semibold text-[#233D30] block">
              {t("attendance.presentCount")}
            </span>
            <span className="text-xl sm:text-3xl font-black text-[#233D30]">
              {presentCount}
            </span>
          </div>

          <div
            onClick={() => setFilter("ABSENT")}
            className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${filter === "ABSENT"
              ? "bg-[#FAF0F0] border-[#8C2929] shadow-xs"
              : "bg-white border-[#E4E0D5] hover:bg-[#F7F6F1]"
              }`}
          >
            <span className="text-[11px] font-sans font-semibold text-[#8C2929] block">
              {t("attendance.absentCount")}
            </span>
            <span className="text-xl sm:text-3xl font-black text-[#8C2929]">
              {absentCount}
            </span>
          </div>

          <div
            onClick={() => setFilter("UNMARKED")}
            className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${filter === "UNMARKED"
              ? "bg-[#EFEDE5] border-[#252922] shadow-xs"
              : "bg-white border-[#E4E0D5] hover:bg-[#F7F6F1]"
              }`}
          >
            <span className="text-[11px] font-sans font-semibold text-[#77786F] block">
              {t("attendance.unmarked")}
            </span>
            <span className="text-xl sm:text-3xl font-black text-[#77786F]">
              {unmarkedCount}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute top-3 rtl:right-3 ltr:left-3 text-[#77786F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full text-xs py-2 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filter Pills with clean translations */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
            {(["ALL", "PRESENT", "ABSENT", "UNMARKED"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${filter === mode
                  ? "bg-[#233D30] text-white"
                  : "text-[#77786F] hover:bg-[#EFEDE5]"
                  }`}
              >
                {mode === "ALL"
                  ? t("common.all")
                  : mode === "UNMARKED"
                    ? (language === "ar" ? "غير مسجل" : "Unmarked")
                    : t(`statuses.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Member Attendance Roster Table */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.loading")}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.noData")}
            </div>
          ) : (
            <>
              {/* Desktop Roster Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right ltr:text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E0D5] dark:border-[#232740] bg-[#EFEDE5]/60 dark:bg-[#161828] text-[11px] font-bold text-[#77786F] dark:text-[#94A3B8] uppercase tracking-wider">
                      <th className="py-3 px-4">{t("common.name")}</th>
                      <th className="py-3 px-4">{t("common.phone")}</th>
                      <th className="py-3 px-4 text-center">{t("streaks.currentStreak")}</th>
                      <th className="py-3 px-4 text-center">{t("attendance.statsSummary")}</th>
                      <th className="py-3 px-4 text-center">{t("common.status")}</th>
                      <th className="py-3 px-4 text-center">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E0D5]/70 dark:divide-[#232740]">
                    {filteredMembers.map((m) => {
                      const isPresent = m.attendanceStatus === "PRESENT";
                      const isAbsent = m.attendanceStatus === "ABSENT";
                      const cleanName = m.fullName
                        .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
                        .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
                        .trim();

                      return (
                        <tr
                          key={m.memberId}
                          className={`hover:bg-[#FAF5EA]/40 dark:hover:bg-[#1A1D30] transition-colors ${isPresent
                            ? "bg-[#EEF5F1]/30 dark:bg-[#10B981]/10"
                            : isAbsent
                              ? "bg-[#FAF0F0]/30 dark:bg-[#EF4444]/10"
                              : ""
                            }`}
                        >
                          <td className="py-3 px-4 font-bold text-xs text-[#252922] dark:text-white">
                            <div className="flex items-center gap-2">
                              <MemberAvatar
                                memberId={m.memberId}
                                avatarUrl={m.avatarUrl}
                                fullName={cleanName}
                                size="xs"
                              />
                              <span>{cleanName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#77786F] dark:text-[#94A3B8]">
                            {m.phone}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="font-bold text-[#B58A3A] dark:text-[#F59E0B]">
                              {m.currentStreak}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs font-mono text-[#77786F] dark:text-[#94A3B8]">
                            {m.rewardsEarned > 0 ? (
                              <span className="font-bold text-[#233D30] dark:text-[#10B981]">
                                🎁 {m.rewardsEarned}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF5F1] dark:bg-[#10B981]/20 text-[#233D30] dark:text-[#10B981] border border-[#233D30]/20 dark:border-[#10B981]/30 font-mono">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                {t("statuses.PRESENT")} {m.method === "QR" ? "(QR)" : ""}
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FAF0F0] dark:bg-[#EF4444]/20 text-[#8C2929] dark:text-[#EF4444] border border-[#8C2929]/20 dark:border-[#EF4444]/30 font-mono">
                                <X className="w-3 h-3 stroke-[2.5]" />
                                {t("statuses.ABSENT")}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#77786F] dark:text-[#64748B]">
                                {language === "ar" ? "غير مسجل" : "Unmarked"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                disabled={isOffSession}
                                onClick={() => handleMarkAttendance(m.memberId, "PRESENT")}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isPresent
                                  ? "bg-[#233D30] dark:bg-[#10B981] text-white shadow-xs"
                                  : "border border-[#233D30] dark:border-[#10B981]/40 text-[#233D30] dark:text-[#10B981] hover:bg-[#233D30]/10 dark:hover:bg-[#10B981]/15"
                                  }`}
                              >
                                {t("attendance.markPresent")}
                              </button>
                              <button
                                disabled={isOffSession}
                                onClick={() => handleMarkAttendance(m.memberId, "ABSENT")}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isAbsent
                                  ? "bg-[#8C2929] dark:bg-[#EF4444] text-white shadow-xs"
                                  : "border border-[#8C2929] dark:border-[#EF4444]/40 text-[#8C2929] dark:text-[#EF4444] hover:bg-[#8C2929]/10 dark:hover:bg-[#EF4444]/15"
                                  }`}
                              >
                                {t("attendance.markAbsent")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Roster (Touch Friendly) */}
              <div className="md:hidden divide-y divide-[#E4E0D5]/70 dark:divide-[#232740]">
                {filteredMembers.map((m) => {
                  const isPresent = m.attendanceStatus === "PRESENT";
                  const isAbsent = m.attendanceStatus === "ABSENT";
                  const cleanName = m.fullName
                    .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
                    .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
                    .trim();

                  return (
                    <div
                      key={m.memberId}
                      className={`p-3.5 space-y-2.5 ${isPresent ? "bg-[#EEF5F1]/30 dark:bg-[#10B981]/10" : isAbsent ? "bg-[#FAF0F0]/30 dark:bg-[#EF4444]/10" : ""
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <MemberAvatar
                            memberId={m.memberId}
                            avatarUrl={m.avatarUrl}
                            fullName={cleanName}
                            size="sm"
                          />
                          <div>
                            <h4 className="font-bold text-xs text-[#252922] dark:text-white">{cleanName}</h4>
                            <span className="text-[11px] text-[#77786F] dark:text-[#94A3B8] font-mono">{m.phone}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#B58A3A] dark:text-[#F59E0B]">
                          {m.currentStreak} {language === "ar" ? "سبت" : "wks"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={isOffSession}
                          onClick={() => handleMarkAttendance(m.memberId, "PRESENT")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isPresent
                            ? "bg-[#233D30] dark:bg-[#10B981] text-white shadow-xs"
                            : "border border-[#233D30] dark:border-[#10B981]/40 text-[#233D30] dark:text-[#10B981] hover:bg-[#233D30]/10 dark:hover:bg-[#10B981]/15"
                            }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{t("attendance.markPresent")}</span>
                        </button>

                        <button
                          disabled={isOffSession}
                          onClick={() => handleMarkAttendance(m.memberId, "ABSENT")}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isAbsent
                            ? "bg-[#8C2929] dark:bg-[#EF4444] text-white shadow-xs"
                            : "border border-[#8C2929] dark:border-[#EF4444]/40 text-[#8C2929] dark:text-[#EF4444] hover:bg-[#8C2929]/10 dark:hover:bg-[#EF4444]/15"
                            }`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{t("attendance.markAbsent")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL 1: Scan Member Personal QR Pass */}
      {showScanPassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E4E0D5] p-5 sm:p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E0D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#233D30] text-[#B58A3A] flex items-center justify-center">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#233D30]">
                    {language === "ar" ? "مسح بطاقة حضور مخدوم" : "Scan Member QR Pass"}
                  </h3>
                  <span className="text-[10px] text-[#77786F]">
                    {sessionData?.title || "تسبحة السبت"}
                  </span>
                </div>
              </div>

              {/* Toggle Camera vs Keyboard */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-[#E4E0D5] p-0.5 bg-[#F7F6F1]">
                  <button
                    type="button"
                    onClick={() => setScanModalMethod("CAMERA")}
                    className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${scanModalMethod === "CAMERA"
                      ? "bg-[#233D30] text-white shadow-xs"
                      : "text-[#77786F] hover:text-[#252922]"
                      }`}
                    title={language === "ar" ? "الكاميرا المباشرة" : "Live Camera"}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanModalMethod("MANUAL")}
                    className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${scanModalMethod === "MANUAL"
                      ? "bg-[#233D30] text-white shadow-xs"
                      : "text-[#77786F] hover:text-[#252922]"
                      }`}
                    title={language === "ar" ? "إدخال يدوي" : "Manual Input"}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowScanPassModal(false)}
                  className="p-1 rounded-lg text-[#77786F] hover:bg-[#EFEDE5] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {scanPassResult && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex flex-col gap-1 ${scanPassResult.success
                  ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                  : "bg-[#FAF0F0] text-[#8C2929] border border-[#8C2929]/20"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {scanPassResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{scanPassResult.message}</span>
                </div>
                {scanPassResult.member && (
                  <div className="text-[11px] font-mono text-[#77786F] mt-1 pt-1 border-t border-[#233D30]/10 flex items-center justify-between">
                    <span>
                      {language === "ar" ? "السلسلة بعد التسجيل:" : "Updated streak:"}{" "}
                      <strong className="text-[#233D30]">{scanPassResult.member.currentStreak} سبت</strong>
                    </span>
                    <span>
                      {language === "ar" ? "إجمالي الحضور:" : "Total attendances:"}{" "}
                      <strong className="text-[#233D30]">{scanPassResult.member.totalAttendance}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {scanModalMethod === "CAMERA" ? (
              <div className="py-1">
                <CameraQRScanner
                  scannerId="attendance-modal-qr-scanner"
                  isActive={showScanPassModal && scanModalMethod === "CAMERA"}
                  onScanSuccess={(decoded) => {
                    executeScanPass(decoded);
                  }}
                />
              </div>
            ) : (
              <form onSubmit={handleScanMemberPassSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#252922] mb-1">
                    {language === "ar"
                      ? "امسح رمز QR بالماسح الضوئي أو الصق الرمز / رقم الهاتف"
                      : "Scan QR code or paste Member Pass / Phone"}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="TSB7A:MEMBER:... أو رقم هاتف المخدوم"
                    className="w-full text-xs p-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowScanPassModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-lg transition-colors cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={scanPassLoading}
                    className="px-4 py-2 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {scanPassLoading ? t("common.loading") : language === "ar" ? "تسجيل الحاضر الآن" : "Record Attendance"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Quick Add Member */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-6 max-w-sm w-full shadow-lg space-y-4">
            <h3 className="font-bold text-base text-[#252922]">
              {t("attendance.quickAddMember")}
            </h3>

            {addError && (
              <div className="p-2.5 rounded-lg bg-[#FAF0F0] text-[#8C2929] text-xs font-semibold">
                {addError}
              </div>
            )}

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("common.name")}
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder={language === "ar" ? "الاسم ثلاثي" : "Full Name"}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {t("common.phone")}
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="markPresent"
                  checked={markPresentOnAdd}
                  onChange={(e) => setMarkPresentOnAdd(e.target.checked)}
                  className="rounded-xs text-[#233D30] focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="markPresent"
                  className="text-xs font-semibold text-[#252922] cursor-pointer"
                >
                  {language === "ar" ? "تسجيله كـ حاضر فوراً لهذه التسبحة" : "Mark present immediately"}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-lg transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {addLoading ? t("common.loading") : t("common.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Church Session QR Display */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E4E0D5] p-6 max-w-sm w-full shadow-xl space-y-4 text-center">
            <h3 className="font-bold text-base text-[#252922]">
              {t("qr.sessionQrDisplay")}
            </h3>
            <p className="text-xs text-[#77786F]">
              {language === "ar"
                ? "اعرض هذا الرمز على الشاشة أو البروجيكتور ليقوم المخدومون بمسحه بهواتفهم"
                : "Display this QR code for members to scan with their phones"}
            </p>

            <div className="p-3 bg-[#FAF5EA] rounded-xl border border-[#E4E0D5] flex items-center justify-center">
              {qrDataUrl && <img src={qrDataUrl} alt="Session QR" className="w-56 h-56" />}
            </div>

            <div className="text-xs font-mono text-[#77786F] bg-[#EFEDE5] p-2 rounded-lg truncate">
              {qrToken}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
