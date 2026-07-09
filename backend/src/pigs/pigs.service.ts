import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeBreed } from '../common/breeds';
import { applyGrowthFactors, getGrowthFactors, RaisingPurpose } from '../common/growth-profile';
import { Pig } from '../entities/pig.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { HealthService } from '../health/health.service';
import { SettingsService } from '../settings/settings.service';
import { FeedRecipesService } from '../feed-recipes/feed-recipes.service';

const MAX_AGE_WEEKS = 52;

@Injectable()
export class PigsService {
    constructor(
        @InjectRepository(Pig)
        private pigRepository: Repository<Pig>,
        @InjectRepository(WeightEntry)
        private weightRepository: Repository<WeightEntry>,
        @InjectRepository(GrowthNorm)
        private normRepository: Repository<GrowthNorm>,
        @InjectRepository(FeedingEntry)
        private feedingRepository: Repository<FeedingEntry>,
        private healthService: HealthService,
        private settingsService: SettingsService,
        private feedRecipesService: FeedRecipesService,
    ) {}

    async findAll() {
        return this.pigRepository.find({
            where: { status: 'ACTIVE' },
            relations: ['weightEntries', 'batch'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number) {
        let pig = await this.loadPig(id);
        if (!pig) throw new NotFoundException('Pig not found');

        if (pig.status === 'ACTIVE') {
            await this.syncAutoEntries(pig);
            pig = await this.loadPig(id);
        }

        return this.enrichPig(pig!);
    }

    private async loadPig(id: number) {
        return this.pigRepository.findOne({
            where: { id },
            relations: ['weightEntries', 'vaccinations', 'feedingEntries', 'vaccinations.vaccineType', 'batch'],
            order: {
                weightEntries: { date: 'DESC' },
                feedingEntries: { date: 'DESC' },
            },
        });
    }

    private getAgeInWeeks(birthDate: Date, referenceDate: Date = new Date()) {
        const ageInDays = Math.floor((referenceDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.min(Math.max(Math.floor(ageInDays / 7), 1), MAX_AGE_WEEKS);
    }

    private startOfDay(date: Date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    private isSameDay(a: Date, b: Date) {
        return this.startOfDay(a).getTime() === this.startOfDay(b).getTime();
    }

    private async getNormForDate(birthDate: Date, referenceDate: Date, breed?: string) {
        const ageInWeeks = this.getAgeInWeeks(birthDate, referenceDate);
        const breedKey = normalizeBreed(breed);
        return this.normRepository.findOne({ where: { ageInWeeks, breed: breedKey } });
    }

    private async getAdjustedNormForPig(pig: Pig, referenceDate: Date) {
        if (!pig.birthDate) return null;
        const birth = new Date(pig.birthDate);
        const ageInWeeks = this.getAgeInWeeks(birth, referenceDate);
        const base = await this.getNormForDate(birth, referenceDate, pig.breed);
        if (!base) return null;
        const factors = getGrowthFactors(pig, ageInWeeks);
        const adjusted = applyGrowthFactors(base, factors);
        return { ...base, ...adjusted };
    }

    private async getFeedPrice(_pig: Pig, ageInWeeks: number) {
        const activeRecipe = await this.feedRecipesService.findActive();
        if (activeRecipe) return activeRecipe.costPerKg;
        return this.settingsService.getFeedPriceForWeek(ageInWeeks);
    }

    async syncAutoEntries(pig: Pig) {
        if (!pig.birthDate) return;

        const birth = new Date(pig.birthDate);
        const now = new Date();
        const ageInWeeks = this.getAgeInWeeks(birth, now);
        const currentNorm = await this.getAdjustedNormForPig(pig, now);
        if (!currentNorm) return;

        const feedPricePerKg = await this.getFeedPrice(pig, ageInWeeks);

        const weightEntries = [...(pig.weightEntries || [])].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const latestWeight = weightEntries[0];
        const daysSinceLatestWeight = latestWeight
            ? Math.floor((now.getTime() - new Date(latestWeight.date).getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;

        // Corrige les anciens cochons : poids initial enregistré à la création au lieu de la date de naissance
        const manualEntries = weightEntries.filter((e) => e.isManual);
        const pigAgeDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
        if (manualEntries.length === 1 && pig.createdAt && pigAgeDays > 30) {
            const onlyManual = manualEntries[0];
            if (this.isSameDay(new Date(onlyManual.date), new Date(pig.createdAt))) {
                await this.weightRepository.update(onlyManual.id, { date: birth });
            }
        }

        const shouldAutoWeight = !latestWeight?.isManual || daysSinceLatestWeight >= 7;
        if (shouldAutoWeight) {
            const latestAuto = weightEntries.find((e) => !e.isManual);
            if (latestAuto && this.isSameDay(new Date(latestAuto.date), now)) {
                if (latestAuto.weight !== currentNorm.expectedWeight) {
                    await this.weightRepository.update(latestAuto.id, { weight: currentNorm.expectedWeight });
                }
            } else if (!latestAuto || !this.isSameDay(new Date(latestAuto.date), now)) {
                await this.weightRepository.save(
                    this.weightRepository.create({
                        weight: currentNorm.expectedWeight,
                        isManual: false,
                        date: now,
                        pig: { id: pig.id } as Pig,
                    }),
                );
            }
        }

        const feedingEntries = pig.feedingEntries || [];
        const trackingStart = new Date(
            Math.max(
                birth.getTime(),
                pig.purchaseDate ? new Date(pig.purchaseDate).getTime() : birth.getTime(),
                pig.createdAt ? new Date(pig.createdAt).getTime() : birth.getTime(),
            ),
        );
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const feedFrom = new Date(Math.max(trackingStart.getTime(), monthStart.getTime()));
        const maxBackfillDays = 120;
        const earliestBackfill = new Date(now);
        earliestBackfill.setDate(earliestBackfill.getDate() - maxBackfillDays);
        if (feedFrom.getTime() < earliestBackfill.getTime()) {
            feedFrom.setTime(earliestBackfill.getTime());
        }

        for (let d = new Date(feedFrom); d <= now; d.setDate(d.getDate() + 1)) {
            const day = new Date(d);
            const existing = feedingEntries.find((e) => this.isSameDay(new Date(e.date), day));
            if (existing?.isManual) continue;

            const dayAgeWeeks = this.getAgeInWeeks(birth, day);
            const dayNorm = await this.getAdjustedNormForPig(pig, day);
            if (!dayNorm) continue;

            const dailyFeed = dayNorm.recommendedFeed;
            const dayFeedPrice = await this.getFeedPrice(pig, dayAgeWeeks);
            const dailyCost = Math.round(dailyFeed * dayFeedPrice);

            if (existing && !existing.isManual) {
                if (existing.quantityKg !== dailyFeed || Number(existing.costAriary) !== dailyCost) {
                    await this.feedingRepository.update(existing.id, {
                        quantityKg: dailyFeed,
                        costAriary: dailyCost,
                    });
                }
            } else if (!existing) {
                await this.feedingRepository.save(
                    this.feedingRepository.create({
                        quantityKg: dailyFeed,
                        costAriary: dailyCost,
                        isManual: false,
                        date: day,
                        pig: { id: pig.id } as Pig,
                    }),
                );
            }
        }
    }

    private async enrichPig(pig: Pig) {
        const now = new Date();
        const birth = new Date(pig.birthDate);
        const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
        const ageInWeeks = this.getAgeInWeeks(birth, now);

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let actualMonthlyFeedKg = 0;
        let monthlyFeedingCost = 0;

        pig.feedingEntries?.forEach((e) => {
            const d = new Date(e.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                actualMonthlyFeedKg += e.quantityKg;
                monthlyFeedingCost += Number(e.costAriary);
            }
        });

        const totalFeedingCost = pig.feedingEntries?.reduce((sum, e) => sum + Number(e.costAriary), 0) || 0;
        const totalInvestment = Number(pig.purchasePrice || 0) + totalFeedingCost;

        const norm = await this.getAdjustedNormForPig(pig, now);
        const feedPricePerKg = await this.getFeedPrice(pig, ageInWeeks);
        const settings = await this.settingsService.getAll();

        const sortedWeights = [...(pig.weightEntries || [])].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const lastWeight = sortedWeights[sortedWeights.length - 1];
        const theoreticalMonthlyFeedKg = (norm?.recommendedFeed || 0) * 30;

        const todayFeeding = pig.feedingEntries?.find((e) => this.isSameDay(new Date(e.date), now));

        const weightChart = sortedWeights.slice(-12).map((e) => ({
            date: e.date,
            weight: e.weight,
            isManual: e.isManual,
        }));

        const normCurve = [];
        for (let w = Math.max(1, ageInWeeks - 4); w <= Math.min(ageInWeeks + 2, MAX_AGE_WEEKS); w++) {
            const n = await this.normRepository.findOne({
                where: { ageInWeeks: w, breed: normalizeBreed(pig.breed) },
            });
            if (n) {
                const factors = getGrowthFactors(pig, w);
                const adjusted = applyGrowthFactors(n, factors);
                normCurve.push({ week: w, expectedWeight: adjusted.expectedWeight });
            }
        }

        const currentWeightVal = lastWeight?.weight ?? norm?.expectedWeight ?? 0;
        const liveSaleEstimate = Math.round(currentWeightVal * settings.livePigSalePricePerKg);

        let partnerName = pig.externalPartnerOwner || null;
        if (pig.partnerId) {
            const partner = await this.pigRepository.findOneBy({ id: pig.partnerId });
            partnerName = partner?.name;
        }

        const underweightThreshold = norm ? norm.expectedWeight * 0.9 : 0;

        return {
            ...pig,
            ageFormatted: `${ageInWeeks} sem ${ageInDays % 7} j`,
            ageInWeeks,
            partnerName,
            weightChart,
            normCurve,
            financials: {
                monthlyFeedingCost,
                actualMonthlyFeedKg,
                theoreticalMonthlyFeedKg,
                totalInvestment,
                feedPricePerKg,
                feedPriceStarter: settings.feedPriceStarter,
                feedPriceGrowth: settings.feedPriceGrowth,
                feedPriceFinish: settings.feedPriceFinish,
                livePigSalePricePerKg: settings.livePigSalePricePerKg,
                liveSaleEstimate,
                simpleFinanceMode: settings.simpleFinanceMode,
            },
            currentStatus: {
                expectedWeight: norm?.expectedWeight || null,
                recommendedFeed: norm?.recommendedFeed || null,
                currentWeight: lastWeight?.weight ?? norm?.expectedWeight ?? null,
                todayFeedKg: todayFeeding?.quantityKg ?? norm?.recommendedFeed ?? null,
                todayFeedCost: todayFeeding
                    ? Number(todayFeeding.costAriary)
                    : Math.round((norm?.recommendedFeed || 0) * feedPricePerKg),
                isWeightManual: lastWeight?.isManual ?? false,
                isFeedManual: todayFeeding?.isManual ?? false,
                isUnderweight: lastWeight && norm ? lastWeight.weight < underweightThreshold : false,
                feedPhase: ageInWeeks <= 4 ? 'démarrage' : ageInWeeks <= 12 ? 'croissance' : 'finition',
                raisingPurpose: pig.raisingPurpose || 'UNDECIDED',
                raisingPurposeLabel: this.getRaisingPurposeLabel(pig),
            },
        };
    }

    private getRaisingPurposeLabel(pig: Pig) {
        const labels: Record<string, string> = {
            UNDECIDED: 'Pas encore décidé',
            FATTENING: 'Engraissement (manatavy)',
            BREEDING: 'Reproduction',
        };
        return labels[pig.raisingPurpose || 'UNDECIDED'] || 'Pas encore décidé';
    }

    async setRaisingPurpose(id: number, purpose: RaisingPurpose) {
        await this.pigRepository.update(id, {
            raisingPurpose: purpose,
            raisingPurposeDate: new Date(),
        });
        return this.findOne(id);
    }

    async create(data: any) {
        const { initialVaccineTypeIds, batchId, ...pigData } = data;

        const pig = this.pigRepository.create({
            ...pigData,
            breed: normalizeBreed(pigData.breed),
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : null,
            batch: batchId ? { id: batchId } : undefined,
        });

        const savedPig = await this.pigRepository.save(pig);

        if (data.initialWeight) {
            const weightDate = data.purchaseDate
                ? new Date(data.purchaseDate)
                : data.birthDate
                  ? new Date(data.birthDate)
                  : new Date();
            await this.weightRepository.save(
                this.weightRepository.create({
                    weight: Number(data.initialWeight),
                    isManual: true,
                    date: weightDate,
                    pig: { id: (savedPig as any).id } as Pig,
                }),
            );
        }

        if (initialVaccineTypeIds && Array.isArray(initialVaccineTypeIds)) {
            for (const vtId of initialVaccineTypeIds) {
                await this.healthService.recordVaccination(
                    (savedPig as any).id,
                    Number(vtId),
                    new Date().toISOString(),
                    'Vaccin initial à l\'ajout',
                );
            }
        }

        const fullPig = await this.loadPig((savedPig as any).id);
        if (fullPig) await this.syncAutoEntries(fullPig);

        return savedPig;
    }

    async importBulk(pigs: any[]) {
        const results = [];
        for (const pigData of pigs) {
            results.push(await this.create(pigData));
        }
        return { imported: results.length, pigs: results };
    }

    async update(id: number, data: any) {
        if (data.breed) data.breed = normalizeBreed(data.breed);
        if (data.batchId != null) data.batch = { id: data.batchId };
        delete data.batchId;
        await this.pigRepository.update(id, data);
        return this.findOne(id);
    }

    async setQuarantine(id: number, isQuarantined: boolean, reason?: string) {
        await this.pigRepository.update(id, { isQuarantined, quarantineReason: reason || null });
        return this.findOne(id);
    }

    async remove(id: number) {
        return this.pigRepository.delete(id);
    }

    async addWeight(pigId: number, weight: number) {
        const entry = this.weightRepository.create({
            weight,
            isManual: true,
            pig: { id: pigId } as Pig,
        });
        return this.weightRepository.save(entry);
    }

    async addFeeding(pigId: number, data: { quantityKg: number; costAriary: number }) {
        const now = new Date();
        const pig = await this.loadPig(pigId);
        const existing = pig?.feedingEntries?.find((e) => this.isSameDay(new Date(e.date), now));

        if (existing) {
            await this.feedingRepository.update(existing.id, {
                quantityKg: data.quantityKg,
                costAriary: data.costAriary,
                isManual: true,
            });
            return this.feedingRepository.findOneBy({ id: existing.id });
        }

        const entry = this.feedingRepository.create({
            ...data,
            isManual: true,
            date: now,
            pig: { id: pigId } as Pig,
        });
        return this.feedingRepository.save(entry);
    }

    async recordMating(id: number, data: { partnerId?: number; date?: string; isExternal?: boolean; partnerName?: string }) {
        const matingDate = data.date ? new Date(data.date) : new Date();
        const farrowingDate = new Date(matingDate);
        farrowingDate.setDate(farrowingDate.getDate() + 114);

        await this.pigRepository.update(id, {
            matingDate,
            partnerId: data.partnerId,
            isExternalPartner: !!data.isExternal,
            externalPartnerOwner: data.partnerName,
            farrowingDate,
            raisingPurpose: 'BREEDING',
            raisingPurposeDate: new Date(),
        });
        return this.findOne(id);
    }

    async castrate(pigId: number) {
        await this.pigRepository.update(pigId, {
            isCastrated: true,
            castrationDate: new Date(),
            raisingPurpose: 'FATTENING',
            raisingPurposeDate: new Date(),
        });
        return this.findOne(pigId);
    }

    async sell(
        id: number,
        data: {
            saleType: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT';
            pricePerKg?: number;
            weightKg?: number;
            totalPrice?: number;
            date?: string;
        },
    ) {
        let totalPrice = data.totalPrice;
        if (data.saleType === 'CARCASS_KG' || data.saleType === 'LIVE_KG') {
            totalPrice = Math.round((data.pricePerKg || 0) * (data.weightKg || 0));
        }
        return this.pigRepository.update(id, {
            status: 'SOLD',
            saleType: data.saleType,
            saleWeightKg: data.weightKg,
            salePricePerKg: data.pricePerKg,
            salePrice: totalPrice,
            saleDate: data.date ? new Date(data.date) : new Date(),
        });
    }
}
