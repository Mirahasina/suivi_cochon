import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch } from '../entities/batch.entity';

@Injectable()
export class BatchesService {
    constructor(
        @InjectRepository(Batch)
        private batchRepository: Repository<Batch>,
    ) {}

    findAll() {
        return this.batchRepository.find({
            relations: ['building', 'pigs'],
            order: { startDate: 'DESC' },
        });
    }

    create(data: { name: string; startDate?: string; buildingId?: number }) {
        return this.batchRepository.save(
            this.batchRepository.create({
                name: data.name,
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                building: data.buildingId ? { id: data.buildingId } as any : undefined,
            }),
        );
    }

    async update(id: number, data: { name?: string; status?: string; buildingId?: number }) {
        const update: Record<string, unknown> = {};
        if (data.name) update.name = data.name;
        if (data.status) update.status = data.status;
        if (data.buildingId != null) update.building = { id: data.buildingId };
        await this.batchRepository.update(id, update);
        return this.batchRepository.findOne({ where: { id }, relations: ['building', 'pigs'] });
    }

    remove(id: number) {
        return this.batchRepository.delete(id);
    }
}
