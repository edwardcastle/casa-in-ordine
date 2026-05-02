'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('nav');
  const locale = useLocale();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/about`, label: t('about') },
    { href: `/${locale}/services`, label: t('services') },
    { href: `/${locale}/preventivo`, label: t('preventivo') },
    /*{ href: `/${locale}/blog`, label: t('blog') },*/
    { href: `/${locale}/contact`, label: t('contact') },
  ];

  const headerHeight = scrolled ? 'h-16' : 'h-20';
  const topOffset = scrolled ? 'top-16' : 'top-20';

  return (
    <>
      {/* Header bar */}
      <header
        className={`fixed top-0 md:py-4 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-primary/90 backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-300 ${headerHeight}`}>
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src="/images/logo/logo_800x300.png"
                alt="Casa in Ordine"
                width={250}
                height={75}
                priority
                className={`w-auto transition-all duration-300 py-2 brightness-0 invert ${scrolled ? 'h-16 md:h-26' : 'h-16 md:h-26'}`}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-lg uppercase font-medium transition-colors duration-200 ${
                    scrolled
                      ? 'text-white/90 hover:text-white'
                      : 'text-white hover:text-white/80'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <LanguageSwitcher />
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-md text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown — fixed, positioned right below the header bar */}
      {isMenuOpen && (
        <nav
          className={`fixed left-0 right-0 z-40 lg:hidden transition-all duration-300 ${topOffset} bg-primary/90 backdrop-blur-md shadow-lg rounded-b-2xl`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-3 pt-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
