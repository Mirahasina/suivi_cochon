import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Vaccination } from '../entities/vaccination.entity';
import { VaccineType } from '../entities/vaccine-type.entity';
import { Pig } from '../entities/pig.entity';
import { INJECTION_ROUTES, PIGLET_VACCINE_SCHEDULE, SOW_VACCINE_SCHEDULE } from './vaccine-catalog';

export interface VaccineSuggestion {
    pigId: number;
    pigName: string;
    vaccineTypeId: number;
    vaccineName: string;
    label: string;
    injectionRoute: string;
    injectionRouteLabel: string;
    injectionSite: string;
    timingNote: string;
    target: string;
    dueAtDays: number;
    ageInDays: number;
    status: 'overdue' | 'due' | 'upcoming';
    scheduledDate: string;
}

@Injectable()
export class HealthService {
    constructor(
        @InjectRepository(Vaccination)
        private vaccinationRepository: Repository<Vaccination>,
        @InjectRepository(VaccineType)
        private vaccineTypeRepository: Repository<VaccineType>,
        @InjectRepository(Pig)
        private pigRepository: Repository<Pig>,
    ) {}

    private getAgeInDays(birthDate: Date) {
        return Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    private getScheduledDate(birthDate: Date, ageInDays: number) {
        const date = new Date(birthDate);
        date.setDate(date.getDate() + ageInDays);
        return date;
    }

    private routeLabel(route: string) {
        return INJECTION_ROUTES[route as keyof typeof INJECTION_ROUTES] || route;
    }

    async recordVaccination(pigId: number, vaccineTypeId: number, date: string, notes?: string) {
        const vaccineType = await this.vaccineTypeRepository.findOne({ where: { id: vaccineTypeId } });
        if (!vaccineType) throw new Error('Vaccine type not found');

        const vaccinationDate = new Date(date);
        let nextDueDate = null;

        if (vaccineType.defaultRecallDays != null) {
            nextDueDate = new Date(vaccinationDate);
            nextDueDate.setDate(nextDueDate.getDate() + vaccineType.defaultRecallDays);
        }

        return this.vaccinationRepository.save(
            this.vaccinationRepository.create({
                pig: { id: pigId } as Pig,
                vaccineType,
                date: vaccinationDate,
                nextDueDate,
                notes,
            }),
        );
    }

    async getUpcomingVaccinations() {
        return this.vaccinationRepository.find({
            where: { nextDueDate: MoreThanOrEqual(new Date()) },
            relations: ['pig', 'vaccineType'],
            order: { nextDueDate: 'ASC' },
        });
    }

    async getVaccineTypes() {
        return this.vaccineTypeRepository.find({ order: { isCustom: 'ASC', target: 'ASC', name: 'ASC' } });
    }

    async createVaccineType(data: {
        name: string;
        defaultRecallDays: number;
        target?: VaccineType['target'];
        injectionRoute?: string;
        description?: string;
        timingNote?: string;
    }) {
        const existing = await this.vaccineTypeRepository.findOneBy({ name: data.name });
        if (existing) throw new BadRequestException('Un vaccin avec ce nom existe déjà');
        return this.vaccineTypeRepository.save(
            this.vaccineTypeRepository.create({
                name: data.name.trim(),
                description: data.description,
                defaultRecallDays: data.defaultRecallDays,
                target: data.target || 'ALL',
                injectionRoute: data.injectionRoute || 'IM',
                injectionSite: 'Selon produit',
                timingNote: data.timingNote || 'Rappel personnalisé',
                isMandatory: false,
                isEnabled: true,
                isCustom: true,
            }),
        );
    }

    async setVaccineEnabled(id: number, isEnabled: boolean) {
        const vt = await this.vaccineTypeRepository.findOneBy({ id });
        if (!vt) throw new NotFoundException('Vaccin introuvable');
        await this.vaccineTypeRepository.update(id, { isEnabled });
        return this.vaccineTypeRepository.findOneBy({ id });
    }

    async deleteCustomVaccine(id: number) {
        const vt = await this.vaccineTypeRepository.findOneBy({ id });
        if (!vt) throw new NotFoundException('Vaccin introuvable');
        if (!vt.isCustom) throw new BadRequestException('Seuls les vaccins personnalisés peuvent être supprimés');
        await this.vaccineTypeRepository.delete(id);
        return { ok: true };
    }

    private enabledTypes(types: VaccineType[]) {
        return types.filter((v) => v.isEnabled !== false);
    }

    async getPigVaccinations(pigId: number) {
        return this.vaccinationRepository.find({
            where: { pig: { id: pigId } },
            relations: ['vaccineType'],
            order: { date: 'DESC' },
        });
    }

    async getSuggestionsForPig(pigId: number): Promise<VaccineSuggestion[]> {
        const pig = await this.pigRepository.findOne({
            where: { id: pigId, status: 'ACTIVE' },
            relations: ['vaccinations', 'vaccinations.vaccineType'],
        });
        if (!pig) throw new NotFoundException('Pig not found');
        return this.computeSuggestions(pig);
    }

    async getAllSuggestions(): Promise<VaccineSuggestion[]> {
        const pigs = await this.pigRepository.find({
            where: { status: 'ACTIVE' },
            relations: ['vaccinations', 'vaccinations.vaccineType'],
        });
        const all: VaccineSuggestion[] = [];
        for (const pig of pigs) {
            all.push(...(await this.computeSuggestions(pig)));
        }
        return all.sort((a, b) => {
            const priority = { overdue: 0, due: 1, upcoming: 2 };
            return priority[a.status] - priority[b.status] || a.scheduledDate.localeCompare(b.scheduledDate);
        });
    }

    private buildSuggestion(
        pig: Pig,
        vaccineType: VaccineType,
        label: string,
        scheduledDate: Date,
        referenceDays: number,
    ): VaccineSuggestion | null {
        const now = new Date();
        const daysUntil = Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status: VaccineSuggestion['status'];
        if (daysUntil < 0) status = 'overdue';
        else if (daysUntil <= 7) status = 'due';
        else if (daysUntil <= 21) status = 'upcoming';
        else return null;

        return {
            pigId: pig.id,
            pigName: pig.name,
            vaccineTypeId: vaccineType.id,
            vaccineName: vaccineType.name,
            label,
            injectionRoute: vaccineType.injectionRoute,
            injectionRouteLabel: this.routeLabel(vaccineType.injectionRoute),
            injectionSite: vaccineType.injectionSite,
            timingNote: vaccineType.timingNote,
            target: vaccineType.target,
            dueAtDays: referenceDays,
            ageInDays: pig.birthDate ? this.getAgeInDays(new Date(pig.birthDate)) : 0,
            status,
            scheduledDate: scheduledDate.toISOString(),
        };
    }

    private async computeSuggestions(pig: Pig): Promise<VaccineSuggestion[]> {
        const doneTypeIds = new Set((pig.vaccinations || []).map((v) => v.vaccineType.id));
        const vaccineTypes = this.enabledTypes(await this.vaccineTypeRepository.find());
        const suggestions: VaccineSuggestion[] = [];

        // Planning porcelets / jeunes (tous sauf truies gestantes avec planning spécifique)
        if (pig.birthDate) {
            const birth = new Date(pig.birthDate);
            const ageInDays = this.getAgeInDays(birth);

            for (const entry of PIGLET_VACCINE_SCHEDULE) {
                const vt = vaccineTypes.find((v) => v.name === entry.vaccineName);
                if (!vt || doneTypeIds.has(vt.id)) continue;
                if (vt.target === 'SOW' && pig.gender !== 'FEMALE') continue;
                if (vt.target === 'BOAR' && pig.gender !== 'MALE') continue;

                const scheduled = this.getScheduledDate(birth, entry.ageInDays);
                const s = this.buildSuggestion(pig, vt, entry.label, scheduled, entry.ageInDays);
                if (s) suggestions.push(s);
            }
        }

        // Planning truie avant mise-bas
        if (pig.gender === 'FEMALE' && pig.farrowingDate) {
            const farrowing = new Date(pig.farrowingDate);
            for (const entry of SOW_VACCINE_SCHEDULE) {
                if (!entry.requiresFarrowingDate) continue;
                const vt = vaccineTypes.find((v) => v.name === entry.vaccineName);
                if (!vt || doneTypeIds.has(vt.id)) continue;

                const scheduled = new Date(farrowing);
                scheduled.setDate(scheduled.getDate() - entry.daysBeforeFarrowing);
                const s = this.buildSuggestion(pig, vt, entry.label, scheduled, -entry.daysBeforeFarrowing);
                if (s) suggestions.push(s);
            }
        }

        // Planning truie avant saillie
        if (pig.gender === 'FEMALE' && pig.matingDate) {
            const mating = new Date(pig.matingDate);
            const preMatingVaccines = ['Parvovirus Truie (Pré-saillie)', 'Rouget Truie (Pré-saillie)'];
            for (const name of preMatingVaccines) {
                const vt = vaccineTypes.find((v) => v.name === name);
                if (!vt || doneTypeIds.has(vt.id)) continue;
                const scheduled = new Date(mating);
                scheduled.setDate(scheduled.getDate() - 21);
                const s = this.buildSuggestion(pig, vt, `${name} — 3 sem. avant saillie`, scheduled, -21);
                if (s) suggestions.push(s);
            }
        }

        // Verrats
        if (pig.gender === 'MALE' && pig.birthDate) {
            const boarVaccines = vaccineTypes.filter((v) => v.target === 'BOAR');
            const ageInDays = this.getAgeInDays(new Date(pig.birthDate));
            if (ageInDays >= 180) {
                for (const vt of boarVaccines) {
                    if (doneTypeIds.has(vt.id)) continue;
                    const scheduled = new Date();
                    const s = this.buildSuggestion(pig, vt, vt.timingNote, scheduled, ageInDays);
                    if (s) suggestions.push(s);
                }
            }
        }

        return suggestions;
    }
}
