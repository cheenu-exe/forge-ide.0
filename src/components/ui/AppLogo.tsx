'use client';

import React, { memo, useMemo } from 'react';

import AppIcon from './AppIcon';
import AppImage from './AppImage';

interface AppLogoProps {
  src?: string;
  iconName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

const AppLogo = memo(function AppLogo({
  src = '/assets/images/app_logo.png',
  iconName = 'SparklesIcon',
  size = 64,
  className = '',
  onClick,
}: AppLogoProps) {
  const containerClassName = useMemo(() => {
    const classNames = ['flex items-center'];
    if (onClick) {
      classNames.push('cursor-pointer transition-opacity hover:opacity-80');
    }
    if (className) {
      classNames.push(className);
    }
    return classNames.join(' ');
  }, [className, onClick]);

  return (
    <div className={containerClassName} onClick={onClick}>
      {src ? (
        <AppImage
          src={src}
          alt="Forge logo"
          width={size}
          height={size}
          className="flex-shrink-0"
          priority
          unoptimized={src.endsWith('.svg')}
        />
      ) : (
        <AppIcon name={iconName} size={size} className="flex-shrink-0" />
      )}
    </div>
  );
});

export default AppLogo;
