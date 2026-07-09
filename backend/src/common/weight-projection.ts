/** Poids attendu = poids à l'achat + gain de norme depuis l'achat */
export function projectWeightFromBaseline(
    baselineWeight: number,
    normWeightAtBaseline: number,
    normWeightAtReference: number,
): number {
    if (!baselineWeight || baselineWeight <= 0) return normWeightAtReference;
    if (!normWeightAtBaseline || normWeightAtBaseline <= 0) return normWeightAtReference;
    const projected = baselineWeight + (normWeightAtReference - normWeightAtBaseline);
    return Math.round(Math.max(baselineWeight, projected) * 10) / 10;
}

/** Cochon acheté après la naissance (pas né à la ferme) */
export function isPurchasedAfterBirth(pig: {
    birthDate?: Date | string | null;
    purchaseDate?: Date | string | null;
}): boolean {
    if (!pig.birthDate || !pig.purchaseDate) return false;
    const birth = new Date(pig.birthDate);
    const purchase = new Date(pig.purchaseDate);
    return purchase.getTime() - birth.getTime() > 7 * 24 * 60 * 60 * 1000;
}

export function getWeeksBetween(from: Date, to: Date): number {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}
