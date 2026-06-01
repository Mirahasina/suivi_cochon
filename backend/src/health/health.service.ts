import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Vaccination } from '../entities/vaccination.entity';
import { VaccineType } from '../entities/vaccine-type.entity';
import { Pig } from '../entities/pig.entity';

@Injectable()
export class HealthService {
    constructor(
        @InjectRepository(Vaccination)
        private vaccinationRepository: Repository<Vaccination>,
        @InjectRepository(VaccineType)
        private vaccineTypeRepository: Repository<VaccineType>,
    ) { }

    async recordVaccination(pigId: number, vaccineTypeId: number, date: string, notes?: string) {
        const vaccineType = await this.vaccineTypeRepository.findOne({
            where: { id: vaccineTypeId },
        });

        if (!vaccineType) throw new Error('Vaccine type not found');

        const vaccinationDate = new Date(date);
        let nextDueDate = null;

        if (vaccineType.defaultRecallDays) {
            nextDueDate = new Date(vaccinationDate);
            nextDueDate.setDate(nextDueDate.getDate() + vaccineType.defaultRecallDays);
        }

        const vaccination = this.vaccinationRepository.create({
            pig: { id: pigId } as Pig,
            vaccineType,
            date: vaccinationDate,
            nextDueDate,
            notes,
        });

        return this.vaccinationRepository.save(vaccination);
    }

    async getUpcomingVaccinations() {
        return this.vaccinationRepository.find({
            where: {
                nextDueDate: MoreThanOrEqual(new Date()),
            },
            relations: ['pig', 'vaccineType'],
            order: {
                nextDueDate: 'ASC',
            },
        });
    }

    async getVaccineTypes() {
        return this.vaccineTypeRepository.find();
    }
}
