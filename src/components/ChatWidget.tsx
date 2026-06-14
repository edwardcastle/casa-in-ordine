'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
          className="fixed bottom-24 right-5 z-[60] flex h-[32rem] max-h-[calc(100vh-7rem)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-secondary-dark bg-secondary-light shadow-2xl"
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
