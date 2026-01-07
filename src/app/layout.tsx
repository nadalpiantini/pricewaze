import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { getMarketConfig } from '@/config/market';

const inter = Inter({ subsets: ['latin'] });

const market = getMarketConfig();

export const metadata: Metadata = {
  title: market.seo.titleSuffix
    ? `PriceMap - Real Estate Intelligence for ${market.seo.titleSuffix}`
    : 'PriceMap - AI-Powered Real Estate Intelligence',
  description: market.seo.description || 'Waze for Real Estate Pricing & Negotiation. Discover fair prices, make smarter offers, and close deals with confidence.',
  keywords: ['real estate', 'property', 'pricing', 'negotiation', ...market.seo.keywords],
  openGraph: {
    title: 'PriceMap - Real Estate Intelligence',
    description: 'Discover fair prices, make smarter offers, and close deals with confidence.',
    url: 'https://pricewaze.com',
    siteName: 'PriceMap',
    locale: market.currency.locale.replace('-', '_'),
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
