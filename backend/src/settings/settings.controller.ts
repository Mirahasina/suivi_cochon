import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { SaleMode } from '../common/market-pricing';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    getAll() {
        return this.settingsService.getAll();
    }

    @Get('sale-estimate')
    estimateSale(
        @Query('mode') mode: SaleMode,
        @Query('weightKg') weightKg: string,
        @Query('ageInDays') ageInDays: string,
        @Query('isPiglet') isPiglet?: string,
        @Query('pricePerKg') pricePerKg?: string,
    ) {
        return this.settingsService.estimateSale({
            mode: mode || 'LIVE_KG',
            weightKg: Number(weightKg) || 0,
            ageInDays: Number(ageInDays) || 0,
            isPiglet: isPiglet === 'true',
            pricePerKg: pricePerKg != null ? Number(pricePerKg) : undefined,
        });
    }

    @Patch()
    updateAll(@Body() body: Record<string, unknown>) {
        return this.settingsService.updateAll(body as any);
    }

    @Patch('feed-price')
    setFeedPrice(@Body('feedPricePerKg') feedPricePerKg: number) {
        return this.settingsService.setFeedPricePerKg(Number(feedPricePerKg));
    }
}
