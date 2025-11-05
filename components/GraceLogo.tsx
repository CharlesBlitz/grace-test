import React from 'react';

interface GraceLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  variant?: 'color' | 'monochrome';
  className?: string;
  animated?: boolean;
}

export default function GraceLogo({
  size = 'medium',
  variant = 'color',
  className = '',
  animated = false
}: GraceLogoProps) {
  const sizeMap = {
    small: 40,
    medium: 56,
    large: 80
  };

  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  const colors = variant === 'color'
    ? {
        primary: '#E85A4F',      // Light red for heart
        secondary: '#D4A5A5',    // Lighter red shade for heart depth
        accent: '#2C3E50',       // Deep navy for outlines
        heart: '#E85A4F',        // Light red
        hand: '#D4A574',         // Warm beige/tan for hand
        handShade: '#C4956A'     // Slightly darker tan for depth
      }
    : {
        primary: '#2C3E50',
        secondary: '#546E7A',
        accent: '#2C3E50',
        heart: '#2C3E50',
        hand: '#2C3E50',
        handShade: '#2C3E50'
      };

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'animate-pulse-gentle' : ''}`}
      role="img"
      aria-label="Grace Companion Logo"
    >
      <defs>
        <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: colors.heart, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: colors.secondary, stopOpacity: 1 }} />
        </linearGradient>

        <filter id="softGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g filter={variant === 'color' ? 'url(#softGlow)' : undefined}>
        {/* Heart shape (positioned at top) */}
        <path
          d="M50 48 C50 48, 32 34, 32 24 C32 16, 37 12, 42 12 C45 12, 47 14, 50 17 C53 14, 55 12, 58 12 C63 12, 68 16, 68 24 C68 34, 50 48, 50 48 Z"
          fill="url(#heartGradient)"
          stroke={colors.accent}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small heart detail/sparkle */}
        <circle cx="56" cy="19" r="1.5" fill="#FFFFFF" opacity="0.9" />
        <circle cx="59" cy="22" r="1" fill="#FFFFFF" opacity="0.7" />

        {/* Custom Hand Image */}
        <image
          href="/hand-icon.png"
          x="24"
          y="48"
          width="52"
          height="52"
          preserveAspectRatio="xMidYMid meet"
          opacity={variant === 'monochrome' ? 0.8 : 1}
          style={{
            filter: variant === 'monochrome' ? 'grayscale(100%) brightness(0.3)' : 'none'
          }}
        />
      </g>

      <circle
        cx="50"
        cy="50"
        r="48"
        stroke={variant === 'color' ? colors.heart : colors.accent}
        strokeWidth="1.5"
        fill="none"
        opacity="0.2"
      />
    </svg>
  );
}
