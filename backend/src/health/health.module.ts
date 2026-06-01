import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { Vaccination } from '../entities/vaccination.entity';
import { VaccineType } from '../entities/vaccine-type.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vaccination, VaccineType])],
    controllers: [HealthController],
    providers: [HealthService],
    exports: [HealthService],
})
export class HealthModule { }
