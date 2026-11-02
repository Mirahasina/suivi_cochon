import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from '../entities/pig.entity';
import { Vaccination } from '../entities/vaccination.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { HealthModule } from '../health/health.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
    imports: [TypeOrmModule.forFeature([Pig, Vaccination, FeedingEntry, WeightEntry]), HealthModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule {}
