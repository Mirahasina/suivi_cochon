import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { Pig } from '../entities/pig.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { HealthService } from '../health/health.service';
import { SettingsService } from '../settings/settings.service';
import { FeedRecipesService } from '../feed-recipes/feed-recipes.service';
import { CreatePigDto } from './dto/create-pig.dto';
import { PigsService } from './pigs.service';

const mockPigRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
};

const mockWeightRepository = {
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
};

const mockFeedingRepository = {
    save: jest.fn(),
    find: jest.fn(),
};

const mockGrowthNormRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
};

const mockHealthService = {
    recordVaccination: jest.fn(),
};

const mockFeedRecipesService = {
    findActive: jest.fn().mockResolvedValue(null),
};

const mockSettingsService = {
    getFeedPricePerKg: jest.fn().mockResolvedValue(2000),
    getFeedPriceForWeek: jest.fn().mockResolvedValue(2000),
    getAll: jest.fn().mockResolvedValue({ livePigSalePricePerKg: 12000, simpleFinanceMode: false }),
};

describe('PigsService', () => {
    let service: PigsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PigsService,
                { provide: getRepositoryToken(Pig), useValue: mockPigRepository },
                { provide: getRepositoryToken(WeightEntry), useValue: mockWeightRepository },
                { provide: getRepositoryToken(FeedingEntry), useValue: mockFeedingRepository },
                { provide: getRepositoryToken(GrowthNorm), useValue: mockGrowthNormRepository },
                { provide: HealthService, useValue: mockHealthService },
                { provide: SettingsService, useValue: mockSettingsService },
                { provide: FeedRecipesService, useValue: mockFeedRecipesService },
            ],
        }).compile();

        service = module.get<PigsService>(PigsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of pigs', async () => {
            const result = [{ id: 1, name: 'Pig 1' }];
            mockPigRepository.find.mockResolvedValue(result);

            expect(await service.findAll()).toBe(result);
        });
    });

    describe('create', () => {
        it('should successfully create a pig', async () => {
            const dto: CreatePigDto = {
                name: 'Piggy',
                breed: 'Large White',
                gender: 'MALE',
                birthDate: '2023-01-01',
                isCastrated: false,
            };
            const savedPig = { id: 1, ...dto };

            mockPigRepository.create.mockReturnValue(savedPig);
            mockPigRepository.save.mockResolvedValue(savedPig);

            expect(await service.create(dto)).toEqual(savedPig);
            expect(mockPigRepository.save).toHaveBeenCalledWith(savedPig);
        });
    });
});
