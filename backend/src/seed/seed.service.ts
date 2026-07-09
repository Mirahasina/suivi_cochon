import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BREED_PROFILES, PIG_BREEDS, baseNormForWeek } from '../common/breeds';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { VaccineType } from '../entities/vaccine-type.entity';
import { FeedRecipe } from '../entities/feed-recipe.entity';
import { VACCINE_CATALOG } from '../health/vaccine-catalog';

const MAX_WEEKS = 52;

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(GrowthNorm)
        private normRepository: Repository<GrowthNorm>,
        @InjectRepository(VaccineType)
        private vaccineRepository: Repository<VaccineType>,
        @InjectRepository(FeedRecipe)
        private feedRecipeRepository: Repository<FeedRecipe>,
    ) {}

    async onModuleInit() {
        await this.seedGrowthNorms();
        await this.seedVaccineTypes();
        await this.seedFeedRecipes();
    }

    private async seedGrowthNorms() {
        for (const breed of PIG_BREEDS) {
            const profile = BREED_PROFILES[breed] ?? BREED_PROFILES['Autre'];
            for (let week = 1; week <= MAX_WEEKS; week++) {
                const base = baseNormForWeek(week);
                const data = {
                    ageInWeeks: week,
                    breed,
                    expectedWeight: Math.round(base.expectedWeight * profile.weightFactor * 10) / 10,
                    recommendedFeed: Math.round(base.recommendedFeed * profile.feedFactor * 100) / 100,
                };
                const existing = await this.normRepository.findOneBy({ ageInWeeks: week, breed });
                if (!existing) await this.normRepository.save(data);
                else await this.normRepository.update(existing.id, data);
            }
        }
        this.logger.log(`Growth norms ready (${PIG_BREEDS.length} races × ${MAX_WEEKS} semaines)`);
    }

    private async seedVaccineTypes() {
        for (const vaccine of VACCINE_CATALOG) {
            const existing = await this.vaccineRepository.findOneBy({ name: vaccine.name });
            const data = {
                name: vaccine.name,
                description: vaccine.description,
                defaultRecallDays: vaccine.defaultRecallDays,
                target: vaccine.target,
                injectionRoute: vaccine.injectionRoute,
                injectionSite: vaccine.injectionSite,
                timingNote: vaccine.timingNote,
                isMandatory: vaccine.isMandatory ?? false,
            };
            if (!existing) await this.vaccineRepository.save({ ...data, isEnabled: true, isCustom: false });
            else await this.vaccineRepository.update(existing.id, data);
        }
        this.logger.log(`Vaccine catalog ready (${VACCINE_CATALOG.length} vaccins)`);
    }

    private async seedFeedRecipes() {
        const defaultMix = {
            name: 'Mélange maison (concentré + maïs + son)',
            costPerKg: 1650,
            ingredients: JSON.stringify([
                { name: 'Concentré porc', percentKg: 40, costPerKg: 2200 },
                { name: 'Maïs broyé', percentKg: 45, costPerKg: 1200 },
                { name: 'Son de blé', percentKg: 10, costPerKg: 800 },
                { name: 'CMV / Prémix vitamines', percentKg: 5, costPerKg: 5000 },
            ]),
            isActive: true,
        };
        const existing = await this.feedRecipeRepository.findOneBy({ name: defaultMix.name });
        if (!existing) await this.feedRecipeRepository.save(defaultMix);
    }
}
