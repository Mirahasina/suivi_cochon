import { DataSource } from 'typeorm';
import { GrowthNorm } from './src/entities/growth-norm.entity';
import { VaccineType } from './src/entities/vaccine-type.entity';
import { Pig } from './src/entities/pig.entity';
import { WeightEntry } from './src/entities/weight-entry.entity';
import { Vaccination } from './src/entities/vaccination.entity';
import { FeedingEntry } from './src/entities/feeding-entry.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Pig, WeightEntry, VaccineType, Vaccination, GrowthNorm, FeedingEntry],
    synchronize: true,
});

async function main() {
    await AppDataSource.initialize();
    const normRepo = AppDataSource.getRepository(GrowthNorm);
    const vaccineRepo = AppDataSource.getRepository(VaccineType);

    // Seed Growth Norms (Weekly from 1 to 26 weeks)
    const norms = [];
    for (let week = 1; week <= 26; week++) {
        let weight = 0;
        let feed = 0;

        if (week <= 4) { // Sevrage phase
            weight = 1.5 + week * 1.5; // Starts at 1.5, ends ~7.5
            feed = 0.4;
        } else if (week <= 12) { // Post-sevrage
            weight = 7.5 + (week - 4) * 2.5; // Ends ~27.5
            feed = 1.2;
        } else { // croissance/Finition
            weight = 27.5 + (week - 12) * 5.5; // Ends ~104.5 at week 26
            feed = 2.5;
        }

        norms.push({ ageInWeeks: week, expectedWeight: weight, recommendedFeed: feed });
    }

    for (const normData of norms) {
        const existing = await normRepo.findOneBy({ ageInWeeks: normData.ageInWeeks });
        if (!existing) {
            await normRepo.save(normRepo.create(normData));
        } else {
            await normRepo.update(existing.id, normData);
        }
    }

    // Seed Vaccine Types
    const vaccines = [
        { name: 'Fer (Injection)', defaultRecallDays: 0, description: 'Prévention de l\'anémie chez les porcelets' },
        { name: 'Vitamines AD3E', defaultRecallDays: 90, description: 'Soutien à la croissance et vitalité' },
        { name: 'Déparasitage (Interne)', defaultRecallDays: 120, description: 'Contre les vers intestinaux' },
        { name: 'Déparasitage (Externe)', defaultRecallDays: 60, description: 'Contre les gales et poux' },
        { name: 'Mycoplasme (1ère dose)', defaultRecallDays: 21, description: 'Pneumonie enzootique - Dose 1' },
        { name: 'Mycoplasme (Rappel)', defaultRecallDays: 180, description: 'Pneumonie enzootique - Rappel' },
        { name: 'Rouget + Parvo', defaultRecallDays: 180, description: 'Erysipèle et Reproduction' },
        { name: 'Fièvre Porcine', defaultRecallDays: 365, description: 'Protection annuelle (Antipeste)' },
    ];

    for (const vaccineData of vaccines) {
        const existing = await vaccineRepo.findOneBy({ name: vaccineData.name });
        if (!existing) {
            await vaccineRepo.save(vaccineRepo.create(vaccineData));
        } else {
            await vaccineRepo.update(existing.id, vaccineData);
        }
    }

    console.log('Seed completed successfully');
    await AppDataSource.destroy();
}

main().catch((err) => {
    console.error('Error during seed:', err);
    process.exit(1);
});
