'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AnimatedCounter } from './ui/AnimatedCounter';
import { PulsingDot } from './ui/SignalArcs';
import { cn } from '@/lib/utils';

const footerLinks = {
  product: [
    { label: 'Características', href: '#features' },
    { label: 'Cómo funciona', href: '#how-it-works' },
    { label: 'Precios', href: '/pricing' },
    { label: 'API', href: '/api-docs' },
  ],
  company: [
    { label: 'Sobre nosotros', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Carreras', href: '/careers' },
    { label: 'Contacto', href: '/contact' },
  ],
  legal: [
    { label: 'Privacidad', href: '/privacy' },
    { label: 'Términos', href: '/terms' },
    { label: 'Cookies', href: '/cookies' },
  ],
  social: [
    { label: 'Twitter', href: 'https://twitter.com/pricemap' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/pricemap' },
    { label: 'Instagram', href: 'https://instagram.com/pricemap' },
  ],
};

interface FooterProps {
  stats?: {
    users: number;
    offers: number;
    zones: number;
  };
}

export function Footer({
  stats = { users: 3892, offers: 12453, zones: 47 },
}: FooterProps) {
  return (
    <footer className="relative bg-[var(--landing-bg-deep)] border-t border-white/5">
      {/* Community Stats Bar */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-2">
              <PulsingDot size="sm" color="green" />
              <span className="text-sm text-[var(--landing-text-muted)]">
                <AnimatedCounter value={stats.users} /> usuarios activos
              </span>
            </div>
            <div className="text-sm text-[var(--landing-text-muted)]">
              <AnimatedCounter value={stats.offers} /> ofertas registradas
            </div>
            <div className="text-sm text-[var(--landing-text-muted)]">
              <AnimatedCounter value={stats.zones} /> zonas con datos
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="PriceMap"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-[var(--landing-text-primary)]">
                PriceMap
              </span>
            </Link>
            <p className="text-sm text-[var(--landing-text-muted)] mb-4">
              Inteligencia inmobiliaria crowdsourced. Juntos descubrimos el
              precio real.
            </p>
            <p className="text-xs text-[var(--landing-text-muted)]">
              Made with ❤️ by the community
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-[var(--landing-text-primary)] mb-4 text-sm">
              Producto
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm text-[var(--landing-text-muted)]',
                      'hover:text-[var(--signal-cyan)] transition-colors'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-[var(--landing-text-primary)] mb-4 text-sm">
              Compañía
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm text-[var(--landing-text-muted)]',
                      'hover:text-[var(--signal-cyan)] transition-colors'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-[var(--landing-text-primary)] mb-4 text-sm">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm text-[var(--landing-text-muted)]',
                      'hover:text-[var(--signal-cyan)] transition-colors'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="font-semibold text-[var(--landing-text-primary)] mb-4 text-sm">
              Social
            </h4>
            <ul className="space-y-3">
              {footerLinks.social.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'text-sm text-[var(--landing-text-muted)]',
                      'hover:text-[var(--signal-cyan)] transition-colors'
                    )}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--landing-text-muted)]">
            © {new Date().getFullYear()} PriceMap. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-[var(--landing-text-muted)]">
              República Dominicana 🇩🇴
            </span>
            <span className="text-xs text-[var(--landing-text-muted)]">
              Español
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
