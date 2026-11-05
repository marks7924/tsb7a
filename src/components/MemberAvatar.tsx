"use client";

import React, { useState, useEffect } from "react";
import { resolveAvatarUrl, getDeterministicDefaultAvatar } from "@/lib/avatars";

interface MemberAvatarProps {
  memberId?: string | null;
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

export function MemberAvatar({
  memberId,
  avatarUrl,
  fullName,
  size = "md",
  className = "",
  showBorder = true,
}: MemberAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [hasFallbackError, setHasFallbackError] = useState(false);

  useEffect(() => {
    setHasError(false);
    setHasFallbackError(false);
  }, [avatarUrl, memberId]);

  // 1. Resolve avatar with strict priority:
  // (Uploaded -> Selected Local -> Deterministic Default)
  const resolvedSrc = resolveAvatarUrl(memberId, avatarUrl);
  const defaultFallbackSrc = getDeterministicDefaultAvatar(memberId).url;

  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const borderClasses = showBorder ? "border border-[#E4E0D5]" : "";

  // If even the default image fails to load, render dignified initials
  if (hasFallbackError) {
    const initials = (fullName || "م")
      .replace(/\s*[\(\[].*?[\)\]]\s*$/, "")
      .replace(/\s*-\s*(أمين|خادم|مطور).*$/, "")
      .trim()
      .slice(0, 2);

    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#233D30] text-[#B58A3A] font-bold flex items-center justify-center shrink-0 shadow-xs ${borderClasses} ${className}`}
        title={fullName || "عضو التسبحة"}
      >
        {initials}
      </div>
    );
  }

  const currentSrc = hasError ? defaultFallbackSrc : resolvedSrc;

  return (
    <img
      src={currentSrc}
      alt={fullName || "صورة العضو"}
      className={`${sizeClasses} rounded-full object-cover shrink-0 shadow-xs bg-[#FAF5EA] ${borderClasses} ${className}`}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        } else {
          setHasFallbackError(true);
        }
      }}
      loading="lazy"
    />
  );
}

