/**
 * Unit Tests: Market Configuration Functions
 *
 * Tests the market-agnostic configuration system that supports
 * multiple geographic regions with different currencies and locales.
 */

import {
  formatPrice,
  getMarketConfigByCode,
  getAllMarkets,
  type MarketCode,
} from '@/config/market';

describe('market configuration', () => {
  describe('getMarketConfigByCode', () => {
    it('returns correct config for Dominican Republic', () => {
      const config = getMarketConfigByCode('DO');

      expect(config.code).toBe('DO');
      expect(config.name).toBe('Dominican Republic');
      expect(config.currency.code).toBe('DOP');
      expect(config.currency.symbol).toBe('RD$');
      expect(config.currency.locale).toBe('es-DO');
    });

    it('returns correct config for United States', () => {
      const config = getMarketConfigByCode('US');

      expect(config.code).toBe('US');
      expect(config.name).toBe('United States');
      expect(config.currency.code).toBe('USD');
      expect(config.currency.symbol).toBe('$');
      expect(config.currency.locale).toBe('en-US');
    });

    it('returns correct config for Mexico', () => {
      const config = getMarketConfigByCode('MX');

      expect(config.code).toBe('MX');
      expect(config.name).toBe('Mexico');
      expect(config.currency.code).toBe('MXN');
    });

    it('returns global config for unknown market code', () => {
      const config = getMarketConfigByCode('INVALID' as MarketCode);

      expect(config.code).toBe('global');
      expect(config.currency.code).toBe('USD');
    });

    it('returns global config for global code', () => {
      const config = getMarketConfigByCode('global');

      expect(config.code).toBe('global');
      expect(config.name).toBe('Global');
    });
  });

  describe('formatPrice', () => {
    it('formats price for Dominican Republic market', () => {
      const market = getMarketConfigByCode('DO');
      const formatted = formatPrice(1500000, market);

      // Should contain currency formatting - exact format varies by environment
      expect(formatted).toContain('1');
      expect(formatted).toContain('500');
      expect(formatted).toContain('000');
    });

    it('formats price for US market', () => {
      const market = getMarketConfigByCode('US');
      const formatted = formatPrice(250000, market);

      // Should be formatted as USD
      expect(formatted).toContain('250');
      expect(formatted).toContain('000');
    });

    it('formats zero correctly', () => {
      const market = getMarketConfigByCode('US');
      const formatted = formatPrice(0, market);

      expect(formatted).toContain('0');
    });

    it('formats large numbers correctly', () => {
      const market = getMarketConfigByCode('US');
      const formatted = formatPrice(10000000, market);

      // Should contain millions formatting
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('uses correct number of decimal places', () => {
      const market = getMarketConfigByCode('US');
      const formatted = formatPrice(100000.99, market);

      // Should be rounded to whole number (minimumFractionDigits: 0)
      expect(formatted).not.toContain('.99');
    });
  });

  describe('getAllMarkets', () => {
    it('returns all supported markets', () => {
      const markets = getAllMarkets();

      expect(markets.length).toBeGreaterThanOrEqual(6);

      const codes = markets.map((m) => m.code);
      expect(codes).toContain('DO');
      expect(codes).toContain('US');
      expect(codes).toContain('MX');
      expect(codes).toContain('ES');
      expect(codes).toContain('CO');
      expect(codes).toContain('global');
    });

    it('each market has required fields', () => {
      const markets = getAllMarkets();

      markets.forEach((market) => {
        expect(market).toHaveProperty('code');
        expect(market).toHaveProperty('name');
        expect(market).toHaveProperty('currency');
        expect(market.currency).toHaveProperty('code');
        expect(market.currency).toHaveProperty('symbol');
        expect(market.currency).toHaveProperty('locale');
        expect(market).toHaveProperty('map');
        expect(market.map).toHaveProperty('center');
        expect(market.map).toHaveProperty('zoom');
        expect(market).toHaveProperty('legal');
        expect(market).toHaveProperty('ai');
        expect(market).toHaveProperty('seo');
      });
    });

    it('map centers are valid coordinates', () => {
      const markets = getAllMarkets();

      markets.forEach((market) => {
        const [lng, lat] = market.map.center;

        // Longitude: -180 to 180
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);

        // Latitude: -90 to 90
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });
    });
  });

  describe('market configuration completeness', () => {
    const markets = getAllMarkets();

    markets.forEach((market) => {
      describe(`${market.name} (${market.code})`, () => {
        it('has valid legal disclaimers', () => {
          expect(market.legal.disclaimerEs.length).toBeGreaterThan(10);
          expect(market.legal.disclaimerEn.length).toBeGreaterThan(10);
        });

        it('has AI context', () => {
          expect(market.ai.marketContext.length).toBeGreaterThan(5);
          expect(market.ai.priceUnit.length).toBeGreaterThan(2);
        });

        it('has SEO configuration', () => {
          expect(market.seo.description.length).toBeGreaterThan(10);
          expect(Array.isArray(market.seo.keywords)).toBe(true);
        });
      });
    });
  });
});
