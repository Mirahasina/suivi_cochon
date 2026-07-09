import type { ContactSearchPreferences, FarmContact } from './types';

export interface ProposedContact {
    id: string;
    type: 'VET' | 'FEED_SUPPLIER';
    name: string;
    phone?: string;
    location?: string;
    source: 'local' | 'discovered';
    alreadySaved: boolean;
    contactUrl?: string;
}

const USER_AGENT = 'SuiviCochon/1.0 (pig-farm-assistant)';

function normalize(s: string) {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function zoneAllowed(location: string | undefined, allowedZones: string[], blockedZones: string[]) {
    if (!location) return true;
    const loc = normalize(location);
    if (blockedZones.some((z) => loc.includes(normalize(z)))) return false;
    if (allowedZones.length === 0) return true;
    return allowedZones.some((z) => loc.includes(normalize(z)));
}

function buildZoneLabel(prefs: ContactSearchPreferences) {
    const zones = prefs.allowedZones.filter(Boolean);
    if (zones.length > 0) return zones.join(', ');
    return prefs.farmBaseLocation || 'Madagascar';
}

function mapsSearchUrl(name: string, location?: string) {
    const q = encodeURIComponent([name, location, 'Madagascar'].filter(Boolean).join(' '));
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function toProposedFromLocal(c: FarmContact): ProposedContact {
    return {
        id: `local-${c.id}`,
        type: c.type === 'FEED_SUPPLIER' ? 'FEED_SUPPLIER' : 'VET',
        name: c.name,
        phone: c.phone,
        location: c.location,
        source: 'local',
        alreadySaved: true,
        contactUrl: c.phone ? `tel:${c.phone.replace(/\s/g, '')}` : mapsSearchUrl(c.name, c.location),
    };
}

function dedupeKey(name: string, location?: string) {
    return `${normalize(name)}|${normalize(location || '')}`;
}

interface NominatimItem {
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
    address?: { city?: string; town?: string; village?: string; state?: string };
}

async function nominatimSearch(query: string): Promise<NominatimItem[]> {
    const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '8',
        countrycodes: 'mg',
        addressdetails: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimItem[];
    return Array.isArray(data) ? data : [];
}

async function overpassVets(lat: number, lng: number): Promise<ProposedContact[]> {
    const query = `
[out:json][timeout:20];
(
  node["amenity"="veterinary"](around:60000,${lat},${lng});
  node["healthcare"="veterinary"](around:60000,${lat},${lng});
  way["amenity"="veterinary"](around:60000,${lat},${lng});
);
out center 12 tags;
`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
        elements?: Array<{
            tags?: { name?: string; phone?: string; 'addr:city'?: string; 'addr:full'?: string };
            lat?: number;
            lon?: number;
            center?: { lat: number; lon: number };
        }>;
    };
    const out: ProposedContact[] = [];
    for (const el of json.elements || []) {
        const name = el.tags?.name?.trim();
        if (!name) continue;
        const location = el.tags?.['addr:city'] || el.tags?.['addr:full'];
        const latV = el.lat ?? el.center?.lat;
        const lngV = el.lon ?? el.center?.lon;
        const phone = el.tags?.phone?.trim();
        out.push({
            id: `osm-${name}-${latV}-${lngV}`,
            type: 'VET',
            name,
            phone,
            location,
            source: 'discovered',
            alreadySaved: false,
            contactUrl: phone
                ? `tel:${phone.replace(/\s/g, '')}`
                : latV && lngV
                  ? `https://www.google.com/maps/search/?api=1&query=${latV},${lngV}`
                  : mapsSearchUrl(name, location),
        });
    }
    return out;
}

function parseNominatimItem(item: NominatimItem, type: 'VET' | 'FEED_SUPPLIER'): ProposedContact | null {
    const name = item.name || item.display_name?.split(',')[0]?.trim();
    if (!name || name.length < 3) return null;
    const location =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.state ||
        item.display_name?.split(',').slice(1, 3).join(',').trim();
    const lat = item.lat ? Number(item.lat) : undefined;
    const lng = item.lon ? Number(item.lon) : undefined;
    return {
        id: `nom-${name}-${lat}-${lng}`,
        type,
        name,
        location,
        source: 'discovered',
        alreadySaved: false,
        contactUrl:
            lat && lng
                ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                : mapsSearchUrl(name, location),
    };
}

async function geocodeFarm(prefs: ContactSearchPreferences): Promise<{ lat: number; lng: number } | null> {
    if (prefs.farmCoordinates) {
        return { lat: prefs.farmCoordinates.latitude, lng: prefs.farmCoordinates.longitude };
    }
    const q = prefs.farmBaseLocation?.trim();
    if (!q) return null;
    const items = await nominatimSearch(`${q}, Madagascar`);
    const first = items[0];
    if (!first?.lat || !first?.lon) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
}

async function discoverOnline(
    kind: 'VET' | 'FEED_SUPPLIER',
    prefs: ContactSearchPreferences,
): Promise<ProposedContact[]> {
    const zones = buildZoneLabel(prefs);
    const coords = await geocodeFarm(prefs);
    const found: ProposedContact[] = [];

    if (kind === 'VET' && coords) {
        found.push(...(await overpassVets(coords.lat, coords.lng)));
    }

    const queries =
        kind === 'VET'
            ? [
                  `vétérinaire porc ${zones} Madagascar`,
                  `clinique vétérinaire ${zones} Madagascar`,
                  `veterinary ${zones} Madagascar`,
              ]
            : [
                  `aliment bétail porc ${zones} Madagascar`,
                  `provende porc ${zones} Madagascar`,
                  `distributeur aliment animaux ${zones} Madagascar`,
              ];

    for (const q of queries) {
        const items = await nominatimSearch(q);
        for (const item of items) {
            const p = parseNominatimItem(item, kind);
            if (p) found.push(p);
        }
        if (found.length >= 8) break;
    }

    return found;
}

export async function discoverContacts(
    kind: 'VET' | 'FEED_SUPPLIER',
    prefs: ContactSearchPreferences,
    saved: FarmContact[],
    online: boolean,
): Promise<ProposedContact[]> {
    const blocked = prefs.blockedFarZones || [];
    const allowed = prefs.allowedZones || [];

    const local = saved
        .filter((c) => c.type === kind)
        .filter((c) => zoneAllowed(c.location || prefs.farmBaseLocation, allowed, blocked))
        .map(toProposedFromLocal);

    const seen = new Set(local.map((c) => dedupeKey(c.name, c.location)));
    const merged = [...local];

    if (online) {
        try {
            const discovered = await discoverOnline(kind, prefs);
            for (const c of discovered) {
                if (!zoneAllowed(c.location || prefs.farmBaseLocation, allowed, blocked)) continue;
                const key = dedupeKey(c.name, c.location);
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(c);
                if (merged.length >= 10) break;
            }
        } catch {
            // réseau ou API indisponible : on garde le local
        }
    }

    return merged;
}
