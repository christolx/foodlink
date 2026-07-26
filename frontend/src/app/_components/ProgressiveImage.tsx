"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type ProgressiveImageProps = ImageProps & {
  blurDataURL: string;
  fadeDuration?: number;
  placeholderClassName?: string;
};

export function ProgressiveImage({
  alt,
  blurDataURL,
  className,
  fadeDuration = 350,
  onError,
  onLoad,
  placeholderClassName = "",
  style,
  ...props
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-4 scale-105 bg-cover bg-center blur-lg transition-opacity ease-out motion-reduce:transition-none ${placeholderClassName}`}
        style={{
          backgroundImage: `url("${blurDataURL}")`,
          opacity: loaded ? 0 : 1,
          transitionDuration: `${fadeDuration}ms`,
        }}
      />
      <Image
        {...props}
        alt={alt}
        className={`transition-opacity ease-out motion-reduce:transition-none ${className ?? ""}`}
        onError={(event) => {
          setLoaded(false);
          onError?.(event);
        }}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transitionDuration: `${fadeDuration}ms`,
        }}
      />
    </>
  );
}
