'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type Animation = 'fadeInUp' | 'fadeInUpShorter' | 'fadeInLeft' | 'fadeInRight' | 'blurIn' | 'fadeIn' | 'zoomIn';

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  animation = 'fadeInUpShorter',
  delay = 0,
  duration = 600,
  threshold = 0.15,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`;
          el.style.animationDuration = `${duration}ms`;
          el.classList.add('scroll-revealed');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration, threshold]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal scroll-reveal--${animation} ${className}`}
    >
      {children}
    </div>
  );
}
