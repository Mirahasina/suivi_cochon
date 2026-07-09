import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchAlert } from '../entities/watch-alert.entity';

@Injectable()
export class WatchService {
    constructor(
        @InjectRepository(WatchAlert)
        private watchRepo: Repository<WatchAlert>,
    ) {}

    async list(status?: string) {
        if (status) {
            return this.watchRepo.find({
                where: { status: status as any },
                order: { createdAt: 'DESC' },
                take: 50,
            });
        }
        return this.watchRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    }

    async report(data: {
        type: 'DISEASE' | 'THEFT' | 'SUPPLY' | 'OTHER';
        title: string;
        details?: string;
        location?: string;
        source?: 'MANUAL' | 'WEB' | 'AI';
    }) {
        const normalized = `${data.title || ''} ${data.details || ''}`.toLowerCase();
        const severity =
            normalized.includes('mortalit') ||
            normalized.includes('vol') ||
            normalized.includes('urgence') ||
            normalized.includes('fièvre')
                ? 'HIGH'
                : normalized.includes('rupture') || normalized.includes('suspect')
                  ? 'MEDIUM'
                  : 'LOW';

        return this.watchRepo.save(
            this.watchRepo.create({
                type: data.type,
                title: data.title,
                details: data.details,
                location: data.location,
                source: data.source || 'MANUAL',
                severity: severity as any,
                status: 'OPEN',
            }),
        );
    }

    async setStatus(id: number, status: 'ACKNOWLEDGED' | 'RESOLVED') {
        await this.watchRepo.update(id, { status });
        return this.watchRepo.findOneBy({ id });
    }
}

