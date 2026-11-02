import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
    const pigRepo = {
        find: jest.fn().mockResolvedValue([
            { id: 1, name: 'Pig 1', breed: 'Large White', purchasePrice: 100, isQuarantined: false },
        ]),
    };
    const feedingRepo = {
        find: jest.fn().mockResolvedValue([
            { pig: { id: 1 }, date: new Date('2026-09-09T21:00:00.000Z'), quantityKg: 3, costAriary: 30 },
            { pig: { id: 1 }, date: new Date('2026-09-10T00:00:00.000Z'), quantityKg: 2, costAriary: 20 },
            { pig: { id: 1 }, date: new Date('2026-09-20T23:59:59.999Z'), quantityKg: 4, costAriary: 40 },
            { pig: { id: 1 }, date: new Date('2026-09-21T00:00:00.000Z'), quantityKg: 5, costAriary: 50 },
        ]),
    };
    const weightRepo = {
        find: jest.fn().mockResolvedValue([{ pig: { id: 1 }, date: new Date('2026-09-20T00:00:00.000Z'), weight: 25 }]),
    };
    const vaccinationRepo = {
        find: jest.fn().mockResolvedValue([{ pig: { id: 1 } }, { pig: { id: 1 } }]),
    };
    const healthService = {
        getAllSuggestions: jest.fn().mockResolvedValue([{ status: 'due' }, { status: 'upcoming' }]),
    };
    const settingsService = {
        getAll: jest.fn().mockResolvedValue({ farmRegion: 'Antananarivo' }),
    };

    let service: ReportsService;

    beforeEach(() => {
        jest.clearAllMocks();
        pigRepo.find.mockResolvedValue([
            { id: 1, name: 'Pig 1', breed: 'Large White', purchasePrice: 100, isQuarantined: false },
        ]);
        feedingRepo.find.mockResolvedValue([
            { pig: { id: 1 }, date: new Date('2026-09-09T21:00:00.000Z'), quantityKg: 3, costAriary: 30 },
            { pig: { id: 1 }, date: new Date('2026-09-10T00:00:00.000Z'), quantityKg: 2, costAriary: 20 },
            { pig: { id: 1 }, date: new Date('2026-09-20T23:59:59.999Z'), quantityKg: 4, costAriary: 40 },
            { pig: { id: 1 }, date: new Date('2026-09-21T00:00:00.000Z'), quantityKg: 5, costAriary: 50 },
        ]);
        weightRepo.find.mockResolvedValue([
            { pig: { id: 1 }, date: new Date('2026-09-20T00:00:00.000Z'), weight: 25 },
        ]);
        vaccinationRepo.find.mockResolvedValue([{ pig: { id: 1 } }, { pig: { id: 1 } }]);

        service = new ReportsService(
            pigRepo as never,
            vaccinationRepo as never,
            feedingRepo as never,
            weightRepo as never,
            healthService as never,
            settingsService as never,
        );
    });

    it('sums only feeding entries inside the selected inclusive date range', async () => {
        const report = await service.getMonthlySummary('2026-09-10', '2026-09-20');

        expect(report.startDate).toBe('2026-09-10');
        expect(report.endDate).toBe('2026-09-20');
        expect(report.totalFeedKg).toBe(6);
        expect(report.totalFeedCost).toBe(60);
        expect(report.pigs[0].monthlyFeedKg).toBe(6);
        expect(report.pigs[0].vaccinationsCount).toBe(2);
    });

    it('rejects invalid and reversed date ranges', async () => {
        await expect(service.getMonthlySummary('2026-02-30', '2026-03-01')).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.getMonthlySummary('2026-09-21', '2026-09-20')).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.getMonthlySummary('2026-09-01')).rejects.toBeInstanceOf(BadRequestException);
        expect(pigRepo.find).not.toHaveBeenCalled();
    });
});
