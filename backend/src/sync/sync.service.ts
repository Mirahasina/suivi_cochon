import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { Building } from '../entities/building.entity';
import { Batch } from '../entities/batch.entity';

@Injectable()
export class SyncService {
    constructor(
        @InjectRepository(Pig) private pigRepo: Repository<Pig>,
        @InjectRepository(Piglet) private pigletRepo: Repository<Piglet>,
        @InjectRepository(Building) private buildingRepo: Repository<Building>,
        @InjectRepository(Batch) private batchRepo: Repository<Batch>,
    ) {}

    async getFullState() {
        const pigs = await this.pigRepo.find();
        const piglets = await this.pigletRepo.find();
        const buildings = await this.buildingRepo.find();
        const batches = await this.batchRepo.find();

        return {
            pigs,
            piglets,
            buildings,
            batches,
            timestamp: new Date().toISOString()
        };
    }

    async applyMutations(mutations: any[]) {
        for (const mut of mutations) {
            try {
                if (mut.table === 'pigs') {
                    if (mut.action === 'INSERT' || mut.action === 'UPDATE') {
                        await this.pigRepo.save(mut.data);
                    } else if (mut.action === 'DELETE') {
                        await this.pigRepo.delete(mut.data.id);
                    }
                }
                else if (mut.table === 'piglets') {
                    if (mut.action === 'INSERT' || mut.action === 'UPDATE') {
                        await this.pigletRepo.save(mut.data);
                    } else if (mut.action === 'DELETE') {
                        await this.pigletRepo.delete(mut.data.id);
                    }
                }
                else if (mut.table === 'buildings') {
                    if (mut.action === 'INSERT' || mut.action === 'UPDATE') {
                        await this.buildingRepo.save(mut.data);
                    } else if (mut.action === 'DELETE') {
                        await this.buildingRepo.delete(mut.data.id);
                    }
                }
                else if (mut.table === 'batches') {
                    if (mut.action === 'INSERT' || mut.action === 'UPDATE') {
                        await this.batchRepo.save(mut.data);
                    } else if (mut.action === 'DELETE') {
                        await this.batchRepo.delete(mut.data.id);
                    }
                }
            } catch (e) {
                console.error(`Error applying mutation: ${JSON.stringify(mut)}`, e);
            }
        }
    }
}
