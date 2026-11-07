"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  Users,
  Search,
  KeyRound,
  Shield,
  Copy,
  Check,
  UserCheck,
  UserX,
  AlertCircle,
  Flame,
  Award,
  Edit,
  Trash2,
  Camera,
  Plus,
  Minus,
  Sparkles,
  Upload,
  RefreshCw,
  X,
} from "lucide-react";
import { AVATAR_LIBRARY, getRandomAvatarForGender } from "@/lib/avatars";

export default function MembersAdminPage() {
  const { language, t } = useLanguage();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Password Generation Modal State
  const [pwdTarget, setPwdTarget] = useState<any | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdMode, setPwdMode] = useState<"PHONE" | "CUSTOM" | "RANDOM">("PHONE");
  const [customPwd, setCustomPwd] = useState<string>("");

  // Score Adjustment Modal State
  const [scoreTarget, setScoreTarget] = useState<any | null>(null);
  const [scoreField, setScoreField] = useState<"currentStreak" | "totalAttendance">("currentStreak");
  const [scoreVal, setScoreVal] = useState<string>("");
  const [scoreLoading, setScoreLoading] = useState(false);

  // Edit Member Modal State
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", role: "MEMBER" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Avatar Management Modal State
  const [avatarTarget, setAvatarTarget] = useState<any | null>(null);
  const [avatarUrlChoice, setAvatarUrlChoice] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Delete Member Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchMembers();
    fetchCurrentUser();
  }, [search]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth");
      const json = await res.json();
      setCurrentUser(json.user);
    } catch { }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch { }
    setLoading(false);
  };

  const handleGeneratePassword = async () => {
    if (!pwdTarget) return;
    setPwdLoading(true);
    setPwdError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-password",
          targetMemberId: pwdTarget.id,
          passwordType: pwdMode,
          customPassword: customPwd,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setGeneratedPassword(json.generatedPassword);
      fetchMembers();
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAdjustScore = async (mode: "SET" | "ADD" | "SUBTRACT", val?: number) => {
    if (!scoreTarget) return;
    const finalVal = val !== undefined ? val : parseInt(scoreVal, 10);
    if (isNaN(finalVal)) return;

    setScoreLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust-score",
          targetMemberId: scoreTarget.id,
          field: scoreField,
          mode,
          value: finalVal,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(language === "ar" ? "تم تحديث النقاط بنجاح!" : "Score updated successfully!");
      setScoreTarget(null);
      setScoreVal("");
      fetchMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to adjust score");
    } finally {
      setScoreLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-member",
          targetMemberId: editTarget.id,
          fullName: editForm.fullName,
          phone: editForm.phone,
          role: editForm.role,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(language === "ar" ? "تم تحديث بيانات العضو بنجاح!" : "Member updated successfully!");
      setEditTarget(null);
      fetchMembers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update member");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveAvatar = async (avatarUrl: string | null) => {
    if (!avatarTarget) return;
    setAvatarLoading(true);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-avatar",
          targetMemberId: avatarTarget.id,
          avatarUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(language === "ar" ? "تم تعيين الصورة الرمزية بنجاح!" : "Avatar assigned successfully!");
      setAvatarTarget(null);
      fetchMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to update avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-member",
          targetMemberId: deleteTarget.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(language === "ar" ? "تم حذف العضو وكافة بياناته نهائياً" : "Member deleted successfully");
      setDeleteTarget(null);
      fetchMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to delete member");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E0D5]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#233D30]" />
              <span>{t("nav.members")}</span>
            </h1>
            <p className="text-xs text-[#77786F] mt-1">
              {language === "ar"
                ? "سجل المخدومين والخدام وإدارة كلمات المرور الرسمية لحسابات التسبحة"
                : "Manage church members, servants, and official passwords"}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-[#77786F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full text-xs py-1.5 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] bg-white text-[#252922] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Member Directory Ledger */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.loading")}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.noData")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right ltr:text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4E0D5] dark:border-[#232740] bg-[#EFEDE5]/60 dark:bg-[#161828] text-[11px] font-bold text-[#77786F] dark:text-[#94A3B8] uppercase tracking-wider">
                    <th className="py-3 px-4">{t("common.name")}</th>
                    <th className="py-3 px-4">{t("common.phone")}</th>
                    <th className="py-3 px-4">{t("common.role")}</th>
                    <th className="py-3 px-4 text-center">
                      {language === "ar" ? "حساب الدخول" : "Account Status"}
                    </th>
                    <th className="py-3 px-4 text-center">{t("streaks.currentStreak")}</th>
                    <th className="py-3 px-4 text-center">{t("streaks.allTimeAttendance")}</th>
                    <th className="py-3 px-4 text-center">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D5]/70 dark:divide-[#232740]">
                  {members.map((m) => {
                    const hasAccount = !!m.loginAccount;

                    return (
                      <tr key={m.id} className="hover:bg-[#FAF5EA]/30 dark:hover:bg-[#1A1D30] transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-[#252922] dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar
                              memberId={m.id}
                              avatarUrl={m.avatarUrl}
                              fullName={m.fullName}
                              size="sm"
                            />
                            <span>{m.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#77786F] dark:text-[#94A3B8]">
                          {m.phone}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFEDE5] text-[#233D30] border border-[#E4E0D5]">
                            {m.role === "DEVELOPER" && currentUser?.role !== "DEVELOPER"
                              ? t("roles.ADMIN")
                              : t(`roles.${m.role}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasAccount ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF5F1] text-[#233D30]">
                              <UserCheck className="w-3 h-3 stroke-[2.5]" />
                              {language === "ar" ? "مرتبط" : "Linked"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EFEDE5] text-[#77786F]">
                              <UserX className="w-3 h-3" />
                              {language === "ar" ? "كشف فقط" : "Sheet Only"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span className="font-bold text-[#B58A3A]">
                            {m.stats?.currentStreak || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-xs text-[#233D30]">
                          {m.stats?.totalAttendance || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Quick Score Adjuster */}
                            <button
                              onClick={() => {
                                setScoreTarget(m);
                                setScoreField("currentStreak");
                                setScoreVal(String(m.stats?.currentStreak || 0));
                              }}
                              title={language === "ar" ? "تعديل السلسلة أو النقاط (+1 / -1 / تحديد)" : "Adjust score/streak"}
                              className="p-1.5 rounded-lg border border-[#E4E0D5] bg-[#FAF5EA] hover:bg-[#F3EAD3] text-[#B58A3A] transition-colors cursor-pointer"
                            >
                              <Flame className="w-4 h-4" />
                            </button>

                            {/* Avatar Picker / Assign */}
                            <button
                              onClick={() => {
                                setAvatarTarget(m);
                                setAvatarUrlChoice(m.avatarUrl || null);
                              }}
                              title={language === "ar" ? "تغيير الصورة الرمزية" : "Change avatar"}
                              className="p-1.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-[#233D30] transition-colors cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                            </button>

                            {/* Edit Member Info */}
                            <button
                              onClick={() => {
                                setEditTarget(m);
                                setEditForm({
                                  fullName: m.fullName,
                                  phone: m.phone,
                                  role: m.role,
                                });
                                setEditError(null);
                              }}
                              title={language === "ar" ? "تعديل بيانات العضو" : "Edit member details"}
                              className="p-1.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-[#252922] transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Password Gen (Admin/Developer only) */}
                            {(currentUser?.role === "ADMIN" || currentUser?.role === "DEVELOPER") && (
                              <button
                                onClick={() => {
                                  setPwdTarget(m);
                                  setGeneratedPassword(null);
                                  setPwdError(null);
                                }}
                                title={hasAccount ? (language === "ar" ? "إعادة تعيين كلمة السر" : "Reset password") : (language === "ar" ? "توليد كلمة سر" : "Generate password")}
                                className="p-1.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] text-[#B58A3A] transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Member (Never for Developer; Mod cannot delete Admin) */}
                            {!(m.role === "DEVELOPER" || m.isDeveloperHidden) &&
                              !(currentUser?.role === "MODERATOR" && m.role === "ADMIN") && (
                                <button
                                  onClick={() => setDeleteTarget(m)}
                                  title={language === "ar" ? "حذف العضو نهائياً" : "Delete member"}
                                  className="p-1.5 rounded-lg border border-[#E4E0D5] bg-[#FAF0F0] hover:bg-[#F3D5D5] text-[#8C2929] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Generate Password Modal */}
        {pwdTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-[#E4E0D5] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#252922]">
                {t("passwordGen.title")}
              </h3>

              <div className="p-3 rounded-lg bg-[#F7F6F1] border border-[#E4E0D5] space-y-1.5 text-xs">
                <p>
                  <strong className="text-[#252922]">{language === "ar" ? "العضو:" : "Member:"}</strong>{" "}
                  {pwdTarget.fullName}
                </p>
                <p>
                  <strong className="text-[#252922]">{language === "ar" ? "اسم المستخدم (رقم الهاتف للدخول):" : "Login Username (Phone):"}</strong>{" "}
                  <span className="font-mono font-bold text-[#233D30]">{pwdTarget.phone}</span>
                </p>
                {pwdTarget.loginAccount?.email && (
                  <p>
                    <strong className="text-[#252922]">{language === "ar" ? "البريد الإلكتروني:" : "Email:"}</strong>{" "}
                    <span className="font-mono text-[#77786F]">{pwdTarget.loginAccount.email}</span>
                  </p>
                )}
              </div>

              {pwdError && (
                <div className="p-3 rounded-lg bg-[#FAF0F0] text-[#8C2929] text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              {generatedPassword ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#233D30] font-semibold">
                    {t("passwordGen.resultNotice")}
                  </p>
                  <div className="p-3 rounded-lg bg-[#EEF5F1] border border-[#233D30]/40 flex items-center justify-between font-mono text-sm font-bold text-[#252922]">
                    <span>{generatedPassword}</span>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md bg-white border border-[#233D30]/30 text-[#233D30] hover:bg-[#EEF5F1]"
                      title={t("common.copy")}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setPwdTarget(null)}
                      className="w-full py-2 rounded-lg bg-[#233D30] text-white text-xs font-bold"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#252922] mb-1.5">
                      {language === "ar" ? "اختر طريقة تحديد كلمة المرور:" : "Choose Password Method:"}
                    </label>
                    <div className="space-y-2 text-xs">
                      {/* Option 1: Phone Number */}
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          pwdMode === "PHONE"
                            ? "bg-[#FAF5EA] border-[#B58A3A] ring-1 ring-[#B58A3A]/40"
                            : "bg-[#F7F6F1] border-[#E4E0D5] hover:bg-[#EFEDE5]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={pwdMode === "PHONE"}
                          onChange={() => setPwdMode("PHONE")}
                          className="mt-0.5 text-[#B58A3A]"
                        />
                        <div>
                          <span className="font-bold text-[#252922] block">
                            {language === "ar"
                              ? "رقم الهاتف ككلمة مرور (موصى به لسهولة الدخول)"
                              : "Phone number as password (Recommended)"}
                          </span>
                          <span className="text-[11px] text-[#77786F] font-mono block mt-0.5">
                            {pwdTarget.phone.startsWith("+20") ? "0" + pwdTarget.phone.slice(3) : pwdTarget.phone}
                          </span>
                        </div>
                      </label>

                      {/* Option 2: Custom Password */}
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          pwdMode === "CUSTOM"
                            ? "bg-[#FAF5EA] border-[#B58A3A] ring-1 ring-[#B58A3A]/40"
                            : "bg-[#F7F6F1] border-[#E4E0D5] hover:bg-[#EFEDE5]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={pwdMode === "CUSTOM"}
                          onChange={() => setPwdMode("CUSTOM")}
                          className="mt-0.5 text-[#B58A3A]"
                        />
                        <div className="flex-1">
                          <span className="font-bold text-[#252922] block">
                            {language === "ar" ? "كلمة مرور محددة من اختيارك" : "Set a custom password"}
                          </span>
                          {pwdMode === "CUSTOM" && (
                            <input
                              type="text"
                              value={customPwd}
                              onChange={(e) => setCustomPwd(e.target.value)}
                              placeholder={language === "ar" ? "اكتب كلمة السر هنا..." : "Type custom password..."}
                              className="mt-2 w-full text-xs py-1.5 px-2.5 rounded-lg border border-[#E4E0D5] bg-white font-mono text-[#252922]"
                              autoFocus
                            />
                          )}
                        </div>
                      </label>

                      {/* Option 3: Strong Random */}
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          pwdMode === "RANDOM"
                            ? "bg-[#FAF5EA] border-[#B58A3A] ring-1 ring-[#B58A3A]/40"
                            : "bg-[#F7F6F1] border-[#E4E0D5] hover:bg-[#EFEDE5]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="pwdMode"
                          checked={pwdMode === "RANDOM"}
                          onChange={() => setPwdMode("RANDOM")}
                          className="mt-0.5 text-[#B58A3A]"
                        />
                        <div>
                          <span className="font-bold text-[#252922] block">
                            {language === "ar" ? "توليد كلمة سر عشوائية قوية" : "Generate strong random password"}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E0D5]">
                    <button
                      type="button"
                      onClick={() => setPwdTarget(null)}
                      className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={handleGeneratePassword}
                      disabled={pwdLoading || (pwdMode === "CUSTOM" && customPwd.trim().length < 4)}
                      className="px-4 py-2 rounded-lg bg-[#B58A3A] hover:bg-[#96702A] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {pwdLoading
                        ? t("common.loading")
                        : pwdMode === "PHONE"
                        ? language === "ar"
                          ? "تعيين رقم الهاتف ككلمة سر"
                          : "Set Phone as Password"
                        : pwdMode === "CUSTOM"
                        ? language === "ar"
                          ? "حفظ كلمة السر المحددة"
                          : "Save Custom Password"
                        : t("passwordGen.generateBtn")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. Score Adjuster Modal (+1, -1, Set) */}
        {scoreTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E4E0D5] p-6 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E4E0D5] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF5EA] text-[#B58A3A] flex items-center justify-center border border-[#B58A3A]/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#252922]">
                    {language === "ar" ? "تعديل النقاط والسلسلة فوراً" : "Instant Score & Streak Adjustment"}
                  </h3>
                </div>
                <button onClick={() => setScoreTarget(null)} className="p-1 rounded-md text-[#77786F] hover:bg-[#EFEDE5]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F1] border border-[#E4E0D5] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#252922]">{scoreTarget.fullName}</span>
                  <span className="font-mono text-[#77786F]">{scoreTarget.phone}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E4E0D5]/60 text-[11px]">
                  <div>
                    <span className="text-[#77786F]">{language === "ar" ? "السلسلة الحالية:" : "Current Streak:"} </span>
                    <strong className="text-[#B58A3A] font-mono text-xs">{scoreTarget.stats?.currentStreak || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[#77786F]">{language === "ar" ? "إجمالي الحضور:" : "Total Attendance:"} </span>
                    <strong className="text-[#233D30] font-mono text-xs">{scoreTarget.stats?.totalAttendance || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Field to adjust */}
              <div>
                <label className="block text-xs font-semibold text-[#252922] mb-1.5">
                  {language === "ar" ? "اختر الحقل المراد تعديله:" : "Field to adjust:"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScoreField("currentStreak");
                      setScoreVal(String(scoreTarget.stats?.currentStreak || 0));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${scoreField === "currentStreak"
                      ? "bg-[#233D30] text-white border-[#233D30]"
                      : "bg-white text-[#252922] border-[#E4E0D5] hover:bg-[#FAF5EA]"
                      }`}
                  >
                    {t("streaks.currentStreak")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScoreField("totalAttendance");
                      setScoreVal(String(scoreTarget.stats?.totalAttendance || 0));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${scoreField === "totalAttendance"
                      ? "bg-[#233D30] text-white border-[#233D30]"
                      : "bg-white text-[#252922] border-[#E4E0D5] hover:bg-[#FAF5EA]"
                      }`}
                  >
                    {t("streaks.allTimeAttendance")}
                  </button>
                </div>
              </div>

              {/* Quick Increment Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#77786F] block">
                  {language === "ar" ? "إجراءات سريعة بنقرة واحدة:" : "1-Click Quick Adjustments:"}
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    disabled={scoreLoading}
                    onClick={() => handleAdjustScore("ADD", 1)}
                    className="py-2 rounded-lg border border-[#233D30]/30 bg-[#EEF5F1] hover:bg-[#233D30] hover:text-white text-[#233D30] font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 1
                  </button>
                  <button
                    disabled={scoreLoading}
                    onClick={() => handleAdjustScore("ADD", 2)}
                    className="py-2 rounded-lg border border-[#233D30]/30 bg-[#EEF5F1] hover:bg-[#233D30] hover:text-white text-[#233D30] font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 2
                  </button>
                  <button
                    disabled={scoreLoading}
                    onClick={() => handleAdjustScore("SUBTRACT", 1)}
                    className="py-2 rounded-lg border border-[#8C2929]/30 bg-[#FAF0F0] hover:bg-[#8C2929] hover:text-white text-[#8C2929] font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" /> 1
                  </button>
                  <button
                    disabled={scoreLoading}
                    onClick={() => handleAdjustScore("SUBTRACT", 2)}
                    className="py-2 rounded-lg border border-[#8C2929]/30 bg-[#FAF0F0] hover:bg-[#8C2929] hover:text-white text-[#8C2929] font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" /> 2
                  </button>
                </div>
              </div>

              {/* Set Exact Score */}
              <div className="pt-2 border-t border-[#E4E0D5]">
                <label className="block text-xs font-semibold text-[#252922] mb-1.5">
                  {language === "ar" ? "أو تعيين القيمة مباشرة (Set to):" : "Or set exact value:"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={scoreVal}
                    onChange={(e) => setScoreVal(e.target.value)}
                    placeholder="مثال: 4"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] font-mono font-bold"
                  />
                  <button
                    disabled={scoreLoading || !scoreVal}
                    onClick={() => handleAdjustScore("SET")}
                    className="px-4 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {language === "ar" ? "تطبيق القيمة" : "Set"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Edit Member Details Modal */}
        {editTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E4E0D5] p-6 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E4E0D5] pb-3">
                <h3 className="text-sm font-bold text-[#252922] flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#233D30]" />
                  <span>{language === "ar" ? "تعديل بيانات العضو" : "Edit Member"}</span>
                </h3>
                <button onClick={() => setEditTarget(null)} className="p-1 rounded-md text-[#77786F] hover:bg-[#EFEDE5]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-lg bg-[#FAF0F0] text-[#8C2929] text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-[#252922] mb-1">{t("common.name")}</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#252922] mb-1">{t("common.phone")}</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922] font-mono focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#252922] mb-1">{t("common.role")}</label>
                  {editTarget?.role === "DEVELOPER" || editTarget?.isDeveloperHidden ? (
                    <div className="py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#EFEDE5] text-[#77786F] font-bold">
                      {currentUser?.role === "DEVELOPER" ? "DEVELOPER" : t("roles.ADMIN")}
                    </div>
                  ) : (
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922]"
                    >
                      <option value="MEMBER">{t("roles.MEMBER")}</option>
                      <option value="MODERATOR">{t("roles.MODERATOR")}</option>
                      {(currentUser?.role === "ADMIN" || currentUser?.role === "DEVELOPER") && (
                        <option value="ADMIN">{t("roles.ADMIN")}</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E0D5]">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {editLoading ? t("common.loading") : t("common.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Assign / Edit Avatar Modal */}
        {avatarTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-[#E4E0D5] p-5 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E4E0D5] pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#233D30]" />
                  <h3 className="text-sm font-bold text-[#252922]">
                    {language === "ar" ? `تغيير الصورة الرمزية لـ ${avatarTarget.fullName}` : `Assign Avatar for ${avatarTarget.fullName}`}
                  </h3>
                </div>
                <button onClick={() => setAvatarTarget(null)} className="p-1 rounded-md text-[#77786F] hover:bg-[#EFEDE5]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview & Quick Random Actions */}
              <div className="p-3 rounded-xl bg-[#F7F6F1] border border-[#E4E0D5] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MemberAvatar
                    memberId={avatarTarget.id}
                    avatarUrl={avatarUrlChoice}
                    fullName={avatarTarget.fullName}
                    size="lg"
                    className="border-2 border-[#B58A3A]"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-[#252922]">{avatarTarget.fullName}</h4>
                    <span className="text-[11px] text-[#77786F] font-mono">{avatarTarget.phone}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const rand = getRandomAvatarForGender("MALE");
                      setAvatarUrlChoice(rand.url);
                    }}
                    className="py-1.5 px-2.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#FAF5EA] text-xs font-semibold text-[#252922] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>👦</span>
                    <span>{language === "ar" ? "ولد عشوائي" : "Random Boy"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const rand = getRandomAvatarForGender("FEMALE");
                      setAvatarUrlChoice(rand.url);
                    }}
                    className="py-1.5 px-2.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#FAF5EA] text-xs font-semibold text-[#252922] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>👧</span>
                    <span>{language === "ar" ? "بنت عشوائية" : "Random Girl"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvatarUrlChoice(null)}
                    className="py-1.5 px-2.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#FAF5EA] text-xs font-semibold text-[#77786F] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{language === "ar" ? "افتراضي" : "Reset"}</span>
                  </button>
                </div>
              </div>

              {/* Local Avatar Grid */}
              <div className="flex-1 overflow-y-auto space-y-2 p-1">
                <span className="text-xs font-bold text-[#252922] block">
                  {language === "ar" ? "اختر من المكتبة الرسمية (16 صورة):" : "Choose from library (16 avatars):"}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {AVATAR_LIBRARY.map((av) => {
                    const isSelected = avatarUrlChoice === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatarUrlChoice(av.url)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${isSelected
                          ? "bg-[#FAF5EA] border-[#B58A3A] ring-2 ring-[#B58A3A]/40"
                          : "bg-white border-[#E4E0D5] hover:bg-[#F7F6F1]"
                          }`}
                      >
                        <img src={av.url} alt={av.nameAr} className="w-10 h-10 rounded-full object-cover" />
                        <span className="text-[10px] font-semibold text-[#77786F] truncate max-w-full">
                          {language === "ar" ? av.nameAr : av.nameEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom Photo */}
              <div className="pt-2 border-t border-[#E4E0D5] flex items-center justify-between gap-3 text-xs">
                <label className="cursor-pointer inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] hover:bg-[#EFEDE5] font-semibold text-[#252922]">
                  <Upload className="w-3.5 h-3.5 text-[#B58A3A]" />
                  <span>{language === "ar" ? "رفع صورة مخصصة" : "Upload picture"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setAvatarUrlChoice(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarTarget(null)}
                    className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={avatarLoading}
                    onClick={() => handleSaveAvatar(avatarUrlChoice)}
                    className="px-4 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {avatarLoading ? t("common.loading") : t("common.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Delete Member Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E4E0D5] p-6 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 text-[#8C2929]">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0F0] flex items-center justify-center border border-[#8C2929]/20 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#252922]">
                    {language === "ar" ? "تأكيد حذف العضو نهائياً" : "Confirm Permanent Deletion"}
                  </h3>
                  <span className="text-xs text-[#8C2929] font-semibold">
                    {language === "ar" ? "تحذير: هذا الإجراء لا يمكن التراجع عنه!" : "Warning: This action cannot be undone!"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF0F0]/60 border border-[#8C2929]/20 space-y-2 text-xs">
                <p>
                  <strong className="text-[#252922]">{language === "ar" ? "اسم العضو:" : "Member Name:"}</strong>{" "}
                  <span className="font-bold">{deleteTarget.fullName}</span>
                </p>
                <p>
                  <strong className="text-[#252922]">{language === "ar" ? "رقم الهاتف:" : "Phone:"}</strong>{" "}
                  <span className="font-mono text-[#77786F]">{deleteTarget.phone}</span>
                </p>
                <p className="text-[11px] text-[#8C2929] leading-relaxed pt-1 border-t border-[#8C2929]/20">
                  {language === "ar"
                    ? "سيتم حذف كافة سجلات حضور التسبحة، وحساب الدخول، والمكافآت والأوسمة الخاصة بهذا العضو نهائياً من قاعدة البيانات."
                    : "All attendance records, credentials, streak progress, and rewards for this member will be permanently wiped from the database."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteMember}
                  className="px-4 py-2 rounded-lg bg-[#8C2929] hover:bg-[#6E1F1F] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {deleteLoading ? t("common.loading") : language === "ar" ? "نعم، احذف العضو نهائياً" : "Yes, Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 rtl:left-6 ltr:right-6 z-50 bg-[#233D30] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-[#B58A3A]/40 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
            <Check className="w-4 h-4 text-[#B58A3A]" />
            <span>{toast}</span>
          </div>
        )}
      </main>
    </div>
  );
}
