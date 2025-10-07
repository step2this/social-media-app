import React from 'react';

interface MaterialIconProps {
  name: string;
  variant?: 'outlined' | 'filled' | 'round' | 'sharp';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Material Design Icon component using Google Fonts
 * Uses Material Icons font family loaded via CSS
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  variant = 'outlined',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-lg', // 18px
    md: 'text-xl', // 20px
    lg: 'text-2xl', // 24px
    xl: 'text-3xl' // 30px
  };

  const fontFamily = {
    outlined: 'Material Icons Outlined',
    filled: 'Material Icons',
    round: 'Material Icons Round',
    sharp: 'Material Icons Sharp'
  };

  return (
    <span
      className={`material-icon ${sizeClasses[size]} ${className}`}
      style={{
        fontFamily: fontFamily[variant],
        fontWeight: 'normal',
        fontStyle: 'normal',
        fontSize: 'inherit',
        lineHeight: 1,
        letterSpacing: 'normal',
        textTransform: 'none',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        wordWrap: 'normal',
        direction: 'ltr',
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
        MozOsxFontSmoothing: 'grayscale',
        fontFeatureSettings: 'liga'
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};