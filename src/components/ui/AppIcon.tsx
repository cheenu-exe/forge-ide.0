'use client';

import React from 'react';
import * as HeroIconsOutline from '@heroicons/react/24/outline';
import * as HeroIconsSolid from '@heroicons/react/24/solid';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

type IconVariant = 'outline' | 'solid';

type HeroIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  variant?: IconVariant;
  size?: number;
  disabled?: boolean;
}

export default function AppIcon({
  name,
  variant = 'outline',
  size = 24,
  className = '',
  disabled = false,
  onClick,
  ...props
}: IconProps) {
  const iconSet = variant === 'solid' ? HeroIconsSolid : HeroIconsOutline;
  const IconComponent =
    (iconSet[name as keyof typeof iconSet] as HeroIconComponent | undefined) ??
    QuestionMarkCircleIcon;

  return (
    <IconComponent
      width={size}
      height={size}
      className={`${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`.trim()}
      onClick={disabled ? undefined : onClick}
      {...props}
    />
  );
}
