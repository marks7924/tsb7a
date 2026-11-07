"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { MemberAvatar } from "./MemberAvatar";
import { Search, ChevronDown, Check, X, User } from "lucide-react";

interface MemberSearchSelectProps {
  label: string;
  placeholder?: string;
  members: any[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
  disabledMemberId?: string;
  badge?: "primary" | "duplicate";
}

export function MemberSearchSelect({
  label,
  placeholder,
  members,
  selectedMemberId,
  onSelectMember,
  disabledMemberId,
  badge,
}: MemberSearchSelectProps) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      const nameMatch = m.fullName?.toLowerCase().includes(q);
      const phoneMatch = m.phone?.includes(q);
      return nameMatch || phoneMatch;
    });
  }, [members, search]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="block text-xs font-bold text-[#252922] dark:text-white">
        {label}
      </label>

      <div className="relative">
        {/* Selected Member Display or Placeholder Button */}
        {selectedMember ? (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all shadow-xs ${
              badge === "primary"
                ? "bg-[#EEF5F1] dark:bg-[#10B981]/15 border-[#233D30]/40 dark:border-[#10B981]/40"
                : badge === "duplicate"
                ? "bg-[#FAF0F0] dark:bg-[#EF4444]/15 border-[#8C2929]/40 dark:border-[#EF4444]/40"
                : "bg-white dark:bg-[#161828] border-[#E4E0D5] dark:border-[#262A42]"
            }`}
          >
            <div
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              onClick={() => setIsOpen(!isOpen)}
            >
              <MemberAvatar
                memberId={selectedMember.id}
                avatarUrl={selectedMember.avatarUrl}
                fullName={selectedMember.fullName}
                size="sm"
              />
              <div className="min-w-0">
                <span className="font-bold text-xs text-[#252922] dark:text-white truncate block">
                  {selectedMember.fullName}
                </span>
                <span className="text-[11px] text-[#77786F] dark:text-[#94A3B8] font-mono block">
                  {selectedMember.phone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onSelectMember("");
                  setIsOpen(false);
                }}
                className="p-1 rounded-lg text-[#77786F] hover:text-[#8C2929] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={language === "ar" ? "إلغاء التحديد" : "Clear selection"}
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-lg text-[#77786F] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full text-start py-2.5 px-3 rounded-xl border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-xs font-semibold text-[#77786F] dark:text-[#94A3B8] hover:border-[#B58A3A] dark:hover:border-[#F59E0B] flex items-center justify-between gap-2 shadow-xs cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 text-[#B58A3A] dark:text-[#F59E0B] shrink-0" />
              <span className="truncate">
                {placeholder || (language === "ar" ? "ابحث أو اختر العضو..." : "Search or select member...")}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        )}

        {/* Dropdown Menu with Smart Search */}
        {isOpen && (
          <div className="absolute top-full mt-1.5 z-50 w-full bg-white dark:bg-[#121422] rounded-2xl border border-[#E4E0D5] dark:border-[#262A42] shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-[#77786F] dark:text-[#94A3B8]" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  language === "ar"
                    ? "ابحث بالاسم أو رقم الهاتف..."
                    : "Search by name or phone number..."
                }
                className="w-full text-xs py-1.5 rtl:pr-8 ltr:pl-8 rtl:pl-3 ltr:pr-3 rounded-lg border border-[#E4E0D5] dark:border-[#262A42] bg-[#F7F6F1] dark:bg-[#161828] text-[#252922] dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {filteredMembers.length === 0 ? (
                <div className="py-5 text-center text-xs text-[#77786F] dark:text-[#94A3B8]">
                  {language === "ar" ? "لا توجد نتائج مطابقة" : "No members found"}
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = m.id === selectedMemberId;
                  const isDisabled = m.id === disabledMemberId;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        onSelectMember(m.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-start transition-all ${
                        isDisabled
                          ? "opacity-40 cursor-not-allowed bg-transparent"
                          : isSelected
                          ? "bg-[#233D30] text-white shadow-xs dark:bg-[#1E2238] dark:border dark:border-[#F59E0B]/30"
                          : "hover:bg-[#F7F6F1] dark:hover:bg-[#1A1D30] text-[#252922] dark:text-white cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                        <MemberAvatar
                          memberId={m.id}
                          avatarUrl={m.avatarUrl}
                          fullName={m.fullName}
                          size="xs"
                        />
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-xs truncate block">
                            {m.fullName}
                          </span>
                          <span
                            className={`text-[10px] font-mono block ${
                              isSelected ? "text-white/80" : "text-[#77786F] dark:text-[#94A3B8]"
                            }`}
                          >
                            {m.phone}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDisabled && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#77786F]">
                            {language === "ar" ? "مختار كطرف آخر" : "Selected as other"}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

