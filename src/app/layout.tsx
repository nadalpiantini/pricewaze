import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '@fontsource-variable/syne';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import { getMarketConfig } from '@/config/market';

const inter = Inter({ subsets: ['latin'] });

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const market = getMarketConfig();

// Determine metadata base URL based on environment
const metadataBase = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.NODE_ENV === 'production'
  ? new URL('https://www.pricewaze.com')
  : new URL('http://localhost:3000');

export const metadata: Metadata = {
  metadataBase,
  title: market.seo.titleSuffix
    ? `PriceMap - Real Estate Intelligence for ${market.seo.titleSuffix}`
    : 'PriceMap - AI-Powered Real Estate Intelligence',
  description: market.seo.description || 'Waze for Real Estate Pricing & Negotiation. Discover fair prices, make smarter offers, and close deals with confidence.',
  keywords: ['real estate', 'property', 'pricing', 'negotiation', ...market.seo.keywords],
  manifest: '/manifest.json',
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
    url: 'https://www.pricewaze.com',
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
      <body 
        className={`${inter.className} ${plusJakarta.variable} antialiased`}
        suppressHydrationWarning
        // Suppress hydration warnings caused by browser extensions
        // Extensions like password managers, automation tools, etc. can modify the DOM
      >
        <Providers>{children}</Providers>
        <PWAProvider />
        <Toaster />
      </body>
    </html>
  );
}
