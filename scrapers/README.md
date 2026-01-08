# PriceWaze Scrapers

Apify actors for scraping Dominican Republic real estate listings.

## Structure

```
scrapers/
├── shared/              # Shared utilities
│   ├── normalize.js     # Unified normalization layer
│   ├── schema.js        # Zod validation schemas
│   └── package.json
├── supercasas-scraper/  # SuperCasas.com scraper
│   ├── .actor/          # Apify actor config
│   ├── src/main.js      # Main scraper code
│   └── package.json
└── corotos-scraper/     # Corotos.com.do scraper
    ├── .actor/          # Apify actor config
    ├── src/main.js      # Main scraper code
    └── package.json
```

## Normalized Output Schema

All scrapers output the same normalized schema:

```typescript
{
  id: string;           // SHA-1 hash of source:url
  source: string;       // 'supercasas' | 'corotos'
  url: string;          // Original listing URL

  priceText: string;    // Original price text
  priceNumeric: number; // Parsed numeric price
  currency: 'USD' | 'DOP';

  country: 'DO';
  city: string | null;
  zone: string | null;
  address: string | null;

  propertyType: 'apartamento' | 'casa' | 'terreno' | 'local' | 'oficina' | 'industrial' | 'inmueble';
  transactionType: 'venta' | 'alquiler';
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;

  title: string;
  description: string | null;
  images: string[];

  publishedDate: string | null;
  sellerName: string | null;
  scrapedAt: string;    // ISO datetime
}
```

## Deployment

Each scraper is deployed as a separate Apify Actor:

```bash
cd supercasas-scraper
apify push
```

## Webhook Integration

Scrapers send results to `/api/webhook/apify` with:
- `Authorization: Bearer <WEBHOOK_SECRET>`
- `X-Source: <source_name>`

## Local Development

```bash
cd supercasas-scraper
npm install
npm start
```
