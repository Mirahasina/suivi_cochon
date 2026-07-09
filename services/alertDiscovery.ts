import type { ContactSearchPreferences, WatchAlert } from './types';

export interface ProposedAlert {
    id: string;
    type: WatchAlert['type'];
    title: string;
    details?: string;
    location?: string;
    source: 'local' | 'web';
    alreadySaved: boolean;
    url?: string;
    localId?: number;
    severity?: WatchAlert['severity'];
}

function buildZoneLabel(prefs: ContactSearchPreferences) {
    const zones = prefs.allowedZones.filter(Boolean);
    if (zones.length > 0) return zones.join(' ');
    return prefs.farmBaseLocation || 'Madagascar';
}

function normalizeTitle(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

function fromLocalAlert(a: WatchAlert): ProposedAlert {
    return {
        id: `local-${a.id}`,
        type: a.type,
        title: a.title,
        details: a.details,
        location: a.location,
        source: 'local',
        alreadySaved: true,
        localId: a.id,
        severity: a.severity,
    };
}

function parseRssItems(xml: string, type: WatchAlert['type'], locationHint: string): ProposedAlert[] {
    const items: ProposedAlert[] = [];
    const blocks = xml.split('<item>').slice(1);
    for (const block of blocks.slice(0, 6)) {
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        const linkMatch = block.match(/<link>(.*?)<\/link>/);
        const descMatch = block.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/);
        const title = titleMatch?.[1]?.replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
        const url = linkMatch?.[1]?.trim();
        if (!title) continue;
        const details = descMatch?.[1]
            ?.replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
        items.push({
            id: `web-${type}-${normalizeTitle(title).slice(0, 40)}`,
            type,
            title,
            details,
            location: locationHint,
            source: 'web',
            alreadySaved: false,
            url,
            severity: 'MEDIUM',
        });
    }
    return items;
}

async function fetchNewsAlerts(
    type: 'DISEASE' | 'THEFT',
    prefs: ContactSearchPreferences,
): Promise<ProposedAlert[]> {
    const zone = buildZoneLabel(prefs);
    const query =
        type === 'DISEASE'
            ? `maladie porcine ${zone} Madagascar`
            : `vol élevage porc ${zone} Madagascar`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=MG&ceid=MG:fr`;
    const res = await fetch(url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, type, zone);
}

export type AlertFocus = 'ALL' | 'DISEASE' | 'THEFT' | 'SUPPLY';

export async function discoverAlerts(
    focus: AlertFocus,
    prefs: ContactSearchPreferences,
    localAlerts: WatchAlert[],
    online: boolean,
): Promise<ProposedAlert[]> {
    const openLocal = localAlerts
        .filter((a) => a.status === 'OPEN')
        .filter((a) => focus === 'ALL' || a.type === focus || (focus === 'DISEASE' && a.type === 'OTHER'))
        .map(fromLocalAlert);

    const seen = new Set(openLocal.map((a) => normalizeTitle(a.title)));
    const merged: ProposedAlert[] = [...openLocal];

    if (!online) return merged;

    const types: Array<'DISEASE' | 'THEFT'> = [];
    if (focus === 'ALL' || focus === 'DISEASE') types.push('DISEASE');
    if (focus === 'ALL' || focus === 'THEFT') types.push('THEFT');

    try {
        for (const t of types) {
            const news = await fetchNewsAlerts(t, prefs);
            for (const n of news) {
                const key = normalizeTitle(n.title);
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(n);
            }
        }
    } catch {
        // garde le local uniquement
    }

    return merged.slice(0, 12);
}
