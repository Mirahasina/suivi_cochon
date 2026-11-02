import { BadRequestException, Injectable } from '@nestjs/common';
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

    async getMonthlySummary(startDate?: string, endDate?: string) {
        if ((startDate && !endDate) || (!startDate && endDate)) {
            throw new BadRequestException('La date de début et la date de fin sont requises ensemble.');
        }

        const now = new Date();
        const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
        const periodStart = startDate ? this.parseDate(startDate) : firstDay;
        const periodEnd = endDate ? this.parseDate(endDate) : lastDay;
        if (periodStart.getTime() > periodEnd.getTime()) {
            throw new BadRequestException('La date de début doit précéder la date de fin.');
        }
        const periodEndExclusive = new Date(periodEnd);
        periodEndExclusive.setUTCDate(periodEndExclusive.getUTCDate() + 1);

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

        let totalFeedKg = 0;
        let totalFeedCost = 0;
        let totalInvestment = 0;

        const pigSummaries = pigs.map((pig) => {
            let monthlyFeed = 0;
            let monthlyCost = 0;
            const pigFeedings = feedingsByPig.get(pig.id) || [];
            pigFeedings.forEach((e) => {
                const d = new Date(e.date);
                if (d >= periodStart && d < periodEndExclusive) {
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
            startDate: this.formatDate(periodStart),
            endDate: this.formatDate(periodEnd),
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

    private parseDate(value: string) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new BadRequestException('Les dates doivent être au format AAAA-MM-JJ.');
        }
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
            throw new BadRequestException('La période contient une date invalide.');
        }
        return date;
    }

    private formatDate(date: Date) {
        return date.toISOString().slice(0, 10);
    }
}
