"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import { CameraQRScanner } from "@/components/CameraQRScanner";
import {
  QrCode,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ScanLine,
  UserCheck,
  Award,
  Camera,
  Keyboard,
  ChevronDown,
} from "lucide-react";
import QRCode from "qrcode";

export default function QRPage() {
  const { language, t } = useLanguage();

  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Mode: SCAN_MEMBER (Mod scanning member), MEMBER_SELF (Member scanning screen), CHURCH_DISPLAY (Projector)
  const [mode, setMode] = useState<"SCAN_MEMBER" | "MEMBER_SELF" | "CHURCH_DISPLAY">("SCAN_MEMBER");

  // Input method for mod scan: "CAMERA" or "MANUAL"
  const [scanMethod, setScanMethod] = useState<"CAMERA" | "MANUAL">("CAMERA");

  // State for Mod scanning member
  const [memberQrPayload, setMemberQrPayload] = useState("");
  const [modScanResult, setModScanResult] = useState<{
    success: boolean;
    message: string;
    member?: any;
  } | null>(null);
  const [modScanLoading, setModScanLoading] = useState(false);

  // State for member self-checkin
  const [churchScreenToken, setChurchScreenToken] = useState("");
  const [selfScanStatus, setSelfScanStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [selfScanLoading, setSelfScanLoading] = useState(false);

  useEffect(() => {
    fetchActiveSession();
  }, []);

  const fetchActiveSession = async () => {
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      const list = json.sessions || [];
      setSessions(list);
      const active =
        list.find((s: any) => s.status === "ACTIVE" || s.qrActive) || list[0];
      if (active) {
        setActiveSession(active);
        setSelectedSessionId(active.id);
        if (active.qrToken) {
          const url = await QRCode.toDataURL(active.qrToken, { width: 360, margin: 2 });
          setQrDataUrl(url);
        }
      }
    } catch { }
  };

  // Moderator scanning a member's personal QR pass
  const executeMemberScan = async (payloadToScan: string) => {
    if (!payloadToScan || !payloadToScan.trim()) return;

    setModScanLoading(true);
    setModScanResult(null);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan-member-pass",
          sessionId: selectedSessionId || activeSession?.id,
          qrPayload: payloadToScan.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error);
      }

      setModScanResult({
        success: true,
        message:
          language === "ar"
            ? `✓ تم تسجيل حضور ${json.member?.fullName} بنجاح!`
            : `✓ Marked ${json.member?.fullName} as PRESENT!`,
        member: json.member,
      });
      setMemberQrPayload("");
    } catch (err: any) {
      setModScanResult({
        success: false,
        message:
          err.message === "MEMBER_NOT_FOUND"
            ? language === "ar"
              ? "لم يتم العثور على مخدوم بهذا الرمز أو رقم الهاتف"
              : "Member not found"
            : err.message === "CANNOT_MARK_ON_OFF_OR_CANCELLED_SESSION"
              ? language === "ar"
                ? "هذا السبت مسجل بدون تسبحة"
                : "This session is marked OFF"
              : err.message,
      });
    } finally {
      setModScanLoading(false);
    }
  };

  const handleModManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeMemberScan(memberQrPayload);
  };

  // Member self-scan from projector screen
  const handleMemberSelfScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchScreenToken || !activeSession) return;
    setSelfScanLoading(true);
    setSelfScanStatus(null);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qr-scan",
          sessionId: activeSession.id,
          token: churchScreenToken.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSelfScanStatus({
        success: true,
        message: t("qr.scanSuccess"),
      });
      setChurchScreenToken("");
    } catch (err: any) {
      setSelfScanStatus({
        success: false,
        message:
          err.message === "ALREADY_PRESENT"
            ? language === "ar"
              ? "تم تسجيل حضورك بالفعل في هذه التسبحة"
              : "You are already marked present"
            : err.message === "TOKEN_EXPIRED"
              ? language === "ar"
                ? "انتهت صلاحية رمز التسبحة"
                : "QR token has expired"
              : t("qr.scanError"),
      });
    } finally {
      setSelfScanLoading(false);
    }
  };

  const handleRefreshChurchQR = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qr-generate",
          sessionId: activeSession.id,
        }),
      });
      const data = await res.json();
      if (data.token) {
        const url = await QRCode.toDataURL(data.token, { width: 360, margin: 2 });
        setQrDataUrl(url);
      }
    } catch { }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Mode Switcher Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border border-[#E4E0D5] p-1 bg-white shadow-xs max-w-full overflow-x-auto">
            <button
              onClick={() => setMode("SCAN_MEMBER")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${mode === "SCAN_MEMBER"
                ? "bg-[#233D30] text-white shadow-xs"
                : "text-[#77786F] hover:text-[#252922]"
                }`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "مسح بطاقة حضور مخدوم" : "Scan Member Pass"}</span>
            </button>

            <button
              onClick={() => setMode("MEMBER_SELF")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${mode === "MEMBER_SELF"
                ? "bg-[#233D30] text-white shadow-xs"
                : "text-[#77786F] hover:text-[#252922]"
                }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "تسجيل حضوري بالموبايل" : "Member Self Check-In"}</span>
            </button>

            <button
              onClick={() => setMode("CHURCH_DISPLAY")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${mode === "CHURCH_DISPLAY"
                ? "bg-[#233D30] text-white shadow-xs"
                : "text-[#77786F] hover:text-[#252922]"
                }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "شاشة العرض بالكنيسة" : "Projector Screen"}</span>
            </button>
          </div>
        </div>

        {/* 1. SCAN MEMBER QR PASS (PRIMARY FOR MODS/ADMINS WITH CAMERA) */}
        {mode === "SCAN_MEMBER" && (
          <div className="bg-white rounded-2xl border border-[#E4E0D5] shadow-xs p-5 sm:p-7 max-w-lg mx-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E0D5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#233D30] text-[#B58A3A] flex items-center justify-center shrink-0 border border-[#B58A3A]/40 shadow-xs">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#233D30]">
                    {language === "ar" ? "مسح بطاقة حضور المخدوم" : "Scan Member Attendance Pass"}
                  </h2>
                  <p className="text-xs text-[#77786F]">
                    {language === "ar"
                      ? "وجّه الكاميرا نحو رمز المخدوم لتسجيل حضوره تلقائياً"
                      : "Scan member QR pass with camera to record attendance"}
                  </p>
                </div>
              </div>

              {/* Camera vs Keyboard Toggle */}
              <div className="flex items-center rounded-lg border border-[#E4E0D5] p-0.5 bg-[#F7F6F1]">
                <button
                  type="button"
                  onClick={() => setScanMethod("CAMERA")}
                  className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${scanMethod === "CAMERA"
                    ? "bg-[#233D30] text-white shadow-xs"
                    : "text-[#77786F] hover:text-[#252922]"
                    }`}
                  title={language === "ar" ? "ماسح الكاميرا المباشر" : "Live Camera Scanner"}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setScanMethod("MANUAL")}
                  className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${scanMethod === "MANUAL"
                    ? "bg-[#233D30] text-white shadow-xs"
                    : "text-[#77786F] hover:text-[#252922]"
                    }`}
                  title={language === "ar" ? "إدخال يدوي / رقم الهاتف" : "Manual / Phone Input"}
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Saturday Session Selector */}
            {sessions.length > 0 && (
              <div className="bg-[#FAF5EA] dark:bg-[#161828] p-3 rounded-xl border border-[#B58A3A]/30 dark:border-[#2B304C] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#233D30] dark:text-white">
                  {language === "ar" ? "جلسة السبت المحددة:" : "Target Saturday:"}
                </span>
                <div className="relative">
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="appearance-none font-bold text-xs text-[#252922] dark:text-white bg-white dark:bg-[#1A1D30] border border-[#E4E0D5] dark:border-[#2B304C] rounded-xl py-1.5 px-3 rtl:pl-8 ltr:pr-8 hover:border-[#B58A3A] dark:hover:border-[#F59E0B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/30 cursor-pointer transition-all shadow-xs w-full sm:w-auto"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-[#161828] text-[#252922] dark:text-white py-1">
                        {s.title || new Date(s.date).toISOString().split("T")[0]} ({t(`statuses.${s.status}`)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#77786F] dark:text-[#94A3B8] absolute top-1/2 -translate-y-1/2 rtl:left-2.5 ltr:right-2.5 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Scan Status Toast Result */}
            {modScanResult && (
              <div
                className={`p-4 rounded-xl text-xs font-bold flex flex-col gap-1.5 animate-in fade-in ${modScanResult.success
                  ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                  : "bg-[#FAF0F0] text-[#8C2929] border border-[#8C2929]/20"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {modScanResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#233D30]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#8C2929]" />
                  )}
                  <span className="text-sm">{modScanResult.message}</span>
                </div>

                {modScanResult.member && (
                  <div className="mt-2 pt-2 border-t border-[#233D30]/10 flex items-center justify-between font-mono text-xs">
                    <span>
                      {language === "ar" ? "السلسلة الحالية:" : "Current Streak:"}{" "}
                      <strong className="text-[#B58A3A] font-bold">
                        {modScanResult.member.currentStreak} سبت متتالي
                      </strong>
                    </span>
                    <span>
                      {language === "ar" ? "إجمالي الحضور:" : "Total Attendance:"}{" "}
                      <strong className="text-[#233D30]">
                        {modScanResult.member.totalAttendance}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* CAMERA SCANNER VIEW */}
            {scanMethod === "CAMERA" ? (
              <div className="py-1">
                <CameraQRScanner
                  isActive={mode === "SCAN_MEMBER" && scanMethod === "CAMERA"}
                  onScanSuccess={(decodedText) => {
                    executeMemberScan(decodedText);
                  }}
                />
              </div>
            ) : (
              /* MANUAL INPUT / BARCODE GUN FALLBACK */
              <form onSubmit={handleModManualSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#252922] mb-1">
                    {language === "ar"
                      ? "رمز بطاقة المخدوم (أو رقم هاتف المخدوم)"
                      : "Member Pass Token or Phone Number"}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={memberQrPayload}
                    onChange={(e) => setMemberQrPayload(e.target.value)}
                    placeholder="TSB7A:MEMBER:... أو رقم المحمول 01012345678"
                    className="w-full text-xs p-3 rounded-xl border border-[#E4E0D5] bg-[#F7F6F1] font-mono text-[#252922] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={modScanLoading}
                  className="w-full py-3 rounded-xl bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {modScanLoading
                      ? t("common.loading")
                      : language === "ar"
                        ? "تسجيل حضور المخدوم الآن"
                        : "Confirm Attendance"}
                  </span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* 2. MEMBER SELF SCAN */}
        {mode === "MEMBER_SELF" && (
          <div className="bg-white rounded-2xl border border-[#E4E0D5] shadow-xs p-6 sm:p-8 max-w-md mx-auto space-y-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#233D30] text-[#B58A3A] mx-auto flex items-center justify-center border border-[#B58A3A]/40 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#233D30]">
                {t("qr.title")}
              </h2>
              <p className="text-xs text-[#77786F] mt-1 leading-relaxed">
                {t("qr.scanInstructions")}
              </p>
            </div>

            {selfScanStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${selfScanStatus.success
                  ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                  : "bg-[#FAF0F0] text-[#8C2929] border border-[#8C2929]/20"
                  }`}
              >
                {selfScanStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{selfScanStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleMemberSelfScan} className="space-y-3 pt-2 text-right ltr:text-left">
              <label className="block text-xs font-semibold text-[#252922]">
                {language === "ar" ? "رمز التسبحة المعروض على الشاشة" : "Session Token on Projector"}
              </label>
              <input
                type="text"
                required
                value={churchScreenToken}
                onChange={(e) => setChurchScreenToken(e.target.value)}
                placeholder="demo_active_session_qr_token_2026"
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-[#E4E0D5] bg-[#F7F6F1] font-mono text-[#252922] focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={selfScanLoading}
                className="w-full py-2.5 rounded-xl bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                {selfScanLoading ? t("common.loading") : language === "ar" ? "تأكيد تسجيل حضوري الآن" : "Submit Check-In"}
              </button>
            </form>
          </div>
        )}

        {/* 3. CHURCH DISPLAY (PROJECTOR SCREEN) */}
        {mode === "CHURCH_DISPLAY" && (
          <div className="bg-white rounded-2xl border-2 border-[#B58A3A] shadow-xs p-6 sm:p-10 text-center space-y-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#B58A3A] tracking-wider uppercase flex items-center justify-center gap-1.5">
                <CopticCross className="w-3.5 h-3.5" color="#B58A3A" />
                <span>{t("app.churchName")}</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#233D30]">
                {t("qr.sessionQrDisplay")}
              </h2>
              <p className="text-xs text-[#77786F]">
                {activeSession?.title || (language === "ar" ? "تسبحة نصف الليل الأسبوعية" : "Weekly Midnight Praise")}
              </p>
            </div>

            {qrDataUrl ? (
              <div className="p-4 bg-white rounded-2xl border border-[#E4E0D5] inline-block shadow-sm">
                <img src={qrDataUrl} alt="Session QR" className="w-64 h-64 sm:w-72 sm:h-72 mx-auto" />
              </div>
            ) : (
              <div className="py-16 text-xs text-[#77786F]">
                {language === "ar" ? "جاري إنشاء الرمز الآمن..." : "Generating secure QR token..."}
              </div>
            )}

            <div>
              <button
                onClick={handleRefreshChurchQR}
                className="px-3.5 py-1.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-xs font-bold text-[#252922] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#B58A3A]" />
                <span>{t("qr.refreshCode")}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
