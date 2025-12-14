'use client';

import { useEffect, useRef, useState } from 'react';

type ScrollLabelProps = {
  text: string;
  containerClassName?: string;
};

export function ScrollLabel({ text, containerClassName }: ScrollLabelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;
      const overflow = textEl.scrollWidth - container.clientWidth;
      setShouldScroll(overflow > 2);
      setDistance(Math.max(overflow, 0));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

  const baseClass = 'font-mono font-bold text-gray-800 block text-center';

  if (!shouldScroll) {
    return (
      <div ref={containerRef} className={`text-center ${containerClassName ?? ''}`}>
        <span ref={textRef} className={`${baseClass} truncate`} title={text}>
          {text}
        </span>
      </div>
    );
  }

  const duration = Math.max(distance / 40, 3); // speed control to keep readable

  return (
    <div
      ref={containerRef}
      className={`text-center overflow-hidden ${containerClassName ?? ''}`}
    >
      <span
        ref={textRef}
        className={`${baseClass} whitespace-nowrap inline-block marquee-reset`}
        style={
          {
            ['--scroll-distance' as string]: `${distance}px`,
            ['--scroll-duration' as string]: `${duration}s`,
          }
        }
        title={text}
      >
        {text}
      </span>
    </div>
  );
}
