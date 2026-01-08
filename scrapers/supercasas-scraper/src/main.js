/**
 * SuperCasas.com Scraper
 *
 * Scrapes real estate listings from supercasas.com (Dominican Republic)
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
    category = 'propiedades',
    transactionType = 'venta',
    startUrls = [],
} = input;

console.log('🏠 Starting SuperCasas scraper:', { maxItems, city, category, transactionType });

// Build search URL for SuperCasas
function buildSearchUrl(page = 1) {
    let url = 'https://www.supercasas.com';

    const categoryMap = {
        'propiedades': 'inmuebles',
        'apartamentos': 'apartamentos',
        'casas': 'casas',
        'terrenos': 'terrenos',
        'locales': 'locales-comerciales',
        'oficinas': 'oficinas',
    };

    const cat = categoryMap[category] || 'inmuebles';
    url += `/${cat}-en-${transactionType}`;

    if (city && city !== 'all') {
        url += `/${city}`;
    }

    if (page > 1) {
        url += `?page=${page}`;
    }

    return url;
}

// Extract property data from detail page
async function extractPropertyData(page, url) {
    try {
        await page.waitForSelector('h1, .property-title, [class*="title"]', { timeout: 10000 });

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
            const title = getText('h1, .property-title, [class*="property-title"], [class*="listing-title"]');

            // Price
            const price = getText('[class*="price"], .precio, [class*="precio"]');

            // Location
            const location = getText('[class*="location"], [class*="ubicacion"], .direccion, [class*="address"]');

            // Description
            const description = getText('[class*="description"], [class*="descripcion"], .description, .descripcion');

            // Property type detection
            let propertyType = 'inmueble';
            const titleLower = (title || '').toLowerCase();
            const urlLower = window.location.href.toLowerCase();

            if (titleLower.includes('apartamento') || titleLower.includes('apto') || urlLower.includes('apartamento')) {
                propertyType = 'apartamento';
            } else if (titleLower.includes('penthouse')) {
                propertyType = 'apartamento';
            } else if (titleLower.includes('casa') || titleLower.includes('villa') || urlLower.includes('casa')) {
                propertyType = 'casa';
            } else if (titleLower.includes('terreno') || titleLower.includes('solar') || urlLower.includes('terreno')) {
                propertyType = 'terreno';
            } else if (titleLower.includes('local') || titleLower.includes('comercial') || urlLower.includes('local')) {
                propertyType = 'local';
            } else if (titleLower.includes('oficina') || urlLower.includes('oficina')) {
                propertyType = 'oficina';
            }

            // Attributes from body text
            const bodyText = document.body.innerText;
            const habMatch = bodyText.match(/(\d+)\s*(?:habitacion|dormitorio|cuarto|bedroom|hab\.)/i);
            const bathMatch = bodyText.match(/(\d+)\s*(?:baño|bathroom|wc)/i);
            const areaMatch = bodyText.match(/(\d+(?:[,.]\d+)?)\s*(?:m²|m2|metros|sqm)/i);
            const parkMatch = bodyText.match(/(\d+)\s*(?:parqueo|parking|estacionamiento|garage)/i);

            // Images
            const images = [];
            document.querySelectorAll('img[src*="property"], img[src*="inmueble"], .gallery img, [class*="slider"] img, [class*="carousel"] img').forEach(img => {
                const src = img.src || img.dataset.src || img.getAttribute('data-lazy-src');
                if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar') && !images.includes(src)) {
                    const fullSrc = src.replace(/\/thumb\//gi, '/').replace(/_thumb/gi, '');
                    images.push(fullSrc);
                }
            });

            // og:image fallback
            const ogImage = getAttr('meta[property="og:image"]', 'content');
            if (ogImage && !images.includes(ogImage)) {
                images.unshift(ogImage);
            }

            // Published date
            const publishedDate = getText('[class*="date"], [class*="fecha"], time');

            // Seller info
            const sellerName = getText('[class*="agent"], [class*="seller"], .realtor-name, .contact-name');

            return {
                title,
                price,
                location,
                description,
                propertyType,
                areaM2: areaMatch ? areaMatch[1] : null,
                bedrooms: habMatch ? habMatch[1] : null,
                bathrooms: bathMatch ? bathMatch[1] : null,
                parking: parkMatch ? parkMatch[1] : null,
                images: images.slice(0, 20),
                publishedDate,
                sellerName,
            };
        });

        return data;
    } catch (error) {
        console.error(`Error extracting data from ${url}:`, error.message);
        return null;
    }
}

// Main crawler
const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: maxItems * 3,
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 30,

    launchContext: {
        launchOptions: {
            headless: true,
        },
    },

    async requestHandler({ request, page, log }) {
        const { url } = request;
        const isDetailPage = request.userData.isDetailPage;

        log.info(`🔍 Processing: ${url} (detail: ${isDetailPage})`);

        if (isDetailPage) {
            const rawData = await extractPropertyData(page, url);

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
                    source: 'supercasas',
                    inputCity: city,
                    transactionType,
                    maxItems,
                    log,
                });
            }
        } else {
            // Listing page - extract property links
            await page.waitForSelector('a[href*="/propiedad"], a[href*="/inmueble"], .property-card a, [class*="listing"] a', { timeout: 15000 }).catch(() => {});

            const propertyLinks = await page.evaluate(() => {
                const links = new Set();
                document.querySelectorAll('a[href]').forEach(a => {
                    const href = a.href;
                    if (href.includes('/propiedad/') ||
                        href.includes('/inmueble/') ||
                        href.match(/\/[a-z]+-en-[a-z]+\/[a-z0-9-]+-\d+$/i)) {
                        links.add(href);
                    }
                });
                return Array.from(links);
            });

            log.info(`📋 Found ${propertyLinks.length} property links on ${url}`);

            // Check current count
            const dataset = await Dataset.open();
            const { itemCount } = await dataset.getInfo() || { itemCount: 0 };
            const remaining = maxItems - itemCount;

            if (remaining <= 0) {
                log.info(`✅ Reached maxItems limit (${maxItems})`);
                return;
            }

            // Enqueue property detail pages
            const linksToEnqueue = propertyLinks.slice(0, remaining);
            for (const link of linksToEnqueue) {
                await crawler.addRequests([{
                    url: link,
                    userData: { isDetailPage: true },
                }]);
            }

            // Handle pagination
            if (propertyLinks.length > 0 && remaining > propertyLinks.length) {
                const nextPageUrl = await page.evaluate(() => {
                    const nextLink = document.querySelector('a[rel="next"], .pagination a:last-child, [class*="next"] a');
                    return nextLink ? nextLink.href : null;
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

// Start URLs
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
        source: 'supercasas',
        actorRunId: Actor.getEnv().actorRunId,
        actorId: Actor.getEnv().actorId,
        log: { info: console.log, error: console.error },
    });
}

await Actor.exit();
