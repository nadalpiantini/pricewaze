/**
 * Zone Normalization for Dominican Republic
 *
 * Normalizes zone/neighborhood names to canonical forms for:
 * - Consistent matching across sources
 * - Better deduplication
 * - Accurate pricing comparisons
 */

/**
 * Canonical zone mappings
 * Key: normalized lowercase → Value: canonical name
 */
const ZONE_ALIASES = {
    // === SANTO DOMINGO ===

    // Piantini variants
    'piantini': 'Piantini',
    'piantiny': 'Piantini',
    'piántini': 'Piantini',
    'piantíni': 'Piantini',

    // Naco variants
    'naco': 'Naco',
    'ens. naco': 'Naco',
    'ens naco': 'Naco',
    'ensanche naco': 'Naco',

    // Evaristo Morales
    'evaristo morales': 'Evaristo Morales',
    'evaristo': 'Evaristo Morales',
    'ens. evaristo morales': 'Evaristo Morales',

    // Serralles
    'serralles': 'Serrallés',
    'serrallés': 'Serrallés',
    'serralés': 'Serrallés',
    'ens. serrallés': 'Serrallés',

    // Paraíso
    'paraiso': 'Paraíso',
    'paraíso': 'Paraíso',
    'el paraiso': 'Paraíso',
    'el paraíso': 'Paraíso',

    // Bella Vista
    'bella vista': 'Bella Vista',
    'bellavista': 'Bella Vista',
    'ens. bella vista': 'Bella Vista',

    // La Esperilla
    'la esperilla': 'La Esperilla',
    'esperilla': 'La Esperilla',
    'ens. la esperilla': 'La Esperilla',

    // Gazcue
    'gazcue': 'Gazcue',
    'gascue': 'Gazcue',
    'ens. gazcue': 'Gazcue',

    // Julieta
    'julieta': 'Julieta',
    'ens. julieta': 'Julieta',

    // La Julia
    'la julia': 'La Julia',
    'ens. la julia': 'La Julia',

    // Los Prados
    'los prados': 'Los Prados',
    'ens. los prados': 'Los Prados',

    // Renacimiento
    'renacimiento': 'Renacimiento',
    'ens. renacimiento': 'Renacimiento',

    // Mirador Norte/Sur
    'mirador norte': 'Mirador Norte',
    'mirador sur': 'Mirador Sur',
    'mirador del norte': 'Mirador Norte',
    'mirador del sur': 'Mirador Sur',

    // Los Cacicazgos
    'los cacicazgos': 'Los Cacicazgos',
    'cacicazgos': 'Los Cacicazgos',

    // Arroyo Hondo
    'arroyo hondo': 'Arroyo Hondo',
    'arroyo hondo viejo': 'Arroyo Hondo',

    // Ciudad Nueva
    'ciudad nueva': 'Ciudad Nueva',

    // Zona Colonial
    'zona colonial': 'Zona Colonial',
    'ciudad colonial': 'Zona Colonial',
    'colonial': 'Zona Colonial',

    // Zona Universitaria
    'zona universitaria': 'Zona Universitaria',

    // === SANTIAGO ===

    // Los Jardines
    'los jardines': 'Los Jardines',
    'jardines': 'Los Jardines',
    'los jardines metropolitanos': 'Los Jardines Metropolitanos',

    // Cerros de Gurabo
    'cerros de gurabo': 'Cerros de Gurabo',
    'gurabo': 'Cerros de Gurabo',

    // Reparto del Este
    'reparto del este': 'Reparto del Este',

    // === PUNTA CANA ===

    // Cap Cana
    'cap cana': 'Cap Cana',
    'capcana': 'Cap Cana',

    // Bávaro
    'bavaro': 'Bávaro',
    'bávaro': 'Bávaro',

    // Cocotal
    'cocotal': 'Cocotal',

    // Punta Cana Village
    'punta cana village': 'Punta Cana Village',
    'pc village': 'Punta Cana Village',

    // === LA ROMANA ===

    // Casa de Campo
    'casa de campo': 'Casa de Campo',

    // === PUERTO PLATA ===

    // Playa Dorada
    'playa dorada': 'Playa Dorada',

    // Costambar
    'costambar': 'Costambar',
    'costa mbar': 'Costambar',
};

/**
 * City name normalization
 */
const CITY_ALIASES = {
    // Santo Domingo variants
    'santo domingo': 'Santo Domingo',
    'sto. domingo': 'Santo Domingo',
    'sto domingo': 'Santo Domingo',
    'sd': 'Santo Domingo',
    's.d.': 'Santo Domingo',
    'santo domingo este': 'Santo Domingo Este',
    'santo domingo oeste': 'Santo Domingo Oeste',
    'santo domingo norte': 'Santo Domingo Norte',
    'sto. dgo. este': 'Santo Domingo Este',
    'sto. dgo. oeste': 'Santo Domingo Oeste',
    'sto dgo este': 'Santo Domingo Este',
    'sto dgo oeste': 'Santo Domingo Oeste',

    // Distrito Nacional
    'distrito nacional': 'Distrito Nacional',
    'dn': 'Distrito Nacional',
    'd.n.': 'Distrito Nacional',

    // Santiago
    'santiago': 'Santiago',
    'santiago de los caballeros': 'Santiago',
    'stgo': 'Santiago',

    // Punta Cana
    'punta cana': 'Punta Cana',
    'puntacana': 'Punta Cana',

    // La Romana
    'la romana': 'La Romana',

    // Puerto Plata
    'puerto plata': 'Puerto Plata',
    'pto. plata': 'Puerto Plata',
    'pto plata': 'Puerto Plata',

    // San Pedro de Macorís
    'san pedro de macoris': 'San Pedro de Macorís',
    'san pedro de macorís': 'San Pedro de Macorís',
    'spm': 'San Pedro de Macorís',

    // La Vega
    'la vega': 'La Vega',

    // San Cristóbal
    'san cristobal': 'San Cristóbal',
    'san cristóbal': 'San Cristóbal',

    // Higüey
    'higuey': 'Higüey',
    'higüey': 'Higüey',
};

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove accents (for matching only)
 * - Trim and collapse whitespace
 */
function normalizeForMatching(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        // Keep accents in the lookup key since we have them in ZONE_ALIASES
        ;
}

/**
 * Remove accents for fuzzy matching
 */
function removeAccents(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize a zone name to its canonical form
 * @param {string} zone - Raw zone name
 * @returns {string} - Canonical zone name
 */
export function normalizeZone(zone) {
    if (!zone) return null;

    const normalized = normalizeForMatching(zone);

    // Direct match
    if (ZONE_ALIASES[normalized]) {
        return ZONE_ALIASES[normalized];
    }

    // Try without accents
    const noAccents = removeAccents(normalized);
    for (const [key, value] of Object.entries(ZONE_ALIASES)) {
        if (removeAccents(key) === noAccents) {
            return value;
        }
    }

    // No match - return cleaned up original
    // Title case the original
    return zone
        .trim()
        .split(/\s+/)
        .map(word => {
            // Keep lowercase for articles/prepositions
            const lower = word.toLowerCase();
            if (['de', 'del', 'la', 'las', 'los', 'el', 'en', 'y'].includes(lower)) {
                return lower;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Normalize a city name to its canonical form
 * @param {string} city - Raw city name
 * @returns {string} - Canonical city name
 */
export function normalizeCity(city) {
    if (!city) return null;

    const normalized = normalizeForMatching(city);

    // Direct match
    if (CITY_ALIASES[normalized]) {
        return CITY_ALIASES[normalized];
    }

    // Try without accents
    const noAccents = removeAccents(normalized);
    for (const [key, value] of Object.entries(CITY_ALIASES)) {
        if (removeAccents(key) === noAccents) {
            return value;
        }
    }

    // No match - return title cased original
    return city
        .trim()
        .split(/\s+/)
        .map(word => {
            const lower = word.toLowerCase();
            if (['de', 'del', 'la', 'las', 'los', 'el'].includes(lower)) {
                return lower;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Normalize both city and zone
 * @param {string} city - Raw city name
 * @param {string} zone - Raw zone name
 * @returns {{ city: string, zone: string }}
 */
export function normalizeLocation(city, zone) {
    return {
        city: normalizeCity(city),
        zone: normalizeZone(zone),
    };
}

/**
 * Get all known zones for a city
 * Useful for autocomplete/validation
 */
export function getZonesForCity(city) {
    const normalizedCity = normalizeCity(city);

    const cityZones = {
        'Santo Domingo': [
            'Piantini', 'Naco', 'Evaristo Morales', 'Serrallés', 'Paraíso',
            'Bella Vista', 'La Esperilla', 'Gazcue', 'Julieta', 'La Julia',
            'Los Prados', 'Renacimiento', 'Mirador Norte', 'Mirador Sur',
            'Los Cacicazgos', 'Arroyo Hondo', 'Ciudad Nueva', 'Zona Colonial',
            'Zona Universitaria'
        ],
        'Distrito Nacional': [
            'Piantini', 'Naco', 'Evaristo Morales', 'Serrallés', 'Paraíso',
            'Bella Vista', 'La Esperilla', 'Gazcue', 'Zona Colonial'
        ],
        'Santiago': [
            'Los Jardines', 'Los Jardines Metropolitanos', 'Cerros de Gurabo',
            'Reparto del Este'
        ],
        'Punta Cana': [
            'Cap Cana', 'Bávaro', 'Cocotal', 'Punta Cana Village'
        ],
        'La Romana': [
            'Casa de Campo'
        ],
        'Puerto Plata': [
            'Playa Dorada', 'Costambar'
        ],
    };

    return cityZones[normalizedCity] || [];
}

export default {
    normalizeZone,
    normalizeCity,
    normalizeLocation,
    getZonesForCity,
};
