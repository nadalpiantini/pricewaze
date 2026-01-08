/**
 * PriceWaze Listing Schema
 *
 * Zod validation for normalized real estate listings
 * All scrapers must produce data that passes this schema
 */

import { z } from 'zod';

// Property types enum
export const PropertyType = z.enum([
    'apartamento',
    'casa',
    'terreno',
    'local',
    'oficina',
    'industrial',
    'inmueble', // fallback
]);

// Transaction types enum
export const TransactionType = z.enum([
    'venta',
    'alquiler',
]);

// Currency enum
export const Currency = z.enum([
    'USD',
    'DOP',
]);

// Source enum - add new sources here
export const Source = z.enum([
    'supercasas',
    'corotos',
    // Future sources:
    // 'infocasas',
    // 'encuentra24',
]);

/**
 * Main Listing Schema
 *
 * This is the canonical schema for all scraped listings.
 * Any data that doesn't pass this validation is rejected.
 */
export const ListingSchema = z.object({
    // === IDENTIFICATION ===
    id: z.string()
        .length(40, 'ID must be 40-char SHA-1 hash')
        .regex(/^[a-f0-9]+$/, 'ID must be hexadecimal'),

    source: Source,

    url: z.string()
        .url('Must be valid URL')
        .startsWith('https://', 'Must use HTTPS'),

    // === PRICING ===
    priceText: z.string()
        .min(1, 'Price text required')
        .nullable(),

    priceNumeric: z.number()
        .int('Price must be integer')
        .min(1000, 'Price too low (min 1000)')
        .max(100_000_000_000, 'Price too high'),

    currency: Currency,

    // === LOCATION ===
    country: z.literal('DO'), // Dominican Republic only for now

    city: z.string()
        .min(2, 'City name too short')
        .max(100, 'City name too long')
        .nullable(),

    zone: z.string()
        .min(2, 'Zone name too short')
        .max(100, 'Zone name too long')
        .nullable(),

    address: z.string()
        .max(500, 'Address too long')
        .nullable(),

    // === PROPERTY DETAILS ===
    propertyType: PropertyType,

    transactionType: TransactionType,

    areaM2: z.number()
        .positive('Area must be positive')
        .max(1_000_000, 'Area too large')
        .nullable(),

    bedrooms: z.number()
        .int()
        .min(0)
        .max(50, 'Too many bedrooms')
        .nullable(),

    bathrooms: z.number()
        .min(0)
        .max(50, 'Too many bathrooms')
        .nullable(),

    parking: z.number()
        .int()
        .min(0)
        .max(100, 'Too many parking spots')
        .nullable(),

    // === CONTENT ===
    title: z.string()
        .min(5, 'Title too short')
        .max(500, 'Title too long'),

    description: z.string()
        .max(10000, 'Description too long')
        .nullable(),

    images: z.array(z.string().url())
        .max(50, 'Too many images')
        .default([]),

    // === METADATA ===
    publishedDate: z.string()
        .nullable(),

    sellerName: z.string()
        .max(200, 'Seller name too long')
        .nullable(),

    scrapedAt: z.string()
        .datetime('Must be ISO datetime'),
});

// Type export for TypeScript users
export const ListingType = ListingSchema;

/**
 * Validate a listing and return result
 * @param {Object} data - Raw listing data
 * @returns {{ success: boolean, data?: Object, error?: Object }}
 */
export function validateListing(data) {
    const result = ListingSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Format errors for logging
    const errors = result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        received: issue.received,
    }));

    return { success: false, errors };
}

/**
 * Validate listing or throw
 * @param {Object} data - Raw listing data
 * @returns {Object} Validated listing
 * @throws {z.ZodError} If validation fails
 */
export function parseListingOrThrow(data) {
    return ListingSchema.parse(data);
}

/**
 * Partial schema for updates (all fields optional except id)
 */
export const PartialListingSchema = ListingSchema.partial().required({ id: true });

/**
 * Schema for batch webhook payload
 */
export const WebhookPayloadSchema = z.object({
    source: Source,
    items: z.array(ListingSchema).min(1, 'At least one item required'),
    run_id: z.string().nullable(),
    actor_id: z.string().nullable(),
    timestamp: z.string().datetime(),
});

/**
 * Validate webhook payload
 */
export function validateWebhookPayload(data) {
    return WebhookPayloadSchema.safeParse(data);
}
