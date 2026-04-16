'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface HeroProps {
  title: string;
  subtitle?: string;
  cta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  large?: boolean;
  backgroundImage?: string;
  backgroundImages?: string[]; // carousel — cycles through these
  interval?: number; // ms between slides, default 6000
}

export default function Hero({
  title,
  subtitle,
  cta,
  secondaryCta,
  large = false,
  backgroundImage,
  backgroundImages,
  interval = 6000,
}: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLAnchorElement>(null);

  // Normalize: carousel takes precedence, otherwise single image
  const slides = backgroundImages && backgroundImages.length > 0
    ? backgroundImages
    : backgroundImage ? [backgroundImage] : [];
  const hasCarousel = slides.length > 1;

  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    if (!hasCarousel) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [hasCarousel, slides.length, interval]);

  useEffect(() => {
    // Staggered entrance animations for hero content
    const animate = (el: HTMLElement | null, delay: number) => {
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.opacity = '';
        el.classList.add('scroll-revealed');
        el.style.animationDelay = '0ms';
      }, delay);
    };

    animate(titleRef.current, 300);
    animate(subtitleRef.current, 800);
    animate(ctaRef.current, 1300);
    animate(arrowRef.current, 1500);
  }, []);

  return (
    <section
      className={`relative overflow-hidden ${large ? 'hero-full hero-angled' : 'py-16 md:py-24'}`}
    >
      {/* Background carousel or solid color */}
      {slides.length > 0 ? (
        <>
          {slides.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: i === activeIdx ? 1 : 0 }}
              aria-hidden={i !== activeIdx}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover object-center w-[100%] h-auto"
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-primary/55" />
        </>
      ) : (
        <div className="absolute inset-0 bg-primary" />
      )}

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <h1
          ref={titleRef}
          className={`scroll-reveal scroll-reveal--blurIn font-extrabold text-white ${large ? 'text-clamp-hero' : 'text-3xl md:text-4xl lg:text-5xl'} leading-tight tracking-tight uppercase`}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            ref={subtitleRef}
            className={`scroll-reveal scroll-reveal--fadeInUpShorter mt-4 md:mt-6 text-white/90 ${large ? 'text-lg md:text-xl lg:text-2xl' : 'text-base md:text-lg'} max-w-3xl mx-auto font-light`}
          >
            {subtitle}
          </p>
        )}
        {(cta || secondaryCta) && (
          <div ref={ctaRef} className="scroll-reveal scroll-reveal--fadeInUpShorter mt-8 md:mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            {cta && (
              <a href={cta.href} className="btn-slice group">
                <span className="btn-slice__label">{cta.text}</span>
                <svg className="btn-slice__arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                {secondaryCta.text}
              </a>
            )}
          </div>
        )}
        {large && (
          <>
            <div className="py-6 md:py-10" />
            <a
              ref={arrowRef}
              href="#main"
              className="scroll-reveal scroll-reveal--fadeInUpShorter inline-block text-white/80 hover:text-white transition-colors"
              aria-label="Scroll down"
            >
              <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </>
        )}
      </div>

      {/* Carousel indicators */}
      {hasCarousel && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === activeIdx ? 'bg-white w-10' : 'bg-white/40 w-4 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
