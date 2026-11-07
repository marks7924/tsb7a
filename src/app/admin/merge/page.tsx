"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { CopticCross } from "@/components/CopticCross";
import {
  GitMerge,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";
import { MemberSearchSelect } from "@/components/MemberSearchSelect";

export default function MergeAccountsPage() {
  const { language, t } = useLanguage();

  const [members, setMembers] = useState<any[]>([]);
  const [survivingId, setSurvivingId] = useState("");
  const [duplicateId, setDuplicateId] = useState("");

  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [conflictChoices, setConflictChoices] = useState<Record<string, "PRESENT" | "ABSENT">>({});

  const [executing, setExecuting] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberList();
  }, []);

  const fetchMemberList = async () => {
    try {
      const res = await fetch("/api/members");
      const json = await res.json();
      setMembers(json.members || []);
    } catch { }
  };

  const handlePreviewMerge = async () => {
    if (!survivingId || !duplicateId) return;
    if (survivingId === duplicateId) {
      setMergeError(language === "ar" ? "لا يمكن دمج العضو مع نفسه!" : "Cannot merge the same member!");
      return;
    }

    setMergeError(null);
    setLoadingPreview(true);
    setPreview(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge-preview",
          survivingMemberId: survivingId,
          duplicateMemberId: duplicateId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setPreview(json);
      const initialChoices: Record<string, "PRESENT" | "ABSENT"> = {};
      json.conflictingSessions.forEach((c: any) => {
        initialChoices[c.sessionId] = "PRESENT";
      });
      setConflictChoices(initialChoices);
    } catch (err: any) {
      setMergeError(err.message || t("common.error"));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!survivingId || !duplicateId) return;
    setExecuting(true);
    setMergeError(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge-execute",
          survivingMemberId: survivingId,
          duplicateMemberId: duplicateId,
          conflictResolutions: conflictChoices,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setMergeSuccess(true);
      fetchMemberList();
    } catch (err: any) {
      setMergeError(err.message || t("common.error"));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
            <GitMerge className="w-5 h-5 text-[#233D30]" />
            <span>{t("merge.title")}</span>
          </h1>
          <p className="text-xs text-[#77786F] mt-1">
            {t("merge.subtitle")}
          </p>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-[#FAF5EA] border border-[#B58A3A]/40 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#B58A3A] shrink-0 mt-0.5" />
          <div className="text-xs text-[#252922] space-y-0.5">
            <p className="font-bold text-[#B58A3A]">{t("merge.attendanceDeduplicationNotice")}</p>
            <p className="text-[#77786F]">
              {language === "ar"
                ? "يتم الاحتفاظ بجميع الجوائز والأوسمة السابقة، وأرشفة السجل المكرر مع حفظ المعرفات التاريخية."
                : "All historical milestones are preserved. The duplicate record is securely archived without data loss."}
            </p>
          </div>
        </div>

        {mergeError && (
          <div className="p-3.5 rounded-xl bg-[#FAF0F0] border border-[#8C2929]/20 text-[#8C2929] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mergeError}</span>
          </div>
        )}

        {mergeSuccess ? (
          <div className="bg-white rounded-xl border border-[#233D30]/20 p-8 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#EEF5F1] text-[#233D30] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#252922]">
              {t("merge.successNotice")}
            </h3>
            <button
              onClick={() => {
                setMergeSuccess(false);
                setPreview(null);
                setSurvivingId("");
                setDuplicateId("");
              }}
              className="px-4 py-2 rounded-lg bg-[#233D30] text-white text-xs font-bold"
            >
              {language === "ar" ? "دمج حسابات أخرى" : "Merge Another"}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs p-6 space-y-6">
            {/* Member Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MemberSearchSelect
                label={`1. ${t("merge.primaryMember")}`}
                placeholder={language === "ar" ? "اختر أو ابحث عن العضو الأساسي (الباقي)..." : "Select surviving primary member..."}
                members={members}
                selectedMemberId={survivingId}
                onSelectMember={(id) => setSurvivingId(id)}
                disabledMemberId={duplicateId}
                badge="primary"
              />

              <MemberSearchSelect
                label={`2. ${t("merge.duplicateMember")}`}
                placeholder={language === "ar" ? "اختر أو ابحث عن العضو المكرر (للحذف والدمج)..." : "Select duplicate member..."}
                members={members}
                selectedMemberId={duplicateId}
                onSelectMember={(id) => setDuplicateId(id)}
                disabledMemberId={survivingId}
                badge="duplicate"
              />
            </div>

            <button
              onClick={handlePreviewMerge}
              disabled={!survivingId || !duplicateId || loadingPreview}
              className="px-4 py-2 rounded-lg bg-[#233D30] text-white text-xs font-bold shadow-xs hover:bg-[#192D24] transition-colors disabled:opacity-50"
            >
              {loadingPreview ? t("common.loading") : t("merge.reviewComparison")}
            </button>

            {/* Side-by-Side Comparison */}
            {preview && (
              <div className="pt-6 border-t border-[#EFEDE5] space-y-6">
                <h3 className="text-sm font-bold text-[#252922]">
                  {t("merge.reviewComparison")}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Surviving */}
                  <div className="p-4 rounded-lg border border-[#233D30]/40 bg-[#EEF5F1]/30 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#233D30] uppercase tracking-wider block">
                      ✓ {t("merge.primaryMember")}
                    </span>
                    <h4 className="text-sm font-bold text-[#252922]">
                      {preview.survivingMember.fullName}
                    </h4>
                    <p className="text-xs text-[#77786F] font-mono">{preview.survivingMember.phone}</p>
                    <div className="pt-2 text-xs text-[#252922] space-y-0.5 font-mono">
                      <p>
                        {language === "ar" ? "الحضور المسجل:" : "Attendance:"}{" "}
                        <span className="font-bold">
                          {preview.survivingMember.attendances.filter((a: any) => a.status === "PRESENT").length}
                        </span>
                      </p>
                      <p>
                        {language === "ar" ? "المكافآت:" : "Rewards:"}{" "}
                        <span className="font-bold">{preview.survivingMember.rewards.length}</span>
                      </p>
                    </div>
                  </div>

                  {/* Duplicate */}
                  <div className="p-4 rounded-lg border border-[#8C2929]/30 bg-[#FAF0F0]/30 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#8C2929] uppercase tracking-wider block">
                      ✗ {t("merge.duplicateMember")}
                    </span>
                    <h4 className="text-sm font-bold text-[#252922]">
                      {preview.duplicateMember.fullName}
                    </h4>
                    <p className="text-xs text-[#77786F] font-mono">{preview.duplicateMember.phone}</p>
                    <div className="pt-2 text-xs text-[#252922] space-y-0.5 font-mono">
                      <p>
                        {language === "ar" ? "الحضور المسجل:" : "Attendance:"}{" "}
                        <span className="font-bold">
                          {preview.duplicateMember.attendances.filter((a: any) => a.status === "PRESENT").length}
                        </span>
                      </p>
                      <p>
                        {language === "ar" ? "المكافآت:" : "Rewards:"}{" "}
                        <span className="font-bold">{preview.duplicateMember.rewards.length}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mathematical Union Proof Box */}
                <div className="p-4 rounded-lg bg-[#EFEDE5]/60 border border-[#E4E0D5] space-y-1.5 text-xs">
                  <h5 className="font-bold text-[#252922]">
                    {language === "ar" ? "حساب اتحاد الحضور الفعلي:" : "Attendance Union Rule:"}
                  </h5>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-[#77786F]">
                      {language === "ar" ? "المجموع الحسابي:" : "Raw Sum:"}{" "}
                      <span className="line-through">{preview.totalBeforeSum}</span>
                    </span>
                    <span>➔</span>
                    <span className="font-bold text-[#233D30] bg-[#EEF5F1] px-2 py-0.5 rounded-md border border-[#233D30]/20">
                      {language === "ar" ? "الاتحاد الفعلي (سبوت فريدة):" : "Unique Saturday Union:"}{" "}
                      {preview.uniqueSaturdaysUnionCount}
                    </span>
                  </div>
                </div>

                {/* Conflicts if any */}
                {preview.conflictingSessions.length > 0 && (
                  <div className="space-y-2 p-3.5 rounded-lg bg-[#FAF0F0] border border-[#8C2929]/30">
                    <h5 className="text-xs font-bold text-[#8C2929]">
                      {t("merge.conflictDetected")}
                    </h5>
                    {preview.conflictingSessions.map((c: any) => (
                      <div
                        key={c.sessionId}
                        className="p-2.5 bg-white rounded-md border border-[#E4E0D5] flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-[#252922]">
                          {new Date(c.sessionDate).toISOString().split("T")[0]}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-[#77786F]">
                            {language === "ar" ? "النتيجة المعتمدة:" : "Resolve as:"}
                          </label>
                          <select
                            value={conflictChoices[c.sessionId] || "PRESENT"}
                            onChange={(e) =>
                              setConflictChoices((prev) => ({
                                ...prev,
                                [c.sessionId]: e.target.value as "PRESENT" | "ABSENT",
                              }))
                            }
                            className="py-0.5 px-2 rounded-md border border-[#E4E0D5] font-bold"
                          >
                            <option value="PRESENT">{t("statuses.PRESENT")}</option>
                            <option value="ABSENT">{t("statuses.ABSENT")}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleExecuteMerge}
                  disabled={executing}
                  className="w-full py-2.5 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {executing ? t("common.loading") : t("merge.confirmMergeBtn")}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
