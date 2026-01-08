/**
 * Cross-Source Deduplication for PriceWaze
 *
 * Detects duplicate listings across different sources (SuperCasas, Corotos, etc.)
 * Uses multiple signals to identify the same property:
 * - Price similarity
 * - Location matching
 * - Property attributes (bedrooms, bathrooms, area)
 * - Title/description similarity
 * - Image hashing (future)
 */

import crypto from 'crypto';
import { normalizeZone, normalizeCity } from './zones.js';

/**
 * Configuration for deduplication thresholds
 */
const DEDUP_CONFIG = {
    // Minimum similarity score to consider as duplicate (0-1)
    DUPLICATE_THRESHOLD: 0.75,

    // Weight for each signal in the final score
    WEIGHTS: {
        price: 0.25,        // Price within tolerance
        location: 0.30,     // Same city + zone
        attributes: 0.25,   // Bedrooms, bathrooms, area match
        title: 0.20,        // Title similarity
    },

    // Price tolerance (percentage difference allowed)
    PRICE_TOLERANCE: 0.05, // 5%

    // Area tolerance (percentage difference allowed)
    AREA_TOLERANCE: 0.10, // 10%
};

/**
 * Generate a fingerprint for a listing
 * Used for quick lookup before detailed comparison
 *
 * Fingerprint format: city|zone|price_bucket|beds|baths
 */
export function generateFingerprint(listing) {
    const city = normalizeCity(listing.city) || 'unknown';
    const zone = normalizeZone(listing.zone) || 'unknown';

    // Price bucket (rounded to nearest 10k for USD, 500k for DOP)
    const priceBucket = listing.currency === 'DOP'
        ? Math.round(listing.priceNumeric / 500000) * 500000
        : Math.round(listing.priceNumeric / 10000) * 10000;

    const beds = listing.bedrooms ?? 'x';
    const baths = listing.bathrooms ?? 'x';

    const fingerprint = `${city}|${zone}|${priceBucket}|${beds}|${baths}`.toLowerCase();

    return crypto.createHash('md5').update(fingerprint).digest('hex').substring(0, 16);
}

/**
 * Calculate price similarity score
 * Returns 1.0 if prices are within tolerance, decreasing as difference grows
 */
function calculatePriceSimilarity(listing1, listing2) {
    // Must be same currency for comparison
    if (listing1.currency !== listing2.currency) {
        // Could add currency conversion here
        return 0;
    }

    const price1 = listing1.priceNumeric;
    const price2 = listing2.priceNumeric;

    if (!price1 || !price2) return 0;

    const diff = Math.abs(price1 - price2);
    const avg = (price1 + price2) / 2;
    const percentDiff = diff / avg;

    if (percentDiff <= DEDUP_CONFIG.PRICE_TOLERANCE) {
        return 1.0;
    }

    // Gradual decrease after tolerance
    return Math.max(0, 1 - (percentDiff - DEDUP_CONFIG.PRICE_TOLERANCE) * 5);
}

/**
 * Calculate location similarity score
 */
function calculateLocationSimilarity(listing1, listing2) {
    const city1 = normalizeCity(listing1.city);
    const city2 = normalizeCity(listing2.city);
    const zone1 = normalizeZone(listing1.zone);
    const zone2 = normalizeZone(listing2.zone);

    // Must be same city
    if (city1 !== city2) return 0;

    // Same city + same zone = perfect match
    if (zone1 && zone2 && zone1 === zone2) return 1.0;

    // Same city, different/missing zone
    if (zone1 && zone2 && zone1 !== zone2) return 0.3;

    // Same city, one zone missing
    return 0.5;
}

/**
 * Calculate attribute similarity score
 * Compares bedrooms, bathrooms, area
 */
function calculateAttributeSimilarity(listing1, listing2) {
    let matchCount = 0;
    let totalAttributes = 0;

    // Bedrooms
    if (listing1.bedrooms != null && listing2.bedrooms != null) {
        totalAttributes++;
        if (listing1.bedrooms === listing2.bedrooms) {
            matchCount++;
        }
    }

    // Bathrooms
    if (listing1.bathrooms != null && listing2.bathrooms != null) {
        totalAttributes++;
        if (listing1.bathrooms === listing2.bathrooms) {
            matchCount++;
        }
    }

    // Area (with tolerance)
    if (listing1.areaM2 != null && listing2.areaM2 != null) {
        totalAttributes++;
        const areaDiff = Math.abs(listing1.areaM2 - listing2.areaM2);
        const areaAvg = (listing1.areaM2 + listing2.areaM2) / 2;
        if (areaDiff / areaAvg <= DEDUP_CONFIG.AREA_TOLERANCE) {
            matchCount++;
        }
    }

    // Property type
    if (listing1.propertyType && listing2.propertyType) {
        totalAttributes++;
        if (listing1.propertyType === listing2.propertyType) {
            matchCount++;
        }
    }

    // Transaction type
    if (listing1.transactionType && listing2.transactionType) {
        totalAttributes++;
        if (listing1.transactionType === listing2.transactionType) {
            matchCount++;
        }
    }

    if (totalAttributes === 0) return 0.5; // No attributes to compare

    return matchCount / totalAttributes;
}

/**
 * Calculate title similarity using Jaccard index
 */
function calculateTitleSimilarity(listing1, listing2) {
    const title1 = listing1.title?.toLowerCase() || '';
    const title2 = listing2.title?.toLowerCase() || '';

    if (!title1 || !title2) return 0;

    // Tokenize: split by non-alphanumeric, remove stopwords
    const stopwords = new Set([
        'en', 'de', 'la', 'el', 'los', 'las', 'un', 'una', 'para', 'con', 'por',
        'se', 'vende', 'alquila', 'renta', 'venta', 'alquiler',
        'apartamento', 'casa', 'terreno', 'local', 'oficina', // Property types
        'hab', 'habitaciones', 'baños', 'banos', 'm2', 'metros',
    ]);

    const tokenize = (text) => {
        return text
            .split(/[^a-záéíóúñü0-9]+/i)
            .filter(t => t.length > 2 && !stopwords.has(t));
    };

    const tokens1 = new Set(tokenize(title1));
    const tokens2 = new Set(tokenize(title2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    // Jaccard similarity
    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
}

/**
 * Calculate overall similarity score between two listings
 * @returns {{ score: number, breakdown: Object }}
 */
export function calculateSimilarity(listing1, listing2) {
    const breakdown = {
        price: calculatePriceSimilarity(listing1, listing2),
        location: calculateLocationSimilarity(listing1, listing2),
        attributes: calculateAttributeSimilarity(listing1, listing2),
        title: calculateTitleSimilarity(listing1, listing2),
    };

    const score =
        breakdown.price * DEDUP_CONFIG.WEIGHTS.price +
        breakdown.location * DEDUP_CONFIG.WEIGHTS.location +
        breakdown.attributes * DEDUP_CONFIG.WEIGHTS.attributes +
        breakdown.title * DEDUP_CONFIG.WEIGHTS.title;

    return { score, breakdown };
}

/**
 * Check if two listings are duplicates
 */
export function isDuplicate(listing1, listing2) {
    // Quick check: same source = not a cross-source duplicate
    if (listing1.source === listing2.source) {
        return false;
    }

    const { score } = calculateSimilarity(listing1, listing2);
    return score >= DEDUP_CONFIG.DUPLICATE_THRESHOLD;
}

/**
 * Find duplicates for a listing in a list
 * @param {Object} listing - The listing to check
 * @param {Array} existingListings - List of existing listings
 * @returns {Array} - Array of duplicate matches with scores
 */
export function findDuplicates(listing, existingListings) {
    const duplicates = [];

    for (const existing of existingListings) {
        // Skip same source
        if (listing.source === existing.source) continue;

        const { score, breakdown } = calculateSimilarity(listing, existing);

        if (score >= DEDUP_CONFIG.DUPLICATE_THRESHOLD) {
            duplicates.push({
                listing: existing,
                score,
                breakdown,
            });
        }
    }

    // Sort by score descending
    return duplicates.sort((a, b) => b.score - a.score);
}

/**
 * Merge duplicate listings into a canonical record
 * Prefers data from more trusted sources
 */
export function mergeListings(listings) {
    if (listings.length === 0) return null;
    if (listings.length === 1) return listings[0];

    // Source trust ranking
    const sourceTrust = {
        'supercasas': 2,
        'corotos': 1,
    };

    // Sort by trust (higher = more trusted)
    const sorted = [...listings].sort((a, b) => {
        return (sourceTrust[b.source] || 0) - (sourceTrust[a.source] || 0);
    });

    // Base is the most trusted source
    const merged = { ...sorted[0] };

    // Track all source IDs
    merged.sourceIds = listings.map(l => ({ source: l.source, id: l.id, url: l.url }));

    // Fill in missing data from other sources
    for (const listing of sorted.slice(1)) {
        // Fill nulls from lower-trust sources
        for (const key of ['areaM2', 'bedrooms', 'bathrooms', 'parking', 'description']) {
            if (merged[key] == null && listing[key] != null) {
                merged[key] = listing[key];
            }
        }

        // Merge images (deduplicate by URL)
        if (listing.images?.length > 0) {
            const existingImages = new Set(merged.images || []);
            for (const img of listing.images) {
                if (!existingImages.has(img)) {
                    merged.images = merged.images || [];
                    merged.images.push(img);
                }
            }
        }
    }

    // Generate new ID for merged record
    merged.id = crypto.createHash('sha1')
        .update(`merged:${merged.sourceIds.map(s => s.id).sort().join(':')}`)
        .digest('hex');

    merged.isMerged = true;
    merged.mergedAt = new Date().toISOString();

    return merged;
}

/**
 * Deduplicate a batch of listings
 * Returns unique listings with duplicates merged
 */
export function deduplicateBatch(listings) {
    const groups = new Map(); // fingerprint -> listings[]

    // Group by fingerprint
    for (const listing of listings) {
        const fp = generateFingerprint(listing);

        if (!groups.has(fp)) {
            groups.set(fp, []);
        }
        groups.get(fp).push(listing);
    }

    const results = [];

    // Process each group
    for (const [, group] of groups) {
        if (group.length === 1) {
            // No potential duplicates
            results.push(group[0]);
            continue;
        }

        // Find actual duplicates within group
        const duplicateSets = [];
        const processed = new Set();

        for (let i = 0; i < group.length; i++) {
            if (processed.has(i)) continue;

            const duplicateSet = [group[i]];
            processed.add(i);

            for (let j = i + 1; j < group.length; j++) {
                if (processed.has(j)) continue;

                if (isDuplicate(group[i], group[j])) {
                    duplicateSet.push(group[j]);
                    processed.add(j);
                }
            }

            duplicateSets.push(duplicateSet);
        }

        // Merge each duplicate set
        for (const dupSet of duplicateSets) {
            if (dupSet.length === 1) {
                results.push(dupSet[0]);
            } else {
                results.push(mergeListings(dupSet));
            }
        }
    }

    return results;
}

/**
 * Statistics about deduplication
 */
export function getDeduplicationStats(originalCount, deduplicatedCount) {
    const duplicatesFound = originalCount - deduplicatedCount;
    const deduplicationRate = originalCount > 0
        ? (duplicatesFound / originalCount * 100).toFixed(1)
        : 0;

    return {
        original: originalCount,
        deduplicated: deduplicatedCount,
        duplicatesRemoved: duplicatesFound,
        deduplicationRate: `${deduplicationRate}%`,
    };
}

export default {
    generateFingerprint,
    calculateSimilarity,
    isDuplicate,
    findDuplicates,
    mergeListings,
    deduplicateBatch,
    getDeduplicationStats,
};
