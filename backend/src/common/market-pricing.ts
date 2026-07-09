export interface MarketPrices {
    carcassSalePricePerKg: number;
    liveAdultPricePerKg: number;
    pigletLivePriceWeek1_4: number;
    pigletLivePriceWeek5_8: number;
    pigletLivePriceWeek9_12: number;
    pigletLivePriceWeek13Plus: number;
}

export const DEFAULT_MARKET_PRICES: MarketPrices = {
    carcassSalePricePerKg: 10000,
    liveAdultPricePerKg: 12000,
    pigletLivePriceWeek1_4: 18000,
    pigletLivePriceWeek5_8: 15000,
    pigletLivePriceWeek9_12: 13000,
    pigletLivePriceWeek13Plus: 12000,
};

export type SaleMode = 'LIVE_KG' | 'CARCASS_KG';

export function getAgeInDays(birthDate: Date, reference = new Date()) {
    return Math.max(0, Math.floor((reference.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getAgeInWeeks(birthDate: Date, reference = new Date()) {
    return Math.floor(getAgeInDays(birthDate, reference) / 7);
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
