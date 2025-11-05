import React from 'react';

interface GraceIconProps {
  size?: number;
  variant?: 'color' | 'monochrome';
  className?: string;
}

export default function GraceIcon({
  size = 32,
  variant = 'color',
  className = ''
}: GraceIconProps) {
  const colors = variant === 'color'
    ? {
        heart: '#E85A4F',
        hand: '#D4A574',
        background: '#FFFFFF'
      }
    : {
        heart: '#2C3E50',
        hand: '#546E7A',
        background: '#FFFFFF'
      };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Grace Companion Icon"
    >
      <rect width="100" height="100" fill={colors.background} rx="20" />

      {/* Subtle circular background for depth */}
      <circle cx="54" cy="45" r="35" fill="#F8F9FA" opacity="0.5" />

      {/* Simple rounded hand palm */}
      <ellipse
        cx="54"
        cy="76"
        rx="22"
        ry="15"
        fill={colors.hand}
        stroke="#2C3E50"
        strokeWidth="2"
      />

      {/* Curved fingers extending upward */}
      {/* Pinky */}
      <path
        d="M34 76 Q32 73 32 65 Q32 60 34 58 Q36 56 38 58 Q40 60 40 65 Q40 73 38 76"
        fill="none"
        stroke="#2C3E50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Ring finger */}
      <path
        d="M42 74 Q40 68 40 60 Q40 53 42 50 Q44 47 46 50 Q48 53 48 60 Q48 68 46 74"
        fill="none"
        stroke="#2C3E50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Middle finger - tallest */}
      <path
        d="M50 74 Q48 66 48 56 Q48 48 50 45 Q52 42 54 45 Q56 48 56 56 Q56 66 54 74"
        fill="none"
        stroke="#2C3E50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Index finger */}
      <path
        d="M58 74 Q56 68 56 60 Q56 53 58 50 Q60 47 62 50 Q64 53 64 60 Q64 68 62 74"
        fill="none"
        stroke="#2C3E50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Thumb */}
      <path
        d="M70 76 Q72 73 72 65 Q72 60 70 58 Q68 56 66 58 Q64 60 64 65 Q64 73 66 76"
        fill="none"
        stroke="#2C3E50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Simplified heart - larger and more prominent, positioned above hand */}
      <path
        d="M54 56 C54 56, 34 40, 34 28 C34 19, 40 14, 46 14 C49 14, 52 16, 54 19 C56 16, 59 14, 62 14 C68 14, 74 19, 74 28 C74 40, 54 56, 54 56 Z"
        fill={colors.heart}
        stroke="#2C3E50"
        strokeWidth="1.5"
      />
    </svg>
  );
}
