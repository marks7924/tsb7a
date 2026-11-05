"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import {
  Settings,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Activity,
  Save,
  RotateCcw,
  X,
  Trash2,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { language, t } = useLanguage();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all scores verification modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [verificationInput, setVerificationInput] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSettings, resLogs] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/activity-logs"),
      ]);

      const jsonSettings = await resSettings.json();
      const jsonLogs = await resLogs.json();

      setSettings(jsonSettings.settings || {});
      setLogs(jsonLogs.logs || []);
    } catch { }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchData();
    } catch (err: any) {
      setError(err.message || t("common.error"));
    }
  };

  const handleResetAllScores = async () => {
    const requiredConfirmation = language === "ar" ? "تصفير" : "RESET";
    if (verificationInput.trim().toUpperCase() !== requiredConfirmation.toUpperCase() && verificationInput.trim() !== "تصفير") {
      return;
    }

    setResetLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-all-scores" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setResetSuccess(json.message || (language === "ar" ? "تم تصفير جميع النقاط والسلاسل بنجاح" : "All scores reset successfully"));
      setShowResetModal(false);
      setVerificationInput("");
      fetchData();
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to reset scores");
    } finally {
      setResetLoading(false);
    }
  };

  const isConfirmed = verificationInput.trim() === "تصفير" || verificationInput.trim().toUpperCase() === "RESET";

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#B58A3A]" />
            <span>{language === "ar" ? "إعدادات منصة التسبحة" : "Tasbeha Platform Settings"}</span>
          </h1>
          <p className="text-xs text-[#77786F] mt-1">
            {language === "ar"
              ? "إعدادات الكنيسة، وتخصيص دورات المكافآت، وتصفير النقاط الشامل، وسجل الرقابة"
              : "System configurations, reward thresholds, score resets, and audit trail"}
          </p>
        </div>

        {saved && (
          <div className="p-3 rounded-lg bg-[#EEF5F1] border border-[#233D30]/20 text-[#233D30] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully"}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3.5 rounded-xl bg-[#FAF5EA] border border-[#B58A3A] text-[#233D30] text-xs font-bold flex items-center gap-2.5 shadow-xs">
            <RotateCcw className="w-4 h-4 text-[#B58A3A]" />
            <span>{resetSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-[#FAF0F0] border border-[#8C2929]/20 text-[#8C2929] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE5]">
            <h3 className="font-bold text-xs sm:text-sm text-[#252922]">
              {language === "ar" ? "البيانات الأساسية وتوقيتات التسبحة" : "Core System Settings"}
            </h3>
            <span className="text-[11px] text-[#77786F]">
              {settings["church_name_ar"] || "كنيسة الشهيد العظيم أبي سيفين"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#252922] mb-1">
                {language === "ar" ? "اسم الكنيسة (عربي)" : "Church Name (Arabic)"}
              </label>
              <input
                type="text"
                value={settings["church_name_ar"] || ""}
                onChange={(e) => setSettings({ ...settings, church_name_ar: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252922] mb-1">
                {language === "ar" ? "اسم الكنيسة (إنجليزي)" : "Church Name (English)"}
              </label>
              <input
                type="text"
                value={settings["church_name_en"] || ""}
                onChange={(e) => setSettings({ ...settings, church_name_en: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] text-[#252922]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252922] mb-1">
                {language === "ar" ? "المنطقة الزمنية المعتمدة" : "Configured Timezone"}
              </label>
              <input
                type="text"
                value={settings["timezone"] || "Africa/Cairo"}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono text-[#252922]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252922] mb-1">
                {language === "ar" ? "عدد أسابيع السلسلة لكل مكافأة (الافتراضي 4)" : "Consecutive Weeks per Reward"}
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={settings["default_reward_threshold"] || "4"}
                onChange={(e) => setSettings({ ...settings, default_reward_threshold: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono text-[#252922]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#252922] mb-1">
                {language === "ar" ? "صلاحية رمز QR (بالدقائق)" : "QR Token Expiry (Minutes)"}
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                value={settings["qr_expiry_minutes"] || "180"}
                onChange={(e) => setSettings({ ...settings, qr_expiry_minutes: e.target.value })}
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-mono text-[#252922]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t("common.save")}</span>
            </button>
          </div>
        </form>

        {/* Danger Zone: Reset All Scores */}
        <div className="bg-white rounded-xl border border-[#8C2929]/30 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#FAF0F0]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF0F0] text-[#8C2929] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#8C2929]">
                {language === "ar" ? "منطقة العمليات الحساسة (Danger Zone)" : "Danger Zone"}
              </h3>
              <p className="text-[11px] text-[#77786F]">
                {language === "ar"
                  ? "عمليات تصفير البيانات الشاملة التي تتطلب تأكيداً كتابياً مسبقاً"
                  : "Critical operations requiring written confirmation"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF0F0]/50 border border-[#8C2929]/20">
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-[#252922]">
                {language === "ar" ? "تصفير جميع النقاط والسلاسل (Reset All Scores)" : "Reset All Scores to 0"}
              </h4>
              <p className="text-xs text-[#77786F] max-w-xl leading-relaxed">
                {language === "ar"
                  ? "إعادة ضبط سلاسل الحضور، إجمالي الحضور، والمكافآت لجميع المخدومين والخدام إلى الصفر فوراً (مناسب لبدء موسم جديد أو بداية فترة جديدة)."
                  : "Reset all current streaks, total attendance, and milestone rewards to 0 across the church platform."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerificationInput("");
                setShowResetModal(true);
              }}
              className="px-4 py-2.5 rounded-lg bg-[#8C2929] hover:bg-[#721C1C] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{language === "ar" ? "تصفير جميع النقاط إلى 0" : "Reset All to 0"}</span>
            </button>
          </div>
        </div>

        {/* Activity Logs Ledger */}
        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE5]">
            <h3 className="font-bold text-xs sm:text-sm text-[#252922] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#233D30]" />
              <span>{t("nav.activityLogs")}</span>
            </h3>
            <span className="text-[11px] font-mono text-[#77786F]">
              {logs.length} {language === "ar" ? "عملية مدققة" : "logged events"}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E0D5]/70">
            {logs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#252922]">{log.action}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EFEDE5] border border-[#E4E0D5] text-[#77786F]">
                      {log.targetEntity}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#77786F] font-mono">
                    {new Date(log.createdAt).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                  </span>
                </div>
                <p className="text-[#77786F] text-[11px]">
                  {language === "ar" ? "المنفذ:" : "Actor:"}{" "}
                  <strong className="text-[#252922]">{log.actorName || "النظام"}</strong>{" "}
                  {log.actorRole ? `(${log.actorRole})` : ""}
                  {log.reason ? ` — ${log.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Verification Modal for Reset All Scores */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#8C2929]/40 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-[#FAF0F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0F0] text-[#8C2929] flex items-center justify-center border border-[#8C2929]/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#8C2929]">
                    {language === "ar" ? "تأكيد تصفير جميع النقاط والسلاسل" : "Confirm Reset All Scores"}
                  </h3>
                  <span className="text-[11px] text-[#77786F]">
                    {language === "ar" ? "عملية حساسة ولا يمكن التراجع عنها" : "Sensitive irreversible action"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-md text-[#77786F] hover:bg-[#EFEDE5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF0F0] border border-[#8C2929]/30 text-xs text-[#8C2929] space-y-1.5 leading-relaxed">
              <p className="font-bold">
                {language === "ar"
                  ? "تحذير: سيتم تصفير ما يلي لجميع مخدومي وخدام الكنيسة:"
                  : "Warning: The following will be reset to 0 for all church members:"}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#77786F]">
                <li>{language === "ar" ? "جميع سلاسل الحضور المتتالية (Current Streaks)" : "All current streaks"}</li>
                <li>{language === "ar" ? "إجمالي الحضور التاريخي والسنوي (Total Attendance)" : "Total and annual attendance"}</li>
                <li>{language === "ar" ? "سجلات الحضور السابقة ومكافآت التميز السابقة" : "Previous attendance and milestone reward records"}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#252922]">
                {language === "ar" ? (
                  <span>
                    للتأكيد، يرجى كتابة كلمة <span className="text-[#8C2929] font-mono bg-[#FAF0F0] px-1.5 py-0.5 rounded">تصفير</span> في الحقل أدناه:
                  </span>
                ) : (
                  <span>
                    To confirm, please type <span className="text-[#8C2929] font-mono bg-[#FAF0F0] px-1.5 py-0.5 rounded">RESET</span> below:
                  </span>
                )}
              </label>
              <input
                type="text"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                placeholder={language === "ar" ? "اكتب: تصفير" : "Type: RESET"}
                className="w-full text-xs p-2.5 rounded-lg border border-[#E4E0D5] bg-[#F7F6F1] font-bold text-[#252922] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E0D5]">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg border border-[#E4E0D5] text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={!isConfirmed || resetLoading}
                onClick={handleResetAllScores}
                className="px-4 py-2 rounded-lg bg-[#8C2929] hover:bg-[#721C1C] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {resetLoading ? t("common.loading") : (language === "ar" ? "تأكيد التصفير النهائي" : "Confirm Reset All")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

