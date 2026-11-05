import React from "react";

export function CopticCross({ className = "w-6 h-6", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Vertical beam with flared ends */}
      <path
        d="M12 2V22M12 2L10 4M12 2L14 4M12 22L10 20M12 22L14 20"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Horizontal beam with flared ends */}
      <path
        d="M2 12H22M2 12L4 10M2 12L4 14M22 12L20 10M22 12L20 14"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 4 dots in the quadrants symbolizing the 4 evangelists */}
      <circle cx="8" cy="8" r="0.9" fill={color} />
      <circle cx="16" cy="8" r="0.9" fill={color} />
      <circle cx="8" cy="16" r="0.9" fill={color} />
      <circle cx="16" cy="16" r="0.9" fill={color} />
    </svg>
  );
}

