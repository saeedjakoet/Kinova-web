import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['600'], variable: '--font-fraunces', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

export const metadata = {
  title: 'Kinova Breeding Advisor — PoC',
  description: 'Proof-of-concept workspace that helps snake breeders explore pairings and understand the reasoning behind each recommendation.',
};

export const viewport = {
  themeColor: '#1F3A2E',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-ivory-50 text-charcoal-900">{children}</body>
    </html>
  );
}
