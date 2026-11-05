"use client";

import React from "react";

interface LaurelProps {
  rank: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  hasCrown?: boolean;
}

export function LaurelRankBadge({ rank, size = "md", className = "", hasCrown = false }: LaurelProps) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;

  // Colors
  const colorScheme = isFirst
    ? {
      primary: "#F59E0B", // Vibrant Gold
      glow: "rgba(245, 158, 11, 0.4)",
      badgeBg: "rgba(245, 158, 11, 0.15)",
      text: "#FDE68A",
      border: "rgba(245, 158, 11, 0.5)",
      label: "1st",
    }
    : isSecond
      ? {
        primary: "#94A3B8", // Platinum / Silver
        glow: "rgba(148, 163, 184, 0.3)",
        badgeBg: "rgba(148, 163, 184, 0.15)",
        text: "#F1F5F9",
        border: "rgba(148, 163, 184, 0.5)",
        label: "2nd",
      }
      : isThird
        ? {
          primary: "#D97706", // Bronze / Amber
          glow: "rgba(217, 119, 6, 0.3)",
          badgeBg: "rgba(217, 119, 6, 0.15)",
          text: "#FED7AA",
          border: "rgba(217, 119, 6, 0.5)",
          label: "3rd",
        }
        : {
          primary: "#F59E0B", // Golden-amber wreath for ranks
          glow: "rgba(245, 158, 11, 0.2)",
          badgeBg: "rgba(245, 158, 11, 0.1)",
          text: "#FCD34D",
          border: "rgba(245, 158, 11, 0.3)",
          label: `${rank}th`,
        };

  const getRankSuffix = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const labelText = getRankSuffix(rank);

  // Dedicated circular wreath for row items (rank 4+)
  if (size === "sm" || rank >= 4) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
        <svg
          viewBox="0 0 64 64"
          className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Outer Glow */}
          <circle cx="32" cy="32" r="28" fill={colorScheme.badgeBg} stroke={colorScheme.border} strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Circular Laurel Wreath Leaves */}
          <g stroke={colorScheme.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill={colorScheme.primary} fillOpacity="0.85">
            {/* Left Wreath Branch */}
            <path d="M 32 54 C 20 54 12 44 12 32 C 12 22 18 14 26 10" fill="none" strokeWidth="1.8" />
            <path d="M 22 52 C 18 48 16 46 19 43 C 22 46 22 49 22 52 Z" />
            <path d="M 16 45 C 12 41 11 38 15 36 C 18 39 17 42 16 45 Z" />
            <path d="M 13 36 C 9 32 9 29 13 27 C 16 30 15 33 13 36 Z" />
            <path d="M 14 26 C 11 22 13 19 17 19 C 18 23 16 25 14 26 Z" />
            <path d="M 20 18 C 18 14 21 12 24 13 C 24 17 22 18 20 18 Z" />

            {/* Right Wreath Branch */}
            <path d="M 32 54 C 44 54 52 44 52 32 C 52 22 46 14 38 10" fill="none" strokeWidth="1.8" />
            <path d="M 42 52 C 46 48 48 46 45 43 C 42 46 42 49 42 52 Z" />
            <path d="M 48 45 C 52 41 53 38 49 36 C 46 39 47 42 48 45 Z" />
            <path d="M 51 36 C 55 32 55 29 51 27 C 48 30 49 33 51 36 Z" />
            <path d="M 50 26 C 53 22 51 19 47 19 C 46 23 48 25 50 26 Z" />
            <path d="M 44 18 C 46 14 43 12 40 13 C 40 17 42 18 44 18 Z" />

            {/* Bottom Tie Knot */}
            <path d="M 29 53 C 32 51 32 51 35 53 C 33 55 31 55 29 53 Z" fill={colorScheme.primary} />
          </g>
          
          {/* Inner Number */}
          <text
            x="32"
            y="37"
            textAnchor="middle"
            fontSize="15"
            fontWeight="900"
            fontFamily="monospace, system-ui, sans-serif"
            fill={colorScheme.text}
            className="tracking-tight"
          >
            {labelText}
          </text>
        </svg>
      </div>
    );
  }

  // Large Podium Laurel Badge (Above Avatar in Top 3)
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* 3D Crown for 1st Place */}
      {isFirst && (
        <div className="absolute -top-7 animate-bounce transition-transform duration-700">
          <svg viewBox="0 0 64 48" className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]" fill="none">
            <path
              d="M 6 38 L 10 14 L 22 26 L 32 8 L 42 26 L 54 14 L 58 38 Z"
              fill="url(#goldCrownGradient)"
              stroke="#FDE68A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Jewels */}
            <circle cx="10" cy="14" r="3.5" fill="#EF4444" stroke="#FFF" strokeWidth="1" />
            <circle cx="32" cy="8" r="4" fill="#10B981" stroke="#FFF" strokeWidth="1" />
            <circle cx="54" cy="14" r="3.5" fill="#3B82F6" stroke="#FFF" strokeWidth="1" />
            <circle cx="32" cy="30" r="3" fill="#FDE68A" />
            <defs>
              <linearGradient id="goldCrownGradient" x1="0" y1="0" x2="64" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FBBF24" />
                <stop offset="0.5" stopColor="#F59E0B" />
                <stop offset="1" stopColor="#D97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Podium Wreath Arch */}
      <svg
        viewBox="0 0 100 50"
        className="w-20 h-10 sm:w-24 sm:h-12 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke={colorScheme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={colorScheme.primary} fillOpacity="0.9">
          {/* Left Arch Branch */}
          <path d="M 50 44 C 32 44 20 34 14 18" fill="none" strokeWidth="2.2" />
          <path d="M 38 42 C 32 38 30 35 34 31 C 38 35 38 39 38 42 Z" />
          <path d="M 28 35 C 22 30 21 27 26 24 C 30 28 29 32 28 35 Z" />
          <path d="M 20 25 C 15 20 15 16 20 14 C 24 18 22 22 20 25 Z" />
          <path d="M 15 15 C 11 10 13 6 18 6 C 20 11 18 14 15 15 Z" />

          {/* Right Arch Branch */}
          <path d="M 50 44 C 68 44 80 34 86 18" fill="none" strokeWidth="2.2" />
          <path d="M 62 42 C 68 38 70 35 66 31 C 62 35 62 39 62 42 Z" />
          <path d="M 72 35 C 78 30 79 27 74 24 C 70 28 71 32 72 35 Z" />
          <path d="M 80 25 C 85 20 85 16 80 14 C 76 18 78 22 80 25 Z" />
          <path d="M 85 15 C 89 10 87 6 82 6 C 80 11 82 14 85 15 Z" />

          {/* Center Bow / Knot */}
          <path d="M 46 44 C 50 42 50 42 54 44 C 52 46 48 46 46 44 Z" fill={colorScheme.primary} />
        </g>

        {/* Center Rank Text */}
        <text
          x="50"
          y="32"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          fill={colorScheme.text}
          filter={`drop-shadow(0px 2px 4px ${colorScheme.glow})`}
          className="tracking-tight"
        >
          {colorScheme.label}
        </text>
      </svg>
    </div>
  );
}

