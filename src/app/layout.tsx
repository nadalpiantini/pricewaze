import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '@fontsource-variable/syne';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { getMarketConfig } from '@/config/market';

const inter = Inter({ subsets: ['latin'] });

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const market = getMarketConfig();

export const metadata: Metadata = {
  title: market.seo.titleSuffix
    ? `PriceMap - Real Estate Intelligence for ${market.seo.titleSuffix}`
    : 'PriceMap - AI-Powered Real Estate Intelligence',
  description: market.seo.description || 'Waze for Real Estate Pricing & Negotiation. Discover fair prices, make smarter offers, and close deals with confidence.',
  keywords: ['real estate', 'property', 'pricing', 'negotiation', ...market.seo.keywords],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'PriceMap - Real Estate Intelligence',
    description: 'Discover fair prices, make smarter offers, and close deals with confidence.',
    url: 'https://pricewaze.com',
    siteName: 'PriceMap',
    locale: market.currency.locale.replace('-', '_'),
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1024,
        height: 1024,
        alt: 'PriceWaze Logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${plusJakarta.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
