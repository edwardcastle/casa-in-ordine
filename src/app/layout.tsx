import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casa in Ordine',
  description: 'Decluttering & Home Organizing a Roma',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
