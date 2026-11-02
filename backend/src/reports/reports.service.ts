import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { Vaccination } from '../entities/vaccination.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { HealthService } from '../health/health.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Pig) private pigRepo: Repository<Pig>,
        @InjectRepository(Vaccination) private vaccRepo: Repository<Vaccination>,
        @InjectRepository(FeedingEntry) private feedingRepo: Repository<FeedingEntry>,
        @InjectRepository(WeightEntry) private weightRepo: Repository<WeightEntry>,
        private healthService: HealthService,
        private settingsService: SettingsService,
    ) {}

    async getMonthlySummary() {
        const pigs = await this.pigRepo.find({ where: { status: 'ACTIVE' } });
        const pigIds = pigs.map((pig) => pig.id);
        const [feedingEntries, weightEntries, vaccinations] = pigIds.length
            ? await Promise.all([
                  this.feedingRepo.find({ where: { pig: { id: In(pigIds) } }, relations: ['pig'] }),
                  this.weightRepo.find({ where: { pig: { id: In(pigIds) } }, relations: ['pig'] }),
                  this.vaccRepo.find({ where: { pig: { id: In(pigIds) } }, relations: ['pig'] }),
              ])
            : [[], [], []];
        const feedingsByPig = new Map<number, FeedingEntry[]>();
        const weightsByPig = new Map<number, WeightEntry[]>();
        const vaccinationsByPig = new Map<number, Vaccination[]>();
        for (const entry of feedingEntries) {
            const entries = feedingsByPig.get(entry.pig.id) || [];
            entries.push(entry);
            feedingsByPig.set(entry.pig.id, entries);
        }
        for (const entry of weightEntries) {
            const entries = weightsByPig.get(entry.pig.id) || [];
            entries.push(entry);
            weightsByPig.set(entry.pig.id, entries);
        }
        for (const vaccination of vaccinations) {
            const entries = vaccinationsByPig.get(vaccination.pig.id) || [];
            entries.push(vaccination);
            vaccinationsByPig.set(vaccination.pig.id, entries);
        }

        const [settings, suggestions] = await Promise.all([
            this.settingsService.getAll(),
            this.healthService.getAllSuggestions(),
        ]);
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

        let totalFeedKg = 0;
        let totalFeedCost = 0;
        let totalInvestment = 0;

        const pigSummaries = pigs.map((pig) => {
            let monthlyFeed = 0;
            let monthlyCost = 0;
            const pigFeedings = feedingsByPig.get(pig.id) || [];
            pigFeedings.forEach((e) => {
                const d = new Date(e.date);
                if (d.getMonth() === month && d.getFullYear() === year) {
                    monthlyFeed += e.quantityKg;
                    monthlyCost += Number(e.costAriary);
                }
            });
            totalFeedKg += monthlyFeed;
            totalFeedCost += monthlyCost;
            totalInvestment += Number(pig.purchasePrice || 0) + pigFeedings.reduce((s, e) => s + Number(e.costAriary), 0);

            const lastWeight = [...(weightsByPig.get(pig.id) || [])].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )[0];

            return {
                id: pig.id,
                name: pig.name,
                breed: pig.breed,
                monthlyFeedKg: monthlyFeed,
                monthlyFeedCost: monthlyCost,
                currentWeight: lastWeight?.weight ?? null,
                vaccinationsCount: vaccinationsByPig.get(pig.id)?.length ?? 0,
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
