import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WordMark"
    >
      <defs>
        <linearGradient id="wm-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C77B4F" />
          <stop offset="100%" stopColor="#9A4E28" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#wm-bg)" />
      {/* Highlighter mark under the W */}
      <rect x="10" y="29" width="20" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.35" />
      {/* W — single continuous stroke */}
      <path
        d="M9.5 11 L14.5 26 L20 17 L25.5 26 L30.5 11"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
