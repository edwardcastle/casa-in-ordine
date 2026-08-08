'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';

/**
 * Cloudflare Turnstile, rendered explicitly so the token can be handed to a
 * React state setter rather than left in a hidden input. The quote wizard is
 * not a `<form>`, so the implicit mode would not reach it.
 *
 * With no site key configured the component renders nothing and reports an
 * empty token; the server then runs on its remaining checks.
 */

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      'timeout-callback'?: () => void;
      language?: string;
      theme?: 'light' | 'dark' | 'auto';
      appearance?: 'always' | 'execute' | 'interaction-only';
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';

/** Resolves once the Turnstile API is on `window`, loading the script once. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') return new Promise(() => {});
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID);

    const previous = window.onTurnstileLoad;
    window.onTurnstileLoad = () => {
      previous?.();
      if (window.turnstile) resolve(window.turnstile);
    };

    if (existing) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  /** Receives the token, or '' when it expires or errors. */
  onVerify: (token: string) => void;
  /**
   * Increment to fetch a fresh token. Cloudflare spends a token the first time
   * it is verified, so anything that follows a submission — a rejected address,
   * a message the visitor rewrites — needs a new one or the retry fails as a
   * duplicate and the form becomes impossible to submit.
   */
  resetSignal?: number;
  className?: string;
}

export default function TurnstileWidget({
  onVerify,
  resetSignal = 0,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Kept in a ref so re-rendering the parent never re-mounts the widget.
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const locale = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadTurnstile().then((turnstile) => {
      if (cancelled || widgetIdRef.current) return;
      widgetIdRef.current = turnstile.render(container, {
        sitekey: siteKey,
        language: locale,
        theme: 'light',
        callback: (token) => onVerifyRef.current(token),
        'error-callback': () => onVerifyRef.current(''),
        'expired-callback': () => onVerifyRef.current(''),
        'timeout-callback': () => onVerifyRef.current(''),
      });
    });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // Already gone — nothing to clean up.
        }
      }
    };
  }, [siteKey, locale]);

  // Discard the spent token and ask Cloudflare for another. Skipped on the
  // first render, where the widget is still issuing its initial one.
  useEffect(() => {
    if (resetSignal === 0) return;
    const id = widgetIdRef.current;
    if (!id || !window.turnstile) return;
    onVerifyRef.current('');
    try {
      window.turnstile.reset(id);
    } catch {
      // The widget went away underneath us; the next mount issues a token.
    }
  }, [resetSignal]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}

/** Lets callers skip gating their submit button when Turnstile is not set up. */
export const isTurnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
