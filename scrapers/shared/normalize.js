/**
 * Shared Normalization Layer for PriceWaze Scrapers
 *
 * All scrapers MUST use this module to ensure consistent output schema
 */

import crypto from 'crypto';
import { Dataset } from 'crawlee';
import { validateListing } from './schema.js';

/**
 * Normalize and save a listing with consistent schema
 * @param {Object} options
 * @param {Object} options.raw - Raw scraped data
 * @param {string} options.url - Listing URL
 * @param {string} options.source - Source identifier (supercasas, corotos, etc)
 * @param {string} options.inputCity - City from input config
 * @param {string} options.transactionType - venta or alquiler
 * @param {number} options.maxItems - Maximum items to scrape
 * @param {Object} options.log - Crawlee logger
 * @param {boolean} options.skipValidation - Skip Zod validation (not recommended)
 * @returns {Promise<boolean>} - Whether the listing was saved
 */
export async function normalizeAndSave({
    raw,
    url,
    source,
    inputCity,
    transactionType,
    maxItems,
    log,
    skipValidation = false
}) {
    // Strict maxItems control
    const dataset = await Dataset.open();
    const { itemCount } = await dataset.getInfo() || { itemCount: 0 };

    if (itemCount >= maxItems) {
        log.info(`Max items reached (${maxItems}), skipping save`);
        return false;
    }

    // Parse price
    const { priceNumeric, currency } = parsePrice(raw.price);

    if (!priceNumeric || priceNumeric < 1000) {
        log.warning(`Skipping invalid price: ${raw.price}`);
        return false;
    }

    // Parse location
    const { city, zone } = parseLocation(raw.location, inputCity);

    // Generate stable unique ID
    const id = generateId(source, url);

    // Normalized output schema
    const normalizedListing = {
        // Identification
        id,
        source,
        url,

        // Pricing
        priceText: raw.price,
        priceNumeric,
        currency,

        // Location
        country: 'DO',
        city,
        zone,
        address: raw.location,

        // Property details
        propertyType: normalizePropertyType(raw.propertyType),
        transactionType,
        areaM2: parseNumber(raw.areaM2),
        bedrooms: parseNumber(raw.bedrooms),
        bathrooms: parseNumber(raw.bathrooms),
        parking: parseNumber(raw.parking),

        // Content
        title: raw.title,
        description: raw.description ?? null,
        images: raw.images ?? [],

        // Metadata
        publishedDate: raw.publishedDate ?? null,
        sellerName: raw.sellerName ?? null,
        scrapedAt: new Date().toISOString()
    };

    // Validate with Zod schema
    if (!skipValidation) {
        const validation = validateListing(normalizedListing);

        if (!validation.success) {
            log.error(`❌ Validation failed for ${url}:`, validation.errors);
            return false;
        }
    }

    await Dataset.pushData(normalizedListing);

    log.info(`✅ Saved: ${normalizedListing.title?.substring(0, 50)}...`, {
        source,
        price: `${currency} ${priceNumeric.toLocaleString()}`,
        city,
        zone,
        type: normalizedListing.propertyType
    });

    return true;
}

/**
 * Parse price text into numeric value and currency
 */
export function parsePrice(text) {
    if (!text) return { priceNumeric: null, currency: null };

    const t = text.toUpperCase().trim();

    // Detect currency
    let currency = 'USD';
    if (t.includes('RD$') || t.includes('RD ') || t.includes('DOP') || t.includes('PESOS')) {
        currency = 'DOP';
    }

    // Handle "A consultar" or similar
    if (t.includes('CONSULT') || t.includes('NEGOCIABLE') || t.includes('LLAMAR')) {
        return { priceNumeric: null, currency };
    }

    // Extract numeric value
    const match = t.match(/([\d,.]+)/);
    if (!match) return { priceNumeric: null, currency };

    // Remove thousand separators and parse
    const priceNumeric = parseInt(match[1].replace(/[.,]/g, ''), 10);

    return { priceNumeric, currency };
}

/**
 * Parse location into city and zone components
 */
export function parseLocation(location, fallbackCity) {
    if (!location) return { city: fallbackCity, zone: null };

    // Split by comma and clean up
    const parts = location
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return { city: fallbackCity, zone: null };
    }

    if (parts.length === 1) {
        return { city: parts[0], zone: null };
    }

    // First part is usually zone/neighborhood, last part is city
    return {
        zone: parts[0],
        city: parts[parts.length - 1]
    };
}

/**
 * Generate stable unique ID using SHA-1 hash
 */
export function generateId(source, url) {
    return crypto.createHash('sha1').update(`${source}:${url}`).digest('hex');
}

/**
 * Normalize property type to standard values
 */
export function normalizePropertyType(type) {
    if (!type) return 'inmueble';

    const t = type.toLowerCase().trim();

    if (t.includes('apartamento') || t.includes('apt') || t.includes('penthouse')) {
        return 'apartamento';
    }
    if (t.includes('casa') || t.includes('villa') || t.includes('townhouse')) {
        return 'casa';
    }
    if (t.includes('terreno') || t.includes('solar') || t.includes('lote')) {
        return 'terreno';
    }
    if (t.includes('local') || t.includes('comercial')) {
        return 'local';
    }
    if (t.includes('oficina')) {
        return 'oficina';
    }
    if (t.includes('nave') || t.includes('industrial') || t.includes('bodega')) {
        return 'industrial';
    }

    return 'inmueble';
}

/**
 * Parse number from various formats
 */
export function parseNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;

    const str = String(value);
    const match = str.match(/[\d,.]+/);
    if (!match) return null;

    // Handle decimal formats (e.g., "150.5" or "150,5")
    const num = parseFloat(match[0].replace(',', '.'));
    return isNaN(num) ? null : num;
}

/**
 * Send results to webhook with proper error handling
 */
export async function sendToWebhook({ webhookUrl, webhookSecret, items, source, actorRunId, actorId, log }) {
    if (!webhookUrl || items.length === 0) {
        return { sent: false, reason: 'No webhook URL or no items' };
    }

    log.info(`📤 Sending ${items.length} items to webhook: ${webhookUrl}`);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${webhookSecret}`,
                'X-Source': source,
                'X-Actor-Run-Id': actorRunId || 'unknown',
            },
            body: JSON.stringify({
                source,
                items,
                run_id: actorRunId,
                actor_id: actorId,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            log.error(`❌ Webhook failed: ${response.status} - ${errorText}`);
            return { sent: false, status: response.status, error: errorText };
        }

        const result = await response.json();
        log.info(`✅ Webhook success:`, result);
        return { sent: true, result };

    } catch (error) {
        log.error(`❌ Webhook error: ${error.message}`);
        return { sent: false, error: error.message };
    }
}
