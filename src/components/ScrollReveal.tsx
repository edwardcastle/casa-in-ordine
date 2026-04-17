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
  threshold = 0.1,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.style.animationDelay = `${delay}ms`;
      el.style.animationDuration = `${duration}ms`;
      el.classList.add('scroll-revealed');
    };

    // If already in viewport on mount, reveal immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Small timeout so the initial CSS state (opacity: 0) is painted first
      setTimeout(reveal, 10 + delay);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -20px 0px' }
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
