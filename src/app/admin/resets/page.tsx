"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Flame,
  Calendar,
} from "lucide-react";

export default function StreakResetsAdminPage() {
  const { language, t } = useLanguage();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/streak-resets");
      const json = await res.json();
      setRequests(json.requests || []);
    } catch {}
    setLoading(false);
  };

  const handleReview = async (requestId: string, decision: "APPROVED" | "REJECTED") => {
    setActionError(null);

    try {
      const res = await fetch("/api/streak-resets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          decision,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      fetchRequests();
    } catch (err: any) {
      setActionError(
        err.message === "CANNOT_APPROVE_OWN_REQUEST" || err.message === "CANNOT_APPROVE_SELF_REQUESTED"
          ? t("streaks.cannotApproveOwn")
          : err.message || t("common.error")
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#8C2929]" />
            <span>{t("streaks.resetRequestsTitle")}</span>
          </h1>
          <p className="text-xs text-[#77786F] mt-1">
            {language === "ar"
              ? "مراجعة غياب المخدومين: قبول العذر واستمرار السلسلة، أو اعتماد تصفيرها"
              : "Review member absences: excuse and preserve streak, or confirm streak reset"}
          </p>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl bg-[#FAF0F0] border border-[#8C2929]/20 text-[#8C2929] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.loading")}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {language === "ar" ? "لا توجد طلبات معلقة حالياً" : "No pending requests"}
            </div>
          ) : (
            <div className="divide-y divide-[#E4E0D5]/70">
              {requests.map((req) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                const isRejected = req.status === "REJECTED";

                return (
                  <div
                    key={req.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF5EA]/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-[#252922]">
                          {req.member.fullName}
                        </h4>
                        <span className="text-[11px] text-[#77786F] font-mono">
                          {req.member.phone}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isPending
                              ? "bg-[#FAF5EA] text-[#B58A3A] border border-[#B58A3A]/30"
                              : isApproved
                              ? "bg-[#FAF0F0] text-[#8C2929] border border-[#8C2929]/20"
                              : "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                          }`}
                        >
                          {t(`statuses.${req.status}`)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#77786F]">
                        <span className="font-mono text-[#B58A3A] font-bold">
                          {t("streaks.previousStreak")}: {req.previousStreak}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[#77786F]">
                          {new Date(req.session.date).toLocaleDateString(
                            language === "ar" ? "ar-EG" : "en-US"
                          )}
                        </span>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(req.id, "REJECTED")}
                          className="px-3 py-1.5 rounded-lg bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold transition-colors shadow-xs"
                        >
                          {t("streaks.rejectReset")}
                        </button>
                        <button
                          onClick={() => handleReview(req.id, "APPROVED")}
                          className="px-3 py-1.5 rounded-lg border border-[#8C2929] text-[#8C2929] hover:bg-[#FAF0F0] text-xs font-bold transition-colors"
                        >
                          {t("streaks.approveReset")}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-mono font-semibold text-[#77786F]">
                        {isApproved ? t("streaks.approveReset") : t("streaks.rejectReset")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
