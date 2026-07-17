'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type AppImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string;
  alt: string;
  fallbackSrc?: string;
};

const AppImage = memo(function AppImage({
  src,
  alt,
  className,
  fallbackSrc = '/assets/images/no_image.png',
  unoptimized,
  priority,
  ...props
}: AppImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const resolvedUnoptimized = useMemo(() => {
    return Boolean(unoptimized || imageSrc.startsWith('http'));
  }, [imageSrc, unoptimized]);

  const handleError = useCallback(() => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    }
  }, [fallbackSrc, hasError, imageSrc]);

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      priority={priority}
      unoptimized={resolvedUnoptimized}
      onError={handleError}
    />
  );
});

AppImage.displayName = 'AppImage';

export default AppImage;
