import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PriceMap - Real Estate Intelligence for Dominican Republic',
  description: 'Waze for Real Estate Pricing & Negotiation. Discover fair prices, make smarter offers, and close deals with confidence.',
  keywords: ['real estate', 'Dominican Republic', 'property', 'pricing', 'negotiation'],
  openGraph: {
    title: 'PriceMap - Real Estate Intelligence',
    description: 'Discover fair prices, make smarter offers, and close deals with confidence.',
    url: 'https://pricewaze.com',
    siteName: 'PriceMap',
    locale: 'en_US',
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
