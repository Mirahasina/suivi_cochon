export const PIG_BREEDS = [
    'Large White',
    'Landrace',
    'Piétrain',
    'Duroc',
    'Hampshire',
    'Croisé (amélioré)',
    'Local (Gasy)',
    'Autre',
] as const;

export type PigBreed = (typeof PIG_BREEDS)[number];

export const BREED_PROFILES: Record<string, { weightFactor: number; feedFactor: number }> = {
    'Large White': { weightFactor: 1.0, feedFactor: 1.0 },
    Landrace: { weightFactor: 0.98, feedFactor: 1.0 },
    Piétrain: { weightFactor: 0.95, feedFactor: 1.05 },
    Duroc: { weightFactor: 1.05, feedFactor: 1.08 },
    Hampshire: { weightFactor: 1.02, feedFactor: 1.02 },
    'Croisé (amélioré)': { weightFactor: 1.0, feedFactor: 1.0 },
    'Local (Gasy)': { weightFactor: 0.72, feedFactor: 0.85 },
    Autre: { weightFactor: 0.95, feedFactor: 0.95 },
};

export const MADAGASCAR_REGIONS = [
    'Antananarivo',
    'Antsirabe',
    'Tsiroanomandidy',
    'Ambatondrazaka',
    'Analavory',
    'Soavinandriana',
    'Autre région',
] as const;

export function normalizeBreed(breed?: string): string {
    if (!breed) return 'Large White';
    if (PIG_BREEDS.includes(breed as PigBreed)) return breed;
    return 'Autre';
}

export function baseNormForWeek(week: number): { expectedWeight: number; recommendedFeed: number } {
    let weight = 0;
    let feed = 0;

    if (week <= 4) {
        weight = 1.5 + week * 1.5;
        feed = 0.4;
    } else if (week <= 12) {
        weight = 7.5 + (week - 4) * 2.5;
        feed = 1.2;
    } else if (week <= 26) {
        weight = 27.5 + (week - 12) * 5.5;
        feed = 2.5;
    } else {
        const w26 = 27.5 + (26 - 12) * 5.5;
        weight = w26 + (week - 26) * 2.5;
        feed = 3.0;
    }

    return { expectedWeight: Math.round(weight * 10) / 10, recommendedFeed: feed };
}
