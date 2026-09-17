"use client";

import { useEffect, useRef } from "react";

export function VideoBackground({
  src = "/ascii-bg.webm",
  poster = "/ascii-bg-poster.jpg",
  className,
}: {
  src?: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
    }
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      className={className ?? "absolute inset-0 h-full w-full object-cover"}
    />
  );
}
