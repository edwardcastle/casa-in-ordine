'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// A real on-screen keyboard is tall (~250-350px). Anything smaller than this
// is almost certainly browser-chrome noise (collapsing URL bar, etc.) rather
// than a keyboard, so we ignore it to avoid jitter.
const KEYBOARD_INSET_THRESHOLD = 120;

// Touch devices (phones/tablets) are the ones with a software keyboard that
// overlaps the layout viewport. We gate on the PRIMARY pointer being coarse —
// not on window width — so the fix also covers landscape phones (width > 640)
// while never engaging on a mouse-driven desktop (even a narrow, pinch-zoomed
// window, which would otherwise shrink the visual viewport and false-trigger).
function hasCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

export default function ChatWidget() {
  const t = useTranslations('chat');
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: 'assistant', content: t('greeting') },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  // When the on-screen keyboard is open on a small screen we override the
  // panel's fixed positioning with JS-computed geometry derived from
  // window.visualViewport (the only reliable keyboard signal on iOS Safari).
  // `undefined` => use the default Tailwind classes (desktop / no keyboard).
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(
    undefined,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, []);

  // Keep the latest message in view.
  useEffect(() => {
    scrollToLatest();
  }, [messages, sending, scrollToLatest]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // ── Virtual-keyboard handling ────────────────────────────────────────────
  //
  // Brutal cross-browser truth:
  //  • iOS Safari does NOT shrink 100vh/100dvh for the keyboard and does NOT
  //    support `interactive-widget=resizes-content`. A position:fixed element
  //    stays glued to the *layout* viewport, so it slides behind the keyboard.
  //    The ONLY accurate signal is window.visualViewport.
  //  • Android Chrome generally resizes the visual viewport too (and honours
  //    interactive-widget), but tracking visualViewport works there as well.
  //  • Desktop has no keyboard; we leave the default styling untouched.
  //
  // While the chat is open we listen to visualViewport `resize` + `scroll`
  // (iOS scrolls the page to reveal the focused input, changing offsetTop) and
  // recompute the keyboard inset. When a keyboard is detected on a small
  // screen we pin the panel inside the visible region so the composer always
  // sits just above the keyboard and the whole message list stays visible.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const vv = window.visualViewport ?? null;
    // Pointer type is stable for the session, so read it once.
    const coarsePointer = hasCoarsePointer();

    // Avoid redundant re-renders during the keyboard animation: only push new
    // state when the computed geometry meaningfully changes.
    let lastTop = -1;
    let lastBottom = -1;
    let lastActive = false;
    let frame = 0;

    const compute = () => {
      frame = 0;

      const innerHeight = window.innerHeight;
      const viewportHeight = vv ? vv.height : innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;

      // Pixels the keyboard (and any bottom browser UI) cover in the layout
      // viewport. ~0 when no keyboard is up. Derived from visualViewport.height
      // (not width), so it fires in portrait AND landscape.
      const keyboardInset = Math.max(
        0,
        innerHeight - viewportHeight - offsetTop,
      );
      const keyboardOpen = keyboardInset > KEYBOARD_INSET_THRESHOLD;

      // Only take over positioning for the case the default styling fails: a
      // software keyboard up on a touch device (any orientation). Everything
      // else — desktop, or a touch device with no keyboard — keeps the original
      // floating-card look.
      if (!coarsePointer || !keyboardOpen) {
        lastActive = false;
        lastTop = -1;
        lastBottom = -1;
        // Reconcile back to the default class-based styling. The functional
        // updater bails out cleanly when already undefined (no extra render),
        // and resets correctly even on the first pass after a reopen.
        setPanelStyle((prev) => (prev ? undefined : prev));
        return;
      }

      const GAP = 12; // breathing room from viewport edges / keyboard
      // `top` and `bottom` are in layout-viewport coordinates (what
      // position:fixed uses). Following offsetTop keeps us aligned with the
      // visual viewport even when iOS scrolls the page up.
      const top = Math.round(offsetTop + GAP);
      const bottom = Math.round(keyboardInset + GAP);

      if (lastActive && top === lastTop && bottom === lastBottom) return;
      lastActive = true;
      lastTop = top;
      lastBottom = bottom;

      setPanelStyle({
        top: `${top}px`,
        bottom: `${bottom}px`,
        // Stay anchored to the right (matching the launcher) and capped at the
        // default card width, so on phones it fills the row while on tablets /
        // landscape it stays a tidy column instead of an ultra-wide sheet.
        left: 'auto',
        right: '1rem',
        width: 'calc(100vw - 2rem)',
        maxWidth: '24rem',
        height: 'auto',
        maxHeight: 'none',
      });

      // The viewport just shrank; keep the newest message in view.
      scrollToLatest();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(compute);
    };

    // Initial pass via rAF (the keyboard may already be up if the widget is
    // reopened mid-typing). Scheduling — rather than calling compute()
    // synchronously — keeps setState out of the effect body so it can't
    // trigger a cascading render.
    schedule();

    if (vv) {
      vv.addEventListener('resize', schedule);
      vv.addEventListener('scroll', schedule);
    }
    // Fallback / orientation changes when visualViewport is unavailable.
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      // Drop any keyboard geometry so the next open starts from the default
      // floating-card styling instead of a stale inline override.
      setPanelStyle(undefined);
      if (vv) {
        vv.removeEventListener('resize', schedule);
        vv.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
    };
  }, [open, scrollToLatest]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setError(false);
    setInput('');

    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Drop the local greeting; let the model open the real conversation.
        body: JSON.stringify({
          locale,
          messages: history.filter(
            (m, i) => !(i === 0 && m.role === 'assistant'),
          ),
        }),
      });

      if (!res.ok || !res.body) throw new Error('request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const chunk of events) {
          const line = chunk.replace(/^data: /, '').trim();
          if (!line) continue;
          let event: { type: string; value?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === 'text' && event.value) {
            const delta = event.value;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: 'assistant',
                content: next[next.length - 1].content + delta,
              };
              return next;
            });
          } else if (event.type === 'error') {
            throw new Error('stream error');
          }
        }
      }
    } catch {
      setError(true);
      // Remove the empty assistant placeholder on failure.
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.content === '') next.pop();
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Launcher bubble — sits above the cookie banner */}
      <button
        type="button"
        aria-label={t('open')}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {open ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <ChatIcon className="h-6 w-6" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('title')}
          style={panelStyle}
          className="fixed bottom-24 right-5 z-[60] flex h-[32rem] max-h-[calc(100dvh-7rem)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-secondary-dark bg-secondary-light shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{t('title')}</p>
              <p className="text-xs text-white/70">{t('poweredBy')}</p>
            </div>
            <button
              type="button"
              aria-label={t('close')}
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                }
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-white'
                      : 'rounded-bl-sm bg-white text-foreground shadow-sm'
                  }`}
                >
                  {m.content || <TypingDots />}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-center text-xs text-accent">{t('error')}</p>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-secondary-dark bg-secondary-light p-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('placeholder')}
                disabled={sending}
                className="flex-1 rounded-full border border-secondary-dark bg-white px-4 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label={t('send')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 px-1 text-center text-[10px] leading-tight text-foreground/50">
              {t('privacy')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-hidden>
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" />
    </span>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
