"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { Award, Gift, CheckCircle2, Search, Check } from "lucide-react";

export default function RewardsAdminPage() {
  const { language, t } = useLanguage();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/members");
      const json = await res.json();
      setMembers(json.members || []);
    } catch { }
    setLoading(false);
  };

  const handleDeliverReward = async (rewardId: string) => {
    try {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deliver-reward",
          rewardId,
        }),
      });
      fetchData();
    } catch { }
  };

  const allRewards = members.flatMap((m) =>
    (m.rewards || []).map((r: any) => ({
      ...r,
      memberName: m.fullName,
      memberPhone: m.phone,
    }))
  );

  const filtered = allRewards.filter(
    (r) =>
      r.memberName.toLowerCase().includes(search.toLowerCase().trim()) ||
      r.memberPhone.includes(search.trim())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E0D5]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
              <Gift className="w-5 h-5 text-[#233D30]" />
              <span>{t("nav.rewards")}</span>
            </h1>
            <p className="text-xs text-[#77786F] mt-1">
              {language === "ar"
                ? "إدارة هدايا ومكافآت التميز الأسبوعية، وتسجيل تسليم الهدايا للمواظبين"
                : "Manage weekly milestone rewards and track physical delivery"}
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

        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-[#77786F] text-xs">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
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
                    <th className="py-3 px-4 text-center">
                      {language === "ar" ? "المرحلة / السلسلة" : "Milestone"}
                    </th>
                    <th className="py-3 px-4 text-center">
                      {language === "ar" ? "تاريخ الاستحقاق" : "Earned Date"}
                    </th>
                    <th className="py-3 px-4 text-center">{t("common.status")}</th>
                    <th className="py-3 px-4 text-center">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D5]/70">
                  {filtered.map((r) => {
                    const isDelivered = r.status === "DELIVERED";

                    return (
                      <tr key={r.id} className="hover:bg-[#FAF5EA]/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-xs text-[#252922]">
                          {r.memberName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#77786F]">
                          {r.memberPhone}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FAF5EA] text-[#B58A3A] border border-[#B58A3A]/30">
                            {r.milestone} {language === "ar" ? "سبوت متتالية" : "Weeks"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-[#77786F]">
                          {new Date(r.earnedDate).toLocaleDateString(
                            language === "ar" ? "ar-EG" : "en-US"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isDelivered
                                ? "bg-[#EEF5F1] text-[#233D30] border border-[#233D30]/20"
                                : "bg-[#FAF5EA] text-[#B58A3A] border border-[#B58A3A]/30"
                              }`}
                          >
                            {t(`statuses.${r.status}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isDelivered ? (
                            <button
                              onClick={() => handleDeliverReward(r.id)}
                              className="px-2.5 py-1 rounded-md bg-[#233D30] hover:bg-[#192D24] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "تسليم الهدية الآن" : "Mark Delivered"}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#233D30] font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "تم التسليم" : "Delivered"}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
