"use client";

import React, { useState, useRef } from "react";
import { AVATAR_LIBRARY, AvatarItem, getDeterministicDefaultAvatar, isCustomUploadedAvatar } from "@/lib/avatars";
import { useLanguage } from "@/lib/i18n/context";
import { X, Check, Upload, RotateCcw, Sparkles, Image as ImageIcon } from "lucide-react";

interface AvatarPickerModalProps {
  memberId: string;
  currentAvatarUrl?: string | null;
  memberName?: string;
  isOpen: boolean;
  onClose: () => void;
  onAvatarSaved: (newAvatarUrl: string | null) => void;
}

export function AvatarPickerModal({
  memberId,
  currentAvatarUrl,
  memberName,
  isOpen,
  onClose,
  onAvatarSaved,
}: AvatarPickerModalProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultAvatar = getDeterministicDefaultAvatar(memberId);

  // Selected avatar state: can be a local URL, a custom data URL, or null (default)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    currentAvatarUrl || defaultAvatar.url
  );
  const [filterCategory, setFilterCategory] = useState<"all" | "boy" | "girl">("all");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAvatars = AVATAR_LIBRARY.filter((a) => {
    if (filterCategory === "all") return true;
    return a.category === filterCategory;
  });

  const handleSelectAvatar = (avatar: AvatarItem) => {
    setSelectedUrl(avatar.url);
    setUploadError(null);
  };

  const handleResetToDefault = () => {
    // Resetting to default sets it to null so it always resolves to deterministic default
    setSelectedUrl(defaultAvatar.url);
    setUploadError(null);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        language === "ar"
          ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت"
          : "Image size must be under 5MB"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setUploadError(null);

    try {
      // If selectedUrl is the default avatar, we can store it or store null
      const urlToSave = selectedUrl === defaultAvatar.url ? defaultAvatar.url : selectedUrl;

      const res = await fetch("/api/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-avatar",
          avatarUrl: urlToSave,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update avatar");

      onAvatarSaved(urlToSave);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || "Failed to save avatar choice");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentDefault = selectedUrl === defaultAvatar.url;
  const isCustom = isCustomUploadedAvatar(selectedUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E4E0D5] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E4E0D5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#233D30] text-[#B58A3A] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#233D30]">
                {language === "ar" ? "اختر صورتك الرمزية (Avatar)" : "Choose Your Avatar"}
              </h3>
              <p className="text-[11px] text-[#77786F]">
                {language === "ar"
                  ? "اختر من مكتبة التسبحة أو ارفع صورة خاصة لتظهر في لوحة الشرف"
                  : "Pick from the church library or upload your own picture"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#77786F] hover:bg-[#EFEDE5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Custom File Upload Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomUpload}
        />

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Live Preview & Active Mode */}
          <div className="bg-[#FAF5EA] border border-[#B58A3A]/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={selectedUrl || defaultAvatar.url}
                  alt="Preview"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#B58A3A] shadow-xs bg-white"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#233D30] text-[#B58A3A] flex items-center justify-center shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#B58A3A] uppercase tracking-wider block">
                  {language === "ar" ? "المعاينة الحالية" : "Current Preview"}
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-[#252922]">
                  {memberName || (language === "ar" ? "الصورة المحددة" : "Selected Avatar")}
                </h4>
                <p className="text-[11px] text-[#77786F]">
                  {isCustom
                    ? language === "ar"
                      ? "صورة شخصية مرفوعة من جهازك"
                      : "Custom uploaded photo"
                    : isCurrentDefault
                      ? language === "ar"
                        ? "الصورة التلقائية المخصصة لحسابك"
                        : "Default assigned avatar"
                      : language === "ar"
                        ? "صورة مختارة من مكتبة الكنيسة"
                        : "Church library avatar"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              {/* Upload Custom File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#EFEDE5] text-xs font-semibold text-[#252922] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#B58A3A]" />
                <span>{language === "ar" ? "رفع صورة" : "Upload"}</span>
              </button>

              {/* Reset to Default Avatar Button */}
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-1.5 rounded-lg border border-[#E4E0D5] bg-white hover:bg-[#EFEDE5] text-xs font-semibold text-[#77786F] flex items-center gap-1.5 transition-colors cursor-pointer"
                title={language === "ar" ? "العودة للصورة الافتراضية" : "Reset to default"}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === "ar" ? "الافتراضي" : "Default"}</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-lg bg-[#FAF0F0] text-[#8C2929] text-xs font-semibold">
              {uploadError}
            </div>
          )}

          {/* Library Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#252922] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#233D30]" />
                <span>{language === "ar" ? "مكتبة الصور الرمزية" : "Avatar Library"}</span>
              </span>

              {/* Category Filter Tabs */}
              <div className="inline-flex rounded-lg border border-[#E4E0D5] p-0.5 bg-[#F7F6F1]">
                <button
                  type="button"
                  onClick={() => setFilterCategory("all")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${filterCategory === "all"
                      ? "bg-[#233D30] text-white shadow-xs"
                      : "text-[#77786F] hover:text-[#252922]"
                    }`}
                >
                  {language === "ar" ? "الكل (١٦)" : "All (16)"}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("boy")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${filterCategory === "boy"
                      ? "bg-[#233D30] text-white shadow-xs"
                      : "text-[#77786F] hover:text-[#252922]"
                    }`}
                >
                  {language === "ar" ? "بنين (٧)" : "Boys (7)"}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("girl")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${filterCategory === "girl"
                      ? "bg-[#233D30] text-white shadow-xs"
                      : "text-[#77786F] hover:text-[#252922]"
                    }`}
                >
                  {language === "ar" ? "بنات (٧)" : "Girls (7)"}
                </button>
              </div>
            </div>

            {/* Responsive Avatar Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
              {filteredAvatars.map((item) => {
                const isSelected = selectedUrl === item.url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAvatar(item)}
                    className={`relative p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer ${isSelected
                        ? "bg-[#FAF5EA] border-[#B58A3A] ring-2 ring-[#B58A3A]/40 shadow-sm"
                        : "bg-white border-[#E4E0D5] hover:bg-[#F7F6F1] hover:border-[#233D30]/40"
                      }`}
                  >
                    <div className="relative">
                      <img
                        src={item.url}
                        alt={item.nameAr}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover bg-[#FAF5EA]"
                        loading="lazy"
                      />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#B58A3A] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-[#77786F] truncate max-w-full">
                      {language === "ar" ? item.nameAr : item.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E4E0D5] bg-[#F7F6F1]/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#77786F] hover:bg-[#EFEDE5] rounded-xl transition-colors cursor-pointer"
          >
            {language === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold bg-[#233D30] hover:bg-[#192D24] text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ وتطبيق" : "Save & Apply")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

