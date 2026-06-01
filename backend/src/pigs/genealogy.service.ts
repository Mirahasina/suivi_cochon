import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';

@Injectable()
export class GenealogyService {
    constructor(
        @InjectRepository(Pig)
        private pigRepository: Repository<Pig>,
        @InjectRepository(Piglet)
        private pigletRepository: Repository<Piglet>,
    ) { }

    async getAncestors(pigId: number) {
        const pig = await this.pigRepository.findOneBy({ id: pigId });
        if (!pig) return null;

        const piglet = await this.pigletRepository.findOne({
            where: { id: pigId },
            relations: ['mother', 'father'],
        });

        if (!piglet) {
            return {
                pig,
                mother: null,
                father: null,
            };
        }

        const mother = piglet.mother;
        const father = piglet.fatherId
            ? await this.pigRepository.findOneBy({ id: piglet.fatherId })
            : null;

        return {
            pig,
            mother,
            father,
        };
    }

    async getDescendants(pigId: number) {
        const asMother = await this.pigletRepository.find({
            where: { motherId: pigId },
        });

        const asFather = await this.pigletRepository.find({
            where: { fatherId: pigId },
        });

        return {
            asMother,
            asFather,
            total: asMother.length + asFather.length,
        };
    }

    async getBreedingStats() {
        const allPigs = await this.pigRepository.find({
            where: { status: 'ACTIVE' },
        });

        const females = allPigs.filter(p => p.gender === 'FEMALE');
        const pregnant = females.filter(p => p.matingDate && !p.actualFarrowingDate);
        const upcomingFarrowings = pregnant
            .filter(p => p.farrowingDate)
            .map(p => ({
                id: p.id,
                name: p.name,
                expectedDate: p.farrowingDate,
                daysRemaining: Math.ceil(
                    (new Date(p.farrowingDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ),
            }))
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

        const allPiglets = await this.pigletRepository.find();
        const aliveCount = allPiglets.filter(p => p.status === 'ALIVE').length;
        const soldCount = allPiglets.filter(p => p.status === 'SOLD').length;
        const deadCount = allPiglets.filter(p => p.status === 'DEAD').length;

        const farrowedSows = females.filter(p => p.actualFarrowingDate);
        const avgPigletsPerLitter = farrowedSows.length > 0
            ? farrowedSows.reduce((sum, sow) => sum + (sow.bornAlive || 0), 0) / farrowedSows.length
            : 0;

        const survivalRate = (aliveCount + soldCount) / (aliveCount + soldCount + deadCount) * 100 || 0;

        return {
            totalFemales: females.length,
            pregnant: pregnant.length,
            upcomingFarrowings,
            pigletStats: {
                alive: aliveCount,
                sold: soldCount,
                dead: deadCount,
                total: allPiglets.length,
            },
            avgPigletsPerLitter: Math.round(avgPigletsPerLitter * 10) / 10,
            survivalRate: Math.round(survivalRate * 10) / 10,
        };
    }
}
