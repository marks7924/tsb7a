"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useLanguage } from "@/lib/i18n/context";
import { FileSpreadsheet, Download, FileText, FileCode } from "lucide-react";

export default function ReportsPage() {
  const { language, t } = useLanguage();

  const [reportType, setReportType] = useState<"members" | "attendance" | "rewards">("members");
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (format: "csv" | "excel" | "pdf") => {
    setDownloading(format);
    const url = `/api/export?type=${reportType}&format=${format}`;
    window.location.href = url;
    setTimeout(() => setDownloading(null), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F1]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#252922] flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#233D30]" />
            <span>{t("nav.reports")}</span>
          </h1>
          <p className="text-xs text-[#77786F] mt-1">
            {language === "ar"
              ? "استخراج كشوف الحضور والمكافآت بصيغ Excel و CSV و PDF للطباعة والأرشيف الكنسي"
              : "Export attendance records, rewards, and directories to Excel, CSV, or PDF"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#E4E0D5] shadow-xs p-6 space-y-6">
          {/* Dataset Selector */}
          <div>
            <label className="block text-xs font-bold text-[#252922] mb-2">
              {language === "ar" ? "نوع التقرير المطلوب:" : "Select Report Dataset:"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: "members", labelAr: "دليل المخدومين وإحصائيات السلاسل", labelEn: "Member Directory & Stats" },
                { id: "rewards", labelAr: "كشف المكافآت والتسليمات المعتمدة", labelEn: "Rewards & Deliveries" },
                { id: "attendance", labelAr: "سجل جلسات التسبحة السبتية", labelEn: "Saturday Praise Sessions" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setReportType(item.id as any)}
                  className={`p-3 rounded-lg border text-right ltr:text-left text-xs font-semibold transition-all ${reportType === item.id
                      ? "bg-[#233D30] text-white border-[#233D30] shadow-xs"
                      : "bg-[#F7F6F1] border-[#E4E0D5] text-[#77786F] hover:bg-[#EFEDE5]"
                    }`}
                >
                  {language === "ar" ? item.labelAr : item.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Format Downloads */}
          <div className="pt-4 border-t border-[#EFEDE5] space-y-3">
            <label className="block text-xs font-bold text-[#252922]">
              {language === "ar" ? "اختر صيغة الملف للتحميل:" : "Choose Export Format:"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleDownload("excel")}
                disabled={!!downloading}
                className="p-3.5 rounded-lg border border-[#233D30]/30 bg-[#EEF5F1] hover:bg-[#e4efe8] text-[#233D30] flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="font-bold text-xs">Excel (.xlsx)</span>
                </div>
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDownload("csv")}
                disabled={!!downloading}
                className="p-3.5 rounded-lg border border-[#B58A3A]/30 bg-[#FAF5EA] hover:bg-[#f3ead6] text-[#B58A3A] flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  <span className="font-bold text-xs">CSV (.csv)</span>
                </div>
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDownload("pdf")}
                disabled={!!downloading}
                className="p-3.5 rounded-lg border border-[#8C2929]/30 bg-[#FAF0F0] hover:bg-[#f5e4e4] text-[#8C2929] flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-bold text-xs">PDF Document</span>
                </div>
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
