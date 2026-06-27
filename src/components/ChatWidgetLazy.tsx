'use client';

import dynamic from 'next/dynamic';

// Defers the chat widget to a client-only chunk loaded after hydration. The
// launcher is a below-the-fold, click-to-open control with no first-paint or
// LCP role, so keeping its ~client JS out of the initial SSR/hydration path on
// every route is pure win. Rendered inside NextIntlClientProvider in the layout,
// so the widget's useTranslations/useLocale hooks still resolve.
const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

export default function ChatWidgetLazy() {
  return <ChatWidget />;
}
