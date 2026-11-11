'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function ShimmerImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  fill = false,
  sizes,
  priority = false,
  width,
  height,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 z-[1] shimmer-wave transition-opacity duration-500 ${wrapperClassName}`}
        />
      )}
      <Image
        src={src}
        alt={alt || ''}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className} transition-all duration-500 ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
        }`}
        {...rest}
      />
    </>
  );
}
