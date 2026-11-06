"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import { MemberAvatar } from "@/components/MemberAvatar";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";
import {
  Flame,
  Award,
  Calendar,
  Check,
  X,
  HelpCircle,
  ShieldAlert,
  KeyRound,
  Phone,
  Mail,
  Medal,
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  QrCode,
  Download,
  Copy,
  Camera,
  Upload,
  Pencil,
} from "lucide-react";
import QRCode from "qrcode";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function MemberDashboardPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedToken, setCopiedToken] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);
  const [dismissedAvatarBanner, setDismissedAvatarBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Name modal
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  // Scan Session QR modal (church screen projector)
  const [showScanSessionModal, setShowScanSessionModal] = useState(false);
  const [manualSessionToken, setManualSessionToken] = useState("");
  const [sessionScanLoading, setSessionScanLoading] = useState(false);
  const [sessionScanResult, setSessionScanResult] = useState<{
    success: boolean;
    message: string;
    alreadyRecorded?: boolean;
  } | null>(null);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member-dashboard");
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json.member?.id) {
          // Check if avatar alert was dismissed
          const isDismissed = localStorage.getItem(`avatar_dismissed_${json.member.id}`);
          if (isDismissed) setDismissedAvatarBanner(true);

          const passPayload = `TSB7A:MEMBER:${json.member.id}`;
          const url = await QRCode.toDataURL(passPayload, {
            width: 360,
            margin: 2,
            color: {
              dark: "#233D30",
              light: "#FFFFFF",
            },
          });
          setQrDataUrl(url);
        }
      }
    } catch { }
    setLoading(false);
  };

  const handleDismissAvatarBanner = () => {
    if (data?.member?.id) {
      localStorage.setItem(`avatar_dismissed_${data.member.id}`, "true");
    }
    setDismissedAvatarBanner(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert(language === "ar" ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" : "Image size must be under 5MB");
      return;
    }

    setAvatarUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      try {
        const res = await fetch("/api/auth/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-avatar",
            avatarUrl: dataUrl,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          setData((prev: any) => ({
            ...prev,
            member: {
              ...prev.member,
              avatarUrl: dataUrl,
            },
          }));
        } else {
          alert(json.error || "Failed to upload avatar");
        }
      } catch (err: any) {
        alert(err.message || "Failed to upload avatar");
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;
    setEditNameLoading(true);
    setEditNameError(null);
    try {
      const res = await fetch("/api/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-name", fullName: newFullName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditNameError(json.error || (language === "ar" ? "فشل تحديث الاسم" : "Failed to update name"));
      } else {
        setData((prev: any) => ({
          ...prev,
          member: { ...prev.member, fullName: json.fullName },
        }));
        setShowEditNameModal(false);
        // Refresh to update header/session
        fetchDashboardData();
        window.location.reload();
      }
    } catch {
      setEditNameError(language === "ar" ? "حدث خطأ أثناء الاتصال بالخادم" : "Server error updating name");
    } finally {
      setEditNameLoading(false);
    }
  };

  const handleScanSessionQr = async (scannedToken: string) => {
    if (!scannedToken.trim() || sessionScanLoading) return;
    setSessionScanLoading(true);
    setSessionScanResult(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan-session-qr",
          token: scannedToken.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSessionScanResult({
          success: true,
          message: json.message || (language === "ar" ? "تم تسجيل حضورك بنجاح في تسبحة اليوم!" : "Attendance recorded successfully!"),
          alreadyRecorded: json.alreadyRecorded || false,
        });
        fetchDashboardData();
      } else {
        setSessionScanResult({
          success: false,
          message: json.message || json.error || (language === "ar" ? "رمز التسبحة غير صالح أو منتهي الصلاحية" : "Invalid or expired session token"),
        });
      }
    } catch {
      setSessionScanResult({
        success: false,
        message: language === "ar" ? "تعذر الاتصال بالخادم لتسجيل الحضور" : "Failed to connect to server",
      });
    } finally {
      setSessionScanLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    try {
      const res = await fetch("/api/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setPwdMsg({
        text: language === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully",
        error: false,
      });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPwdMsg({
        text:
          err.message === "CURRENT_PASSWORD_INCORRECT"
            ? language === "ar"
              ? "كلمة المرور الحالية غير صحيحة"
              : "Current password incorrect"
            : language === "ar"
              ? "حدث خطأ أثناء تغيير كلمة المرور"
              : "Error changing password",
        error: true,
      });
    }
  };

  const handleCopyPassCode = () => {
    if (!data?.member?.id) return;
    navigator.clipboard.writeText(`TSB7A:MEMBER:${data.member.id}`);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0C14] text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#94A3B8]">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!data || !data.member) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0C14] text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[#94A3B8]">
          {language === "ar"
            ? "يرجى تسجيل الدخول لعرض لوحة تحكم حسابك"
            : "Please log in to view your dashboard"}
        </div>
      </div>
    );
  }

  const { member, stats, calendar, rewards, achievements, achievementTypes, annualRank, allTimeRank } = data;

  // Clean member name without any trailing role suffixes
  const cleanMemberName = member.fullName
    ? member.fullName
      .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
      .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
      .trim()
    : "";

  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;
  const provisionalStreak = stats?.provisionalStreak || 0;
  const hasPendingReset = stats?.hasPendingReset || false;
  const totalAttendance = stats?.totalAttendance || 0;
  const annualAttendance = stats?.annualAttendance || 0;
  const rewardsEarned = stats?.rewardsEarned || 0;
  const rewardsDelivered = stats?.rewardsDelivered || 0;
  const nextRewardProgress = stats?.nextRewardProgress || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C14] text-white selection:bg-[#10B981]/30 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hidden File Input for Avatar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />

        {/* Dismissible Profile Avatar Prompt Banner */}
        {!member.avatarUrl && !dismissedAvatarBanner && (
          <div className="bg-[#FAF5EA] border border-[#B58A3A]/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#B58A3A]/20 text-[#B58A3A] flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-[#252922]">
                  {language === "ar" ? "هل تود اختيار صورة رمزية لملفك الشخصي؟" : "Choose your profile avatar?"}
                </h4>
                <p className="text-xs text-[#77786F] mt-0.5">
                  {language === "ar"
                    ? "اختر من مكتبة الصور الرمزية لتظهر في لوحة الشرف بجوار اسمك وسلسلة حضورك."
                    : "Select an avatar from our church library to appear on the leaderboard."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setShowAvatarPickerModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B58A3A]" />
                <span>
                  {language === "ar" ? "اختيار صورة رمزية" : "Choose Avatar"}
                </span>
              </button>
              <button
                onClick={handleDismissAvatarBanner}
                className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#EFEDE5] text-xs font-semibold text-[#77786F] cursor-pointer"
              >
                {language === "ar" ? "تجاهل" : "Dismiss"}
              </button>
            </div>
          </div>
        )}

        {/* Member Profile Masthead */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            {/* Centralized Avatar with Edit/Picker Badge */}
            <div className="relative group shrink-0">
              <MemberAvatar
                memberId={member.id}
                avatarUrl={member.avatarUrl}
                fullName={cleanMemberName}
                size="lg"
                className="border-2 border-[#B58A3A]"
              />
              <button
                type="button"
                onClick={() => setShowAvatarPickerModal(true)}
                title={language === "ar" ? "تغيير الصورة الرمزية" : "Change avatar"}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#E4E0D5] text-[#233D30] hover:bg-[#FAF5EA] flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-110"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#233D30]">
                  {cleanMemberName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setNewFullName(cleanMemberName);
                    setEditNameError(null);
                    setShowEditNameModal(true);
                  }}
                  title={language === "ar" ? "تعديل الاسم" : "Edit Name"}
                  className="p-1 rounded-md text-[#77786F] hover:text-[#233D30] hover:bg-[#EFEDE5] transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFEDE5] text-[#233D30] border border-[#E4E0D5]">
                  {t(`roles.${member.role}`)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#77786F] mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {member.phone}
                </span>
                {member.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {member.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setNewFullName(cleanMemberName);
                setEditNameError(null);
                setShowEditNameModal(true);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-[#EFEDE5] hover:bg-[#E4E0D5] text-xs font-semibold text-[#252922] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#233D30]" />
              <span>{language === "ar" ? "تعديل الاسم" : "Edit Name"}</span>
            </button>

            <button
              onClick={() => setShowAvatarPickerModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-[#EFEDE5] hover:bg-[#E4E0D5] text-xs font-semibold text-[#252922] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#B58A3A]" />
              <span>{language === "ar" ? "تغيير الصورة" : "Change Avatar"}</span>
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-[#EFEDE5] hover:bg-[#E4E0D5] text-xs font-semibold text-[#252922] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#77786F]" />
              <span>{t("auth.changePassword")}</span>
            </button>
          </div>
        </div>

        {/* Option B Provisional Streak Banner */}
        {hasPendingReset && (
          <div className="p-4 rounded-xl bg-[#FAF5EA] border border-[#B58A3A] flex items-start gap-3 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-[#B58A3A] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-[#252922]">
                {language === "ar"
                  ? "تنبيه: لديك طلب مراجعة غياب قيد الانتظار لدى الإدارة"
                  : "Notice: Pending Streak Reset Review"}
              </h4>
              <p className="text-[#77786F] leading-relaxed">
                {t("streaks.provisionalNotice")}{" "}
                <span className="font-mono font-bold text-[#B58A3A]">
                  {language === "ar"
                    ? `[السلسلة الرسمية المحفوظة: ${currentStreak} • الحضور المؤقت الحالي: ${provisionalStreak}]`
                    : `[Official Preserved Streak: ${currentStreak} • Current Provisional Streak: ${provisionalStreak}]`}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Top Feature: Personal Attendance QR Pass & Streaks Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Dedicated Personal QR Pass Card (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#FAF5EA] to-white dark:from-[#161828] dark:to-[#121422] rounded-2xl border-2 border-[#B58A3A]/40 dark:border-[#B58A3A]/30 p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#B58A3A]/5 dark:bg-[#B58A3A]/10 rounded-bl-full pointer-events-none" />

            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#B58A3A]/20 dark:border-[#B58A3A]/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#233D30] dark:bg-[#1E2438] text-[#B58A3A] dark:text-[#F59E0B] flex items-center justify-center border border-[#B58A3A]/30">
                    <CopticCross className="w-4 h-4" color="#B58A3A" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#233D30] dark:text-white">
                      {language === "ar" ? "بطاقة حضور التسبحة الشخصية" : "Personal Attendance Pass"}
                    </h3>
                    <p className="text-[10px] text-[#77786F] dark:text-[#94A3B8]">
                      {t("app.churchName")}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#233D30] dark:bg-[#1E2438] text-white dark:text-[#F59E0B] border border-[#B58A3A]/30">
                  QR PASS
                </span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white dark:bg-[#1A1D30] p-3 rounded-xl border border-[#E4E0D5] dark:border-[#2B304C] flex flex-col items-center justify-center shadow-xs">
                {qrDataUrl ? (
                  <div className="p-2 bg-white rounded-lg shadow-inner">
                    <img
                      src={qrDataUrl}
                      alt="Personal Attendance QR Code"
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#77786F] dark:text-[#94A3B8]">
                    {t("common.loading")}
                  </div>
                )}
                <div className="text-center mt-2.5">
                  <span className="font-bold text-xs text-[#252922] dark:text-white block">
                    {cleanMemberName}
                  </span>
                  <span className="text-[11px] font-mono text-[#77786F] dark:text-[#94A3B8]">
                    {member.phone}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-center text-[#77786F] dark:text-[#94A3B8] leading-tight px-2">
                {language === "ar"
                  ? "أبرز هذا الرمز لخادم التسبحة عند الباب ليقوم بمسحه وتسجيل حضورك فوراً."
                  : "Show this QR code to the church servant at the door to record your attendance instantly."}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E4E0D5] dark:border-[#232740] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopyPassCode}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] dark:border-[#2B304C] bg-white dark:bg-[#1A1D30] hover:bg-[#EFEDE5] dark:hover:bg-[#252944] text-xs font-semibold text-[#252922] dark:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#77786F] dark:text-[#94A3B8]" />
                  <span>{copiedToken ? (language === "ar" ? "تم النسخ!" : "Copied!") : (language === "ar" ? "نسخ الرمز" : "Copy Code")}</span>
                </button>

                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`tasbeha-pass-${cleanMemberName}.png`}
                    className="px-3 py-1.5 rounded-lg bg-[#233D30] hover:bg-[#192D24] dark:bg-[#10B981] dark:hover:bg-[#059669] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "تحميل البطاقة" : "Download Pass"}</span>
                  </a>
                )}
              </div>

              {/* Optional: Scan Session QR Code from church screen */}
              <button
                type="button"
                onClick={() => {
                  setSessionScanResult(null);
                  setManualSessionToken("");
                  setShowScanSessionModal(true);
                }}
                className="w-full py-2 px-3 rounded-lg border border-[#B58A3A] dark:border-[#F59E0B]/50 bg-[#FAF5EA] dark:bg-[#1A1D30] hover:bg-[#F3EAD3] dark:hover:bg-[#252944] text-[#233D30] dark:text-[#F59E0B] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4 text-[#B58A3A] dark:text-[#F59E0B]" />
                <span>
                  {language === "ar" ? "مسح رمز تسبحة اليوم (شاشة الكنيسة)" : "Scan Today's Tasbeha Screen QR"}
                </span>
              </button>
            </div>
          </div>

          {/* Main Streak & Next Reward Progression (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="bg-white rounded-2xl border border-[#E4E0D5] p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#77786F] uppercase tracking-wider block">
                    {t("streaks.currentStreak")}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-[#233D30]">
                      {currentStreak}
                    </span>
                    <span className="text-xs text-[#77786F] font-semibold">
                      {language === "ar" ? "سبت متتالي" : "consecutive Saturdays"}
                    </span>
                  </div>
                </div>

                <div className="text-right ltr:text-left">
                  <span className="text-[11px] text-[#77786F] block">
                    {t("streaks.longestStreak")}
                  </span>
                  <span className="text-sm font-bold font-mono text-[#252922]">
                    {longestStreak} {language === "ar" ? "سبت" : "wks"}
                  </span>
                </div>
              </div>

              {/* Next Reward Progress Bar */}
              <div className="pt-3 border-t border-[#EFEDE5] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252922] flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-[#B58A3A]" />
                    <span>{t("streaks.rewardProgress")}</span>
                  </span>
                  <span className="font-mono font-bold text-[#233D30]">
                    {nextRewardProgress} / 4 {language === "ar" ? "سبوت" : "sessions"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => {
                    const isDone = nextRewardProgress >= step;
                    return (
                      <div
                        key={step}
                        className={`h-2.5 rounded-sm transition-colors ${isDone ? "bg-[#233D30]" : "bg-[#EFEDE5]"
                          }`}
                      />
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#77786F]">
                  {language === "ar"
                    ? "تحصل على مكافأة وهدية تميز لكل 4 سبوت متتالية من المواظبة."
                    : "Every 4 consecutive attendances unlocks a church milestone gift."}
                </p>
              </div>
            </div>

            {/* Key Totals and Leaderboard Ranks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-[#E4E0D5] p-3.5 space-y-1 shadow-xs">
                <span className="text-[10px] font-semibold text-[#77786F] block">
                  {t("streaks.annualAttendance")}
                </span>
                <div className="text-xl font-black font-mono text-[#252922]">
                  {annualAttendance}
                </div>
                <span className="text-[10px] text-[#77786F] block">
                  {language === "ar" ? "سبت خلال العام" : "This year"}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E0D5] p-3.5 space-y-1 shadow-xs">
                <span className="text-[10px] font-semibold text-[#77786F] block">
                  {t("streaks.allTimeAttendance")}
                </span>
                <div className="text-xl font-black font-mono text-[#252922]">
                  {totalAttendance}
                </div>
                <span className="text-[10px] text-[#77786F] block">
                  {language === "ar" ? "إجمالي الحضور" : "All-time"}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E0D5] p-3.5 space-y-1 shadow-xs">
                <span className="text-[10px] font-semibold text-[#77786F] block">
                  {t("leaderboard.annualRank")}
                </span>
                <div className="text-xl font-black font-mono text-[#B58A3A]">
                  #{annualRank}
                </div>
                <span className="text-[10px] text-[#77786F] block">
                  {language === "ar" ? "ترتيب عام 2026" : "Year rank"}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E0D5] p-3.5 space-y-1 shadow-xs">
                <span className="text-[10px] font-semibold text-[#77786F] block">
                  {t("leaderboard.allTimeRank")}
                </span>
                <div className="text-xl font-black font-mono text-[#233D30]">
                  #{allTimeRank}
                </div>
                <span className="text-[10px] text-[#77786F] block">
                  {language === "ar" ? "الترتيب التاريخي" : "All-time rank"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 52-Week Attendance Heatmap */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#252922] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#233D30]" />
                <span>{t("attendance.heatmapTitle")}</span>
              </h3>
              <p className="text-xs text-[#77786F] mt-0.5">
                {language === "ar"
                  ? "سجل حضور سبوت التسبحة الأسبوعية خلال آخر 52 أسبوعاً (السبت فقط)"
                  : "Attendance log across the last 52 Saturdays"}
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#77786F] self-start sm:self-auto">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#233D30]" />
                <span>{t("statuses.PRESENT")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#8C2929]" />
                <span>{t("statuses.ABSENT")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#B58A3A]" />
                <span>{t("statuses.OFF")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#EFEDE5]" />
                <span>{t("attendance.unmarked")}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <div className="grid grid-flow-col grid-rows-4 gap-1.5 min-w-[640px]">
              {calendar.map((c: any, idx: number) => {
                const isPresent = c.attendanceStatus === "PRESENT";
                const isAbsent = c.attendanceStatus === "ABSENT";
                const isOff = c.status === "OFF";

                const bgClass = isPresent
                  ? "bg-[#233D30] text-white"
                  : isAbsent
                    ? "bg-[#8C2929] text-white"
                    : isOff
                      ? "bg-[#B58A3A]/40 text-[#252922]"
                      : "bg-[#EFEDE5] text-[#77786F]";

                const dateStr = new Date(c.date).toISOString().split("T")[0];
                const statusLabel = isPresent
                  ? t("statuses.PRESENT")
                  : isAbsent
                    ? t("statuses.ABSENT")
                    : isOff
                      ? t("statuses.OFF")
                      : t("attendance.unmarked");

                return (
                  <div
                    key={idx}
                    title={`${dateStr}: ${statusLabel}`}
                    className={`w-7 h-7 rounded-xs ${bgClass} flex items-center justify-center text-[9px] font-mono font-bold transition-transform hover:scale-110 cursor-default`}
                  >
                    {isPresent ? "✓" : isAbsent ? "✗" : isOff ? "—" : "•"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestone Rewards & Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Milestone Rewards Section */}
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#252922] flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#B58A3A]" />
                  <span>{t("rewards.milestoneGifts")}</span>
                </h3>
                <span className="text-xs text-[#77786F]">
                  {language === "ar"
                    ? `${rewardsDelivered} مستلمة من إجمالي ${rewardsEarned} مستحقة`
                    : `${rewardsDelivered} delivered of ${rewardsEarned} earned`}
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#E4E0D5]/60 max-h-80 overflow-y-auto">
              {rewards.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#77786F]">
                  {language === "ar"
                    ? "واظب على حضور التسبحة لفتح هدايا التميز والمكافآت الدورية!"
                    : "Maintain your attendance streak to unlock milestone gifts!"}
                </div>
              ) : (
                rewards.map((r: any) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#252922] block">{r.title}</span>
                      <span className="text-[11px] text-[#77786F]">
                        {language === "ar" ? `سلسلة ${r.tier} سبت` : `Streak tier: ${r.tier}`}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${r.status === "DELIVERED"
                        ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                        : "bg-[#FAF5EA] text-[#B58A3A] border border-[#B58A3A]/40"
                        }`}
                    >
                      {t(`statuses.${r.status}`)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Badges & Achievements Section */}
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-5 sm:p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-[#252922] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B58A3A]" />
                <span>{t("rewards.achievementsCatalog")}</span>
              </h3>
              <p className="text-xs text-[#77786F] mt-0.5">
                {language === "ar"
                  ? "أوسمة الشرف الروحية المكتسبة بالمواظبة المستمرة"
                  : "Spiritual honor badges unlocked through faithful attendance"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pt-1">
              {achievementTypes.map((type: any) => {
                const unlocked = achievements.some((a: any) => a.typeId === type.id);

                return (
                  <div
                    key={type.id}
                    className={`p-3 rounded-lg border transition-all ${unlocked
                      ? "bg-[#FAF5EA] border-[#B58A3A]/40"
                      : "bg-[#EFEDE5]/40 border-[#E4E0D5] opacity-50 grayscale"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#233D30] text-[#B58A3A] flex items-center justify-center shrink-0">
                        <Medal className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-[#252922] truncate">
                        {language === "ar" ? type.nameAr : type.nameEn}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#77786F] mt-1.5 leading-snug">
                      {language === "ar" ? type.descriptionAr : type.descriptionEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Password Change Dialog */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-6 max-w-sm w-full shadow-lg space-y-4">
            <h3 className="font-bold text-base text-[#252922]">
              {t("auth.changePassword")}
            </h3>

            {pwdMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${pwdMsg.error
                  ? "bg-[#FAF0F0] text-[#8C2929]"
                  : "bg-[#EEF5F1] text-[#233D30]"
                  }`}
              >
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {language === "ar" ? "كلمة المرور الحالية" : "Current Password"}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {language === "ar" ? "كلمة المرور الجديدة" : "New Password"}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-lg transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs"
                >
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Full Name Dialog */}
      {showEditNameModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E4E0D5] p-6 max-w-sm w-full shadow-lg space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#252922]">
                {language === "ar" ? "تعديل الاسم بالكامل" : "Edit Full Name"}
              </h3>
              <p className="text-xs text-[#77786F] mt-1">
                {language === "ar"
                  ? "سيتم تطبيق هذا التعديل فوراً على لوحة الشرف وكشوف الحضور."
                  : "Your updated name will be applied immediately across the leaderboard and attendance roster."}
              </p>
            </div>

            {editNameError && (
              <div className="p-3 rounded-lg text-xs font-semibold bg-[#FAF0F0] text-[#8C2929]">
                {editNameError}
              </div>
            )}

            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1">
                  {language === "ar" ? "الاسم ثلاثي أو رباعي" : "Full Name"}
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder={language === "ar" ? "أدخل اسمك بالكامل..." : "Enter your full name..."}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-lg transition-colors cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={editNameLoading || !newFullName.trim()}
                  className="px-4 py-2 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {editNameLoading ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Today's Session QR Modal (Camera on church screen) */}
      {showScanSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E4E0D5] p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#E4E0D5]">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#233D30] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#B58A3A]" />
                  <span>
                    {language === "ar" ? "مسح رمز تسبحة اليوم" : "Scan Today's Session QR"}
                  </span>
                </h3>
                <p className="text-xs text-[#77786F] mt-1 leading-snug">
                  {language === "ar"
                    ? "وجّه كاميرا هاتفك نحو شاشة الكنيسة لمسح رمز التسبحة المعروض وتسجيل حضورك."
                    : "Point your camera at the church screen to scan the active session QR code."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScanSessionModal(false)}
                className="p-1 rounded-lg text-[#77786F] hover:bg-[#EFEDE5] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Optional / No double-count Notice */}
            <div className="p-3 rounded-xl bg-[#FAF5EA] border border-[#B58A3A]/40 text-xs text-[#252922] space-y-1">
              <span className="font-bold block text-[#B58A3A]">
                {language === "ar" ? "نظام اختياري وبديل:" : "Optional Attendance Method:"}
              </span>
              <p className="text-[11px] text-[#77786F] leading-relaxed">
                {language === "ar"
                  ? "هذا الخيار اختياري؛ إذا قام الخادم بمسح بطاقتك الشخصية عند الباب، فلن يتكرر الحضور (يُحسب مرة واحدة فقط)."
                  : "If a church servant already marked your attendance at the door, it will not double-count."}
              </p>
            </div>

            {/* Result Feedback Banner */}
            {sessionScanResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold leading-normal flex items-start gap-2.5 ${sessionScanResult.alreadyRecorded
                  ? "bg-[#FAF5EA] text-[#B58A3A] border border-[#B58A3A]"
                  : sessionScanResult.success
                    ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]"
                    : "bg-[#FAF0F0] text-[#8C2929] border border-[#8C2929]"
                  }`}
              >
                {sessionScanResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span>{sessionScanResult.message}</span>
                  {sessionScanResult.alreadyRecorded && (
                    <span className="block text-[11px] font-normal text-[#77786F] mt-0.5">
                      {language === "ar"
                        ? "حضورك مسجل مسبقاً لهذا السبت وسلسلتك محفوظة بشكل طبيعي."
                        : "Your attendance is already recorded for this session."}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Active Camera Scanner Component */}
            <div className="rounded-xl overflow-hidden border border-[#E4E0D5] bg-black">
              <CameraQRScanner
                scannerId="session-screen-qr-scanner"
                isActive={showScanSessionModal}
                onScanSuccess={(decodedText) => handleScanSessionQr(decodedText)}
              />
            </div>

            {/* Manual Code Fallback */}
            <div className="pt-2 border-t border-[#E4E0D5] space-y-2">
              <label className="block text-[11px] font-semibold text-[#77786F]">
                {language === "ar"
                  ? "أو أدخل رمز التسبحة المعروض يدوياً:"
                  : "Or enter the displayed session token manually:"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualSessionToken}
                  onChange={(e) => setManualSessionToken(e.target.value)}
                  placeholder={language === "ar" ? "أدخل الرمز هنا..." : "Enter token..."}
                  className="flex-1 text-xs p-2 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  disabled={sessionScanLoading || !manualSessionToken.trim()}
                  onClick={() => handleScanSessionQr(manualSessionToken)}
                  className="px-3.5 py-2 text-xs font-bold bg-[#233D30] text-white rounded-lg hover:bg-[#192D24] transition-colors cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                >
                  {sessionScanLoading ? t("common.loading") : (language === "ar" ? "تسجيل" : "Submit")}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowScanSessionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-lg transition-colors cursor-pointer"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker Library Modal */}
      {showAvatarPickerModal && member && (
        <AvatarPickerModal
          isOpen={showAvatarPickerModal}
          onClose={() => setShowAvatarPickerModal(false)}
          memberId={member.id}
          currentAvatarUrl={member.avatarUrl}
          memberName={cleanMemberName}
          onAvatarSaved={(newUrl) => {
            setData((prev: any) => ({
              ...prev,
              member: {
                ...prev.member,
                avatarUrl: newUrl,
              },
            }));
            fetchDashboardData();
            window.dispatchEvent(new CustomEvent("avatarChanged", { detail: { avatarUrl: newUrl } }));
          }}
        />
      )}
    </div>
  );
}
