export type RaisingPurpose = 'UNDECIDED' | 'FATTENING' | 'BREEDING';

export const RAISING_PURPOSE_LABELS: Record<RaisingPurpose, string> = {
    UNDECIDED: 'Pas encore décidé',
    FATTENING: 'Engraissement (manatavy)',
    BREEDING: 'Reproduction (truie / verrat)',
};

/** Facteurs appliqués sur les normes race+âge selon sexe, castration et destination */
export function getGrowthFactors(
    pig: { gender: string; isCastrated: boolean; raisingPurpose?: RaisingPurpose | string | null },
    ageInWeeks: number,
): { weightFactor: number; feedFactor: number } {
    // Porcelets jeunes : même courbe pour tous
    if (ageInWeeks < 8) {
        return { weightFactor: 1, feedFactor: 1 };
    }

    const purpose = (pig.raisingPurpose as RaisingPurpose) || 'UNDECIDED';
    const isMale = pig.gender === 'MALE';

    if (isMale) {
        if (pig.isCastrated || purpose === 'FATTENING') {
            return { weightFactor: 1.06, feedFactor: 1.02 };
        }
        if (purpose === 'BREEDING') {
            return { weightFactor: 1.04, feedFactor: 1.05 };
        }
        return { weightFactor: 1.03, feedFactor: 1.03 };
    }

    if (purpose === 'BREEDING') {
        return { weightFactor: 0.94, feedFactor: 1.0 };
    }
    if (purpose === 'FATTENING') {
        return { weightFactor: 0.97, feedFactor: 0.98 };
    }
    return { weightFactor: 0.96, feedFactor: 0.99 };
}

export function applyGrowthFactors(
    norm: { expectedWeight: number; recommendedFeed: number },
    factors: { weightFactor: number; feedFactor: number },
) {
    return {
        expectedWeight: Math.round(norm.expectedWeight * factors.weightFactor * 10) / 10,
        recommendedFeed: Math.round(norm.recommendedFeed * factors.feedFactor * 100) / 100,
    };
}
