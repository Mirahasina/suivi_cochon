import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { RecordFarrowingDto } from './dto/record-farrowing.dto';

@Injectable()
export class PigletsService {
    constructor(
        @InjectRepository(Piglet)
        private pigletRepository: Repository<Piglet>,
        @InjectRepository(Pig)
        private pigRepository: Repository<Pig>,
    ) { }

    async recordFarrowing(dto: RecordFarrowingDto) {
        const mother = await this.pigRepository.findOneBy({ id: dto.motherId });
        if (!mother) {
            throw new NotFoundException('Mother pig not found');
        }

        const totalBorn = dto.bornAlive + dto.stillborn;
        const actualDate = new Date(dto.actualDate);

        // Update mother's farrowing data
        await this.pigRepository.update(dto.motherId, {
            actualFarrowingDate: actualDate,
            totalBorn: totalBorn,
            bornAlive: dto.bornAlive,
            stillborn: dto.stillborn,
        });

        // Create piglet records for those born alive
        const piglets: Piglet[] = [];
        for (let i = 0; i < dto.bornAlive; i++) {
            const piglet = this.pigletRepository.create({
                birthDate: actualDate,
                status: 'ALIVE',
                motherId: dto.motherId,
                fatherId: dto.fatherId,
            });
            piglets.push(piglet);
        }

        await this.pigletRepository.save(piglets);

        return {
            message: 'Farrowing recorded successfully',
            totalBorn,
            bornAlive: dto.bornAlive,
            stillborn: dto.stillborn,
            pigletsCreated: piglets.length,
        };
    }

    async findByMother(motherId: number) {
        return this.pigletRepository.find({
            where: { motherId },
            order: { birthDate: 'DESC' },
        });
    }

    async sell(pigletId: number, price: number, date?: string) {
        const saleDate = date ? new Date(date) : new Date();
        return this.pigletRepository.update(pigletId, {
            status: 'SOLD',
            salePrice: price,
            saleDate,
        });
    }

    async markDead(pigletId: number, date?: string) {
        const deathDate = date ? new Date(date) : new Date();
        return this.pigletRepository.update(pigletId, {
            status: 'DEAD',
            deathDate,
        });
    }
}
