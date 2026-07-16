export interface MarketPrices {
    carcassSalePricePerKg: number;
    liveAdultPricePerKg: number;
    pigletLivePriceWeek1_4: number;
    pigletLivePriceWeek5_8: number;
    pigletLivePriceWeek9_12: number;
    pigletLivePriceWeek13Plus: number;
}

export type SaleMode = 'LIVE_KG' | 'CARCASS_KG';

export function getAgeInDays(birthDate: Date | string, reference = new Date()) {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    return Math.max(0, Math.floor((reference.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getAgeInWeeks(birthDate: Date | string, reference = new Date()) {
    return Math.floor(getAgeInDays(birthDate, reference) / 7);
}

export function formatAgeLabel(ageInDays: number) {
    const weeks = Math.floor(ageInDays / 7);
    const days = ageInDays % 7;
    if (weeks === 0) return `${days} jour${days > 1 ? 's' : ''}`;
    if (days === 0) return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
    return `${weeks} sem. ${days} j`;
}

/** Prix marché vivant au kg selon l'âge (porcelet vs adulte) */
export function getLivePricePerKg(ageInDays: number, prices: MarketPrices, isPiglet = ageInDays < 180): number {
    if (!isPiglet) return prices.liveAdultPricePerKg;
    const weeks = Math.floor(ageInDays / 7);
    if (weeks <= 4) return prices.pigletLivePriceWeek1_4;
    if (weeks <= 8) return prices.pigletLivePriceWeek5_8;
    if (weeks <= 12) return prices.pigletLivePriceWeek9_12;
    return prices.pigletLivePriceWeek13Plus;
}

export function estimateCarcassKg(liveKg: number, yieldPercent: number): number {
    const pct = Math.max(0, Math.min(100, yieldPercent));
    return Math.round(liveKg * (pct / 100) * 100) / 100;
}

export function calculateSaleTotal(
    mode: SaleMode,
    weightKg: number,
    ageInDays: number,
    prices: MarketPrices,
    isPiglet?: boolean,
    overridePricePerKg?: number,
) {
    const pricePerKg =
        overridePricePerKg ??
        (mode === 'CARCASS_KG' ? prices.carcassSalePricePerKg : getLivePricePerKg(ageInDays, prices, isPiglet));

    return {
        pricePerKg,
        weightKg,
        totalPrice: Math.round(pricePerKg * weightKg),
        ageInDays,
        ageInWeeks: Math.floor(ageInDays / 7),
        mode,
    };
}

export function settingsToMarketPrices(settings: {
    carcassSalePricePerKg: number;
    livePigSalePricePerKg: number;
    pigletLivePriceWeek1_4?: number;
    pigletLivePriceWeek5_8?: number;
    pigletLivePriceWeek9_12?: number;
    pigletLivePriceWeek13Plus?: number;
}): MarketPrices {
    return {
        carcassSalePricePerKg: settings.carcassSalePricePerKg,
        liveAdultPricePerKg: settings.livePigSalePricePerKg,
        pigletLivePriceWeek1_4: settings.pigletLivePriceWeek1_4 ?? 18000,
        pigletLivePriceWeek5_8: settings.pigletLivePriceWeek5_8 ?? 15000,
        pigletLivePriceWeek9_12: settings.pigletLivePriceWeek9_12 ?? 13000,
        pigletLivePriceWeek13Plus: settings.pigletLivePriceWeek13Plus ?? 12000,
    };
}
