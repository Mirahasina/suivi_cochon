import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../entities/building.entity';

@Injectable()
export class BuildingsService {
    constructor(
        @InjectRepository(Building)
        private buildingRepository: Repository<Building>,
    ) {}

    findAll() {
        return this.buildingRepository.find({ relations: ['batches'], order: { name: 'ASC' } });
    }

    create(data: { name: string; capacity?: number; location?: string }) {
        return this.buildingRepository.save(this.buildingRepository.create(data));
    }

    async update(id: number, data: Partial<Building>) {
        await this.buildingRepository.update(id, data);
        return this.buildingRepository.findOne({ where: { id }, relations: ['batches'] });
    }

    remove(id: number) {
        return this.buildingRepository.delete(id);
    }
}
