import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';

import { HealthService } from '../health/health.service';

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
    ) { }

    async findAll() {
        return this.pigRepository.find({
            where: { status: 'ACTIVE' },
            relations: ['weightEntries'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number) {
        const pig = await this.pigRepository.findOne({
            where: { id },
            relations: ['weightEntries', 'vaccinations', 'feedingEntries', 'vaccinations.vaccineType'],
        });

        if (!pig) throw new NotFoundException('Pig not found');

        const now = new Date();
        const birth = new Date(pig.birthDate);
        const ageInDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
        const ageInWeeks = Math.floor(ageInDays / 7);

        // Filter feeding entries for this month
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let actualMonthlyFeedKg = 0;
        let monthlyFeedingCost = 0;

        pig.feedingEntries.forEach((e) => {
            const d = new Date(e.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                actualMonthlyFeedKg += e.quantityKg;
                monthlyFeedingCost += Number(e.costAriary);
            }
        });

        const totalFeedingCost = pig.feedingEntries.reduce((sum, e) => sum + Number(e.costAriary), 0);
        const totalInvestment = Number(pig.purchasePrice || 0) + totalFeedingCost;

        const norm = await this.normRepository.findOne({
            where: { ageInWeeks },
        });

        const lastWeight = pig.weightEntries?.[0];
        const theoreticalMonthlyFeedKg = (norm?.recommendedFeed || 0) * 30;

        let partnerName = pig.externalPartnerOwner || null;
        if (pig.partnerId) {
            const partner = await this.pigRepository.findOneBy({ id: pig.partnerId });
            partnerName = partner?.name;
        }

        return {
            ...pig,
            ageFormatted: `${ageInWeeks} sem ${ageInDays % 7} j`,
            ageInWeeks,
            partnerName,
            financials: {
                monthlyFeedingCost,
                actualMonthlyFeedKg,
                theoreticalMonthlyFeedKg,
                totalInvestment,
            },
            currentStatus: {
                expectedWeight: norm?.expectedWeight || null,
                recommendedFeed: norm?.recommendedFeed || null,
                isUnderweight: lastWeight && norm ? lastWeight.weight < norm.expectedWeight : false,
            },
        };
    }

    async create(data: any) {
        const { initialVaccineTypeIds, ...pigData } = data;

        const pig = this.pigRepository.create({
            ...pigData,
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : null,
        });

        const savedPig = await this.pigRepository.save(pig);

        // Handle initial vaccines
        if (initialVaccineTypeIds && Array.isArray(initialVaccineTypeIds)) {
            for (const vtId of initialVaccineTypeIds) {
                await this.healthService.recordVaccination(
                    (savedPig as any).id,
                    Number(vtId),
                    new Date().toISOString(),
                    'Vaccin initial à l\'ajout'
                );
            }
        }

        return savedPig;
    }

    async update(id: number, data: any) {
        await this.pigRepository.update(id, data);
        return this.findOne(id);
    }

    async remove(id: number) {
        return this.pigRepository.delete(id);
    }

    async addWeight(pigId: number, weight: number) {
        const entry = this.weightRepository.create({
            weight,
            pig: { id: pigId } as Pig,
        });
        return this.weightRepository.save(entry);
    }

    async addFeeding(pigId: number, data: { quantityKg: number; costAriary: number }) {
        const entry = this.feedingRepository.create({
            ...data,
            pig: { id: pigId } as Pig,
        });
        return this.feedingRepository.save(entry);
    }

    async recordMating(id: number, data: { partnerId?: number; date?: string; isExternal?: boolean; partnerName?: string }) {
        const matingDate = data.date ? new Date(data.date) : new Date();
        const farrowingDate = new Date(matingDate);
        farrowingDate.setDate(farrowingDate.getDate() + 114);

        return this.pigRepository.update(id, {
            matingDate,
            partnerId: data.partnerId,
            isExternalPartner: !!data.isExternal,
            externalPartnerOwner: data.partnerName,
            farrowingDate,
        });
    }

    async castrate(pigId: number) {
        return this.pigRepository.update(pigId, {
            isCastrated: true,
            castrationDate: new Date(),
        });
    }

    async sell(id: number, price: number, date?: string) {
        return this.pigRepository.update(id, {
            status: 'SOLD',
            salePrice: price,
            saleDate: date ? new Date(date) : new Date(),
        });
    }
}
