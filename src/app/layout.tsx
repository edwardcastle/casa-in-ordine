import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casa in Ordine',
  description: 'Decluttering & Home Organizing a Roma',
};

// Android Chrome / Chromium: shrink the LAYOUT viewport when the on-screen
// keyboard opens so fixed/dvh elements sit above it natively. Ignored by iOS
// Safari (handled via window.visualViewport in ChatWidget) and inert on
// desktop. width/initial-scale match Next.js' defaults, so this adds no
// behavioral change beyond improving Android keyboard handling.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
