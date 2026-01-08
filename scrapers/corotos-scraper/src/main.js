/**
 * Corotos.com.do Scraper
 *
 * Scrapes real estate listings from corotos.com.do (Dominican Republic classifieds)
 * Outputs normalized data compatible with PriceWaze webhook
 */

import { Actor } from 'apify';
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { normalizeAndSave, sendToWebhook } from '../../shared/normalize.js';

await Actor.init();

// Get input configuration
const input = await Actor.getInput() ?? {};
const {
    maxItems = 50,
    city = 'santo-domingo',
    category = 'inmuebles',
    transactionType = 'venta',
    startUrls = [],
} = input;

console.log('🏠 Starting Corotos scraper:', { maxItems, city, category, transactionType });

// Build search URL for Corotos
function buildSearchUrl(page = 1) {
    let url = 'https://www.corotos.com.do';

    const categoryMap = {
        'inmuebles': 'inmuebles',
        'apartamentos': 'apartamentos',
        'casas': 'casas',
        'terrenos': 'terrenos',
        'locales': 'locales-comerciales',
        'oficinas': 'oficinas',
    };

    const cat = categoryMap[category] || 'inmuebles';
    url += `/${cat}`;

    if (transactionType === 'alquiler') {
        url += '/alquiler';
    } else {
        url += '/venta';
    }

    if (city && city !== 'all') {
        url += `/${city}`;
    }

    if (page > 1) {
        url += `?page=${page}`;
    }

    return url;
}

// Extract detailed data from listing page
async function extractListingData(page, url) {
    try {
        await page.waitForSelector('h1, .ad-title, [class*="title"]', { timeout: 15000 });

        const data = await page.evaluate(() => {
            const getText = (selectors) => {
                for (const sel of selectors.split(',')) {
                    const el = document.querySelector(sel.trim());
                    if (el?.textContent?.trim()) return el.textContent.trim();
                }
                return null;
            };

            const getAttr = (selector, attr) => {
                const el = document.querySelector(selector);
                return el ? el.getAttribute(attr) : null;
            };

            // Title
            const title = getText('h1, .ad-title, [class*="ad-title"], [class*="listing-title"]');

            // Price
            const price = getText('[class*="price"], .precio, [class*="precio"], .ad-price');

            // Location
            const location = getText('[class*="location"], [class*="ubicacion"], .location, [class*="address"]');

            // Description
            const description = getText('[class*="description"], .descripcion, .ad-description, [class*="body"]');

            // Property type detection
            let propertyType = 'inmueble';
            const titleLower = (title || '').toLowerCase();
            const urlLower = window.location.href.toLowerCase();

            if (titleLower.includes('apartamento') || urlLower.includes('apartamento')) propertyType = 'apartamento';
            else if (titleLower.includes('casa') || urlLower.includes('casa')) propertyType = 'casa';
            else if (titleLower.includes('terreno') || titleLower.includes('solar') || urlLower.includes('terreno')) propertyType = 'terreno';
            else if (titleLower.includes('local') || urlLower.includes('local')) propertyType = 'local';
            else if (titleLower.includes('oficina') || urlLower.includes('oficina')) propertyType = 'oficina';

            // Attributes
            const attributes = {};
            document.querySelectorAll('[class*="attribute"], [class*="detail"], [class*="spec"], .attributes li, .details li, tr').forEach(el => {
                const text = el.textContent.trim();

                // Parse key-value pairs
                if (text.includes(':')) {
                    const [key, value] = text.split(':').map(s => s.trim());
                    if (key && value) {
                        attributes[key.toLowerCase()] = value;
                    }
                }

                // Pattern matching for specific values
                const habMatch = text.match(/(\d+)\s*(?:habitacion|dormitorio|cuarto)/i);
                const bathMatch = text.match(/(\d+)\s*(?:baño|bathroom)/i);
                const areaMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metros)/i);
                const parkMatch = text.match(/(\d+)\s*(?:parqueo|parking|estacionamiento)/i);

                if (habMatch) attributes['bedrooms'] = habMatch[1];
                if (bathMatch) attributes['bathrooms'] = bathMatch[1];
                if (areaMatch) attributes['areaM2'] = areaMatch[1];
                if (parkMatch) attributes['parking'] = parkMatch[1];
            });

            // Images
            const images = [];
            document.querySelectorAll('[class*="gallery"] img, [class*="slider"] img, [class*="carousel"] img, .ad-image img, [class*="photo"] img').forEach(img => {
                const src = img.src || img.dataset.src || img.getAttribute('data-lazy') || img.getAttribute('data-original');
                if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('avatar') && !images.includes(src)) {
                    const fullSrc = src.replace(/\/thumb\/|\/small\/|_thumb|_small/gi, '/');
                    images.push(fullSrc);
                }
            });

            // og:image fallback
            const ogImage = getAttr('meta[property="og:image"]', 'content');
            if (ogImage && !images.includes(ogImage)) {
                images.unshift(ogImage);
            }

            // Published date
            const publishedDate = getText('[class*="date"], [class*="fecha"], .posted-date, time');

            // Seller info
            const sellerName = getText('[class*="seller"], [class*="vendedor"], .user-name, .author');

            return {
                title,
                price,
                location,
                description,
                propertyType,
                areaM2: attributes['areaM2'] || attributes['metros'],
                bedrooms: attributes['bedrooms'] || attributes['habitaciones'],
                bathrooms: attributes['bathrooms'] || attributes['banos'],
                parking: attributes['parking'] || attributes['parqueos'],
                images: images.slice(0, 20),
                publishedDate,
                sellerName,
            };
        });

        return data;
    } catch (error) {
        console.error(`Error extracting from ${url}:`, error.message);
        return null;
    }
}

// Main crawler
const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: maxItems * 3,
    maxConcurrency: 2, // Corotos might be more sensitive
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 30,

    launchContext: {
        launchOptions: {
            headless: true,
        },
    },

    // Add randomization to appear more human
    preNavigationHooks: [
        async ({ page }) => {
            await page.waitForTimeout(Math.random() * 2000 + 1000);
        },
    ],

    async requestHandler({ request, page, log }) {
        const { url } = request;
        const isDetailPage = request.userData.isDetailPage;

        log.info(`🔍 Processing: ${url} (detail: ${isDetailPage})`);

        if (isDetailPage) {
            const rawData = await extractListingData(page, url);

            if (rawData && rawData.title) {
                // Use unified normalization
                await normalizeAndSave({
                    raw: {
                        title: rawData.title,
                        price: rawData.price,
                        location: rawData.location,
                        propertyType: rawData.propertyType,
                        areaM2: rawData.areaM2,
                        bedrooms: rawData.bedrooms,
                        bathrooms: rawData.bathrooms,
                        parking: rawData.parking,
                        description: rawData.description,
                        images: rawData.images,
                        publishedDate: rawData.publishedDate,
                        sellerName: rawData.sellerName,
                    },
                    url,
                    source: 'corotos',
                    inputCity: city,
                    transactionType,
                    maxItems,
                    log,
                });
            }
        } else {
            // Listing page - find property links
            await page.waitForSelector('a[href*="/inmueble"], a[href*="/apartamento"], a[href*="/casa"], .ad-card a, [class*="listing"] a', { timeout: 15000 }).catch(() => {});

            const listingLinks = await page.evaluate(() => {
                const links = new Set();
                document.querySelectorAll('a[href]').forEach(a => {
                    const href = a.href;
                    if (href.match(/corotos\.com\.do\/(inmueble|apartamento|casa|terreno|local|oficina)s?\/[^/]+-\d+/i) ||
                        href.match(/corotos\.com\.do\/[^/]+\/[^/]+-\d+$/i)) {
                        links.add(href);
                    }
                });
                return Array.from(links);
            });

            log.info(`📋 Found ${listingLinks.length} listing links on ${url}`);

            // Check current count
            const dataset = await Dataset.open();
            const { itemCount } = await dataset.getInfo() || { itemCount: 0 };
            const remaining = maxItems - itemCount;

            if (remaining <= 0) {
                log.info(`✅ Reached maxItems limit (${maxItems})`);
                return;
            }

            // Enqueue detail pages
            const linksToEnqueue = listingLinks.slice(0, remaining);
            for (const link of linksToEnqueue) {
                await crawler.addRequests([{
                    url: link,
                    userData: { isDetailPage: true },
                }]);
            }

            // Handle pagination
            if (listingLinks.length > 0 && remaining > listingLinks.length) {
                const nextPageUrl = await page.evaluate(() => {
                    const nextLink = document.querySelector('a[rel="next"], .pagination .next a, [class*="pagination"] a:contains("Siguiente"), .page-link:last-child');
                    if (nextLink) return nextLink.href;

                    const currentPage = document.querySelector('.pagination .active, [class*="page"].active');
                    if (currentPage) {
                        const nextSibling = currentPage.nextElementSibling?.querySelector('a');
                        if (nextSibling) return nextSibling.href;
                    }

                    return null;
                });

                if (nextPageUrl && nextPageUrl !== url) {
                    log.info(`📄 Enqueueing next page: ${nextPageUrl}`);
                    await crawler.addRequests([{
                        url: nextPageUrl,
                        userData: { isDetailPage: false },
                    }]);
                }
            }
        }
    },

    async failedRequestHandler({ request, log }) {
        log.error(`❌ Failed: ${request.url}`);
    },
});

// Build start URLs
const urls = startUrls.length > 0
    ? startUrls.map(url => ({ url, userData: { isDetailPage: false } }))
    : [{ url: buildSearchUrl(1), userData: { isDetailPage: false } }];

console.log('🚀 Starting crawl with URLs:', urls.map(u => u.url));

await crawler.run(urls);

// Get results
const dataset = await Dataset.open();
const { items } = await dataset.getData();

console.log(`✅ Scraping complete. Total items: ${items.length}`);

// Send to webhook if configured
const webhookUrl = input.webhookUrl;
const webhookSecret = input.webhookSecret;

if (webhookUrl) {
    await sendToWebhook({
        webhookUrl,
        webhookSecret,
        items,
        source: 'corotos',
        actorRunId: Actor.getEnv().actorRunId,
        actorId: Actor.getEnv().actorId,
        log: { info: console.log, error: console.error },
    });
}

await Actor.exit();
