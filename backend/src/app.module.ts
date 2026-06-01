import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedingEntry } from './entities/feeding-entry.entity';
import { GrowthNorm } from './entities/growth-norm.entity';
import { Pig } from './entities/pig.entity';
import { Piglet } from './entities/piglet.entity';
import { Vaccination } from './entities/vaccination.entity';
import { VaccineType } from './entities/vaccine-type.entity';
import { WeightEntry } from './entities/weight-entry.entity';
import { Building } from './entities/building.entity';
import { Batch } from './entities/batch.entity';
import { HealthModule } from './health/health.module';
import { PigletsModule } from './piglets/piglets.module';
import { PigsModule } from './pigs/pigs.module';
import { SyncModule } from './sync/sync.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                url: configService.get('DATABASE_URL'),
                entities: [Pig, WeightEntry, VaccineType, Vaccination, GrowthNorm, FeedingEntry, Piglet, Building, Batch],
                synchronize: true,
            }),
        }),
        PigsModule,
        HealthModule,
        PigletsModule,
        SyncModule,
    ],
})
export class AppModule { }
