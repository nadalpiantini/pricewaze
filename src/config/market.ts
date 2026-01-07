/**
 * Market Configuration System
 * Centralizes all market-specific settings for multi-region support
 */

export type MarketCode = 'DO' | 'US' | 'MX' | 'ES' | 'CO' | 'global';

export interface MarketConfig {
  code: MarketCode;
  name: string;
  currency: {
    code: string;
    symbol: string;
    locale: string;
  };
  map: {
    center: [number, number]; // [lng, lat]
    zoom: number;
    bounds?: [[number, number], [number, number]];
  };
  legal: {
    jurisdiction: string;
    disclaimerEs: string;
    disclaimerEn: string;
    contractLaw: string;
  };
  ai: {
    marketContext: string;
    priceUnit: string;
  };
  seo: {
    titleSuffix: string;
    description: string;
    keywords: string[];
  };
}

const MARKET_CONFIGS: Record<MarketCode, MarketConfig> = {
  DO: {
    code: 'DO',
    name: 'Dominican Republic',
    currency: {
      code: 'DOP',
      symbol: 'RD$',
      locale: 'es-DO',
    },
    map: {
      center: [-69.9312, 18.4861], // Santo Domingo
      zoom: 12,
      bounds: [[-72.0, 17.5], [-68.3, 20.0]],
    },
    legal: {
      jurisdiction: 'Dominican Republic',
      disclaimerEs: 'Consulte con un abogado licenciado en la República Dominicana',
      disclaimerEn: 'Consult with a licensed attorney in the Dominican Republic',
      contractLaw: 'Dominican Republic Civil Code and Property Law',
    },
    ai: {
      marketContext: 'Dominican Republic real estate market',
      priceUnit: 'DOP (Dominican Pesos)',
    },
    seo: {
      titleSuffix: 'Dominican Republic',
      description: 'Real estate intelligence for the Dominican Republic market',
      keywords: ['Dominican Republic', 'Santo Domingo', 'Punta Cana', 'real estate'],
    },
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: {
      code: 'USD',
      symbol: '$',
      locale: 'en-US',
    },
    map: {
      center: [-98.5795, 39.8283], // Geographic center of US
      zoom: 4,
    },
    legal: {
      jurisdiction: 'United States',
      disclaimerEs: 'Consulte con un abogado licenciado en su estado',
      disclaimerEn: 'Consult with a licensed attorney in your state',
      contractLaw: 'State real estate laws apply',
    },
    ai: {
      marketContext: 'United States real estate market',
      priceUnit: 'USD (US Dollars)',
    },
    seo: {
      titleSuffix: 'United States',
      description: 'AI-powered real estate intelligence for the US market',
      keywords: ['USA', 'real estate', 'property', 'homes'],
    },
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    currency: {
      code: 'MXN',
      symbol: 'MX$',
      locale: 'es-MX',
    },
    map: {
      center: [-99.1332, 19.4326], // Mexico City
      zoom: 10,
    },
    legal: {
      jurisdiction: 'Mexico',
      disclaimerEs: 'Consulte con un abogado licenciado en México',
      disclaimerEn: 'Consult with a licensed attorney in Mexico',
      contractLaw: 'Mexican Civil Code and Property Law',
    },
    ai: {
      marketContext: 'Mexican real estate market',
      priceUnit: 'MXN (Mexican Pesos)',
    },
    seo: {
      titleSuffix: 'Mexico',
      description: 'Inteligencia inmobiliaria para el mercado mexicano',
      keywords: ['México', 'bienes raíces', 'propiedades', 'inmuebles'],
    },
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    currency: {
      code: 'EUR',
      symbol: '€',
      locale: 'es-ES',
    },
    map: {
      center: [-3.7038, 40.4168], // Madrid
      zoom: 10,
    },
    legal: {
      jurisdiction: 'Spain',
      disclaimerEs: 'Consulte con un abogado licenciado en España',
      disclaimerEn: 'Consult with a licensed attorney in Spain',
      contractLaw: 'Spanish Civil Code and Property Law',
    },
    ai: {
      marketContext: 'Spanish real estate market',
      priceUnit: 'EUR (Euros)',
    },
    seo: {
      titleSuffix: 'Spain',
      description: 'Inteligencia inmobiliaria para el mercado español',
      keywords: ['España', 'inmobiliaria', 'propiedades', 'viviendas'],
    },
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    currency: {
      code: 'COP',
      symbol: 'COP$',
      locale: 'es-CO',
    },
    map: {
      center: [-74.0721, 4.7110], // Bogotá
      zoom: 10,
    },
    legal: {
      jurisdiction: 'Colombia',
      disclaimerEs: 'Consulte con un abogado licenciado en Colombia',
      disclaimerEn: 'Consult with a licensed attorney in Colombia',
      contractLaw: 'Colombian Civil Code and Property Law',
    },
    ai: {
      marketContext: 'Colombian real estate market',
      priceUnit: 'COP (Colombian Pesos)',
    },
    seo: {
      titleSuffix: 'Colombia',
      description: 'Inteligencia inmobiliaria para el mercado colombiano',
      keywords: ['Colombia', 'Bogotá', 'Medellín', 'finca raíz'],
    },
  },
  global: {
    code: 'global',
    name: 'Global',
    currency: {
      code: 'USD',
      symbol: '$',
      locale: 'en-US',
    },
    map: {
      center: [0, 20],
      zoom: 2,
    },
    legal: {
      jurisdiction: 'varies by location',
      disclaimerEs: 'Consulte con un abogado licenciado en su jurisdicción local',
      disclaimerEn: 'Consult with a licensed attorney in your local jurisdiction',
      contractLaw: 'Local property laws apply',
    },
    ai: {
      marketContext: 'international real estate market',
      priceUnit: 'USD (US Dollars)',
    },
    seo: {
      titleSuffix: '',
      description: 'AI-powered real estate intelligence platform',
      keywords: ['real estate', 'property', 'pricing', 'negotiation'],
    },
  },
};

/**
 * Get the current market configuration
 * Reads from NEXT_PUBLIC_MARKET_CODE env var, defaults to 'global'
 */
export function getMarketConfig(): MarketConfig {
  const marketCode = (process.env.NEXT_PUBLIC_MARKET_CODE as MarketCode) || 'global';
  return MARKET_CONFIGS[marketCode] || MARKET_CONFIGS.global;
}

/**
 * Get a specific market configuration by code
 */
export function getMarketConfigByCode(code: MarketCode): MarketConfig {
  return MARKET_CONFIGS[code] || MARKET_CONFIGS.global;
}

/**
 * Get all available market configurations
 */
export function getAllMarkets(): MarketConfig[] {
  return Object.values(MARKET_CONFIGS);
}

/**
 * Format price according to market locale
 */
export function formatPrice(amount: number, market?: MarketConfig): string {
  const config = market || getMarketConfig();
  return new Intl.NumberFormat(config.currency.locale, {
    style: 'currency',
    currency: config.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get AI prompt context for the current market
 */
export function getAIMarketContext(): string {
  const config = getMarketConfig();
  return `You are a real estate analyst for the ${config.ai.marketContext}. Prices are typically quoted in ${config.ai.priceUnit}.`;
}

/**
 * Get legal disclaimer in specified language
 */
export function getLegalDisclaimer(lang: 'es' | 'en' = 'en'): string {
  const config = getMarketConfig();
  return lang === 'es' ? config.legal.disclaimerEs : config.legal.disclaimerEn;
}

// Export current market config for easy access
export const currentMarket = getMarketConfig();
