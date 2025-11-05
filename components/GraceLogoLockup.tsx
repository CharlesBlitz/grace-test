import React from 'react';
import GraceLogo from './GraceLogo';

interface GraceLogoLockupProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'color' | 'monochrome';
  layout?: 'horizontal' | 'vertical';
  showTagline?: boolean;
  className?: string;
  animated?: boolean;
}

export default function GraceLogoLockup({
  size = 'medium',
  variant = 'color',
  layout = 'horizontal',
  showTagline = false,
  className = '',
  animated = false
}: GraceLogoLockupProps) {
  const sizeMap = {
    small: { logo: 32, text: 'text-lg', tagline: 'text-xs', gap: 'gap-2' },
    medium: { logo: 48, text: 'text-2xl', tagline: 'text-sm', gap: 'gap-3' },
    large: { logo: 64, text: 'text-4xl', tagline: 'text-base', gap: 'gap-4' }
  };

  const config = sizeMap[size];
  const textColor = variant === 'color' ? 'text-deep-navy' : 'text-current';

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center ${config.gap} ${className}`}>
        <GraceLogo size={config.logo} variant={variant} animated={animated} />
        <div className="flex flex-col items-center gap-1">
          <h1 className={`${config.text} font-bold ${textColor} text-center`}>
            Grace Companion
          </h1>
          {showTagline && (
            <p className={`${config.tagline} ${textColor} opacity-70 text-center`}>
              Care with Heart & Hand
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      <GraceLogo size={config.logo} variant={variant} animated={animated} />
      <div className="flex flex-col">
        <h1 className={`${config.text} font-bold ${textColor} leading-tight`}>
          Grace Companion
        </h1>
        {showTagline && (
          <p className={`${config.tagline} ${textColor} opacity-70`}>
            Care with Heart & Hand
          </p>
        )}
      </div>
    </div>
  );
}
