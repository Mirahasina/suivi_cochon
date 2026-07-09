import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { Vaccination } from '../entities/vaccination.entity';
import { HealthService } from '../health/health.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Pig) private pigRepo: Repository<Pig>,
        @InjectRepository(Vaccination) private vaccRepo: Repository<Vaccination>,
        private healthService: HealthService,
        private settingsService: SettingsService,
    ) {}

    async getMonthlySummary() {
        const pigs = await this.pigRepo.find({
            where: { status: 'ACTIVE' },
            relations: ['feedingEntries', 'weightEntries', 'vaccinations', 'vaccinations.vaccineType'],
        });

        const settings = await this.settingsService.getAll();
        const suggestions = await this.healthService.getAllSuggestions();
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

        let totalFeedKg = 0;
        let totalFeedCost = 0;
        let totalInvestment = 0;

        const pigSummaries = pigs.map((pig) => {
            let monthlyFeed = 0;
            let monthlyCost = 0;
            pig.feedingEntries?.forEach((e) => {
                const d = new Date(e.date);
                if (d.getMonth() === month && d.getFullYear() === year) {
                    monthlyFeed += e.quantityKg;
                    monthlyCost += Number(e.costAriary);
                }
            });
            totalFeedKg += monthlyFeed;
            totalFeedCost += monthlyCost;
            totalInvestment += Number(pig.purchasePrice || 0) + (pig.feedingEntries?.reduce((s, e) => s + Number(e.costAriary), 0) || 0);

            const lastWeight = [...(pig.weightEntries || [])].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )[0];

            return {
                id: pig.id,
                name: pig.name,
                breed: pig.breed,
                monthlyFeedKg: monthlyFeed,
                monthlyFeedCost: monthlyCost,
                currentWeight: lastWeight?.weight ?? null,
                vaccinationsCount: pig.vaccinations?.length ?? 0,
                isQuarantined: pig.isQuarantined,
            };
        });

        return {
            generatedAt: now.toISOString(),
            month: month + 1,
            year,
            farmRegion: settings.farmRegion,
            activePigs: pigs.length,
            quarantinedPigs: pigs.filter((p) => p.isQuarantined).length,
            totalFeedKg,
            totalFeedCost,
            totalInvestment,
            vaccinesDue: suggestions.filter((s) => s.status === 'overdue' || s.status === 'due').length,
            vaccineSuggestions: suggestions,
            pigs: pigSummaries,
        };
    }
}
