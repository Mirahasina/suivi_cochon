import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import {
    calculateSaleTotal,
    DEFAULT_MARKET_PRICES,
    MarketPrices,
    SaleMode,
} from '../common/market-pricing';

const DEFAULTS = {
    feedPriceStarter: 2200,
    feedPriceGrowth: 2000,
    feedPriceFinish: 1800,
    livePigSalePricePerKg: DEFAULT_MARKET_PRICES.liveAdultPricePerKg,
    carcassSalePricePerKg: DEFAULT_MARKET_PRICES.carcassSalePricePerKg,
    pigletLivePriceWeek1_4: DEFAULT_MARKET_PRICES.pigletLivePriceWeek1_4,
    pigletLivePriceWeek5_8: DEFAULT_MARKET_PRICES.pigletLivePriceWeek5_8,
    pigletLivePriceWeek9_12: DEFAULT_MARKET_PRICES.pigletLivePriceWeek9_12,
    pigletLivePriceWeek13Plus: DEFAULT_MARKET_PRICES.pigletLivePriceWeek13Plus,
    carcassYieldPercent: 72,
    simpleFinanceMode: 'false',
    farmRegion: 'Antananarivo',
};

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(AppSetting)
        private settingsRepository: Repository<AppSetting>,
    ) {}

    private async get(key: keyof typeof DEFAULTS): Promise<string> {
        const setting = await this.settingsRepository.findOneBy({ key });
        return setting?.value ?? String(DEFAULTS[key]);
    }

    private async set(key: string, value: string) {
        await this.settingsRepository.save({ key, value });
    }

    async getMarketPrices(): Promise<MarketPrices> {
        return {
            carcassSalePricePerKg: Number(await this.get('carcassSalePricePerKg')),
            liveAdultPricePerKg: Number(await this.get('livePigSalePricePerKg')),
            pigletLivePriceWeek1_4: Number(await this.get('pigletLivePriceWeek1_4')),
            pigletLivePriceWeek5_8: Number(await this.get('pigletLivePriceWeek5_8')),
            pigletLivePriceWeek9_12: Number(await this.get('pigletLivePriceWeek9_12')),
            pigletLivePriceWeek13Plus: Number(await this.get('pigletLivePriceWeek13Plus')),
        };
    }

    async estimateSale(params: {
        mode: SaleMode;
        weightKg: number;
        ageInDays: number;
        isPiglet?: boolean;
        pricePerKg?: number;
    }) {
        const prices = await this.getMarketPrices();
        return calculateSaleTotal(
            params.mode,
            params.weightKg,
            params.ageInDays,
            prices,
            params.isPiglet,
            params.pricePerKg,
        );
    }

    async getFeedPriceForWeek(ageInWeeks: number): Promise<number> {
        if (ageInWeeks <= 4) return Number(await this.get('feedPriceStarter'));
        if (ageInWeeks <= 12) return Number(await this.get('feedPriceGrowth'));
        return Number(await this.get('feedPriceFinish'));
    }

    async getFeedPricePerKg(): Promise<number> {
        return this.getFeedPriceForWeek(8);
    }

    async getAll() {
        const market = await this.getMarketPrices();
        return {
            feedPricePerKg: Number(await this.get('feedPriceGrowth')),
            feedPriceStarter: Number(await this.get('feedPriceStarter')),
            feedPriceGrowth: Number(await this.get('feedPriceGrowth')),
            feedPriceFinish: Number(await this.get('feedPriceFinish')),
            livePigSalePricePerKg: market.liveAdultPricePerKg,
            carcassSalePricePerKg: market.carcassSalePricePerKg,
            ...market,
            carcassYieldPercent: Number(await this.get('carcassYieldPercent')),
            simpleFinanceMode: (await this.get('simpleFinanceMode')) === 'true',
            farmRegion: await this.get('farmRegion'),
        };
    }

    async updateAll(data: Partial<Record<string, number | boolean | string>>) {
        const map: Record<string, string | undefined> = {
            feedPriceStarter: data.feedPriceStarter != null ? String(data.feedPriceStarter) : undefined,
            feedPriceGrowth: data.feedPriceGrowth != null ? String(data.feedPriceGrowth) : undefined,
            feedPriceFinish: data.feedPriceFinish != null ? String(data.feedPriceFinish) : undefined,
            livePigSalePricePerKg: data.livePigSalePricePerKg != null ? String(data.livePigSalePricePerKg) : undefined,
            carcassSalePricePerKg: data.carcassSalePricePerKg != null ? String(data.carcassSalePricePerKg) : undefined,
            pigletLivePriceWeek1_4: data.pigletLivePriceWeek1_4 != null ? String(data.pigletLivePriceWeek1_4) : undefined,
            pigletLivePriceWeek5_8: data.pigletLivePriceWeek5_8 != null ? String(data.pigletLivePriceWeek5_8) : undefined,
            pigletLivePriceWeek9_12: data.pigletLivePriceWeek9_12 != null ? String(data.pigletLivePriceWeek9_12) : undefined,
            pigletLivePriceWeek13Plus: data.pigletLivePriceWeek13Plus != null ? String(data.pigletLivePriceWeek13Plus) : undefined,
            carcassYieldPercent: data.carcassYieldPercent != null ? String(data.carcassYieldPercent) : undefined,
            simpleFinanceMode: data.simpleFinanceMode != null ? String(data.simpleFinanceMode) : undefined,
            farmRegion: data.farmRegion != null ? String(data.farmRegion) : undefined,
        };
        for (const [key, val] of Object.entries(map)) {
            if (val !== undefined) await this.set(key, val);
        }
        return this.getAll();
    }

    async setFeedPricePerKg(price: number) {
        return this.updateAll({ feedPriceGrowth: price });
    }
}
