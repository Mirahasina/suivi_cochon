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
import { AppSetting } from './entities/app-setting.entity';
import { FeedRecipe } from './entities/feed-recipe.entity';
import { WatchAlert } from './entities/watch-alert.entity';
import { HealthModule } from './health/health.module';
import { PigletsModule } from './piglets/piglets.module';
import { PigsModule } from './pigs/pigs.module';
import { SyncModule } from './sync/sync.module';
import { SeedModule } from './seed/seed.module';
import { SettingsModule } from './settings/settings.module';
import { BuildingsModule } from './buildings/buildings.module';
import { BatchesModule } from './batches/batches.module';
import { ReportsModule } from './reports/reports.module';
import { FeedRecipesModule } from './feed-recipes/feed-recipes.module';
import { WatchModule } from './watch/watch.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                url: configService.get('DATABASE_URL'),
                entities: [Pig, WeightEntry, VaccineType, Vaccination, GrowthNorm, FeedingEntry, Piglet, Building, Batch, AppSetting, FeedRecipe, WatchAlert],
                synchronize: true,
            }),
        }),
        PigsModule,
        HealthModule,
        PigletsModule,
        SyncModule,
        SeedModule,
        SettingsModule,
        BuildingsModule,
        BatchesModule,
        ReportsModule,
        FeedRecipesModule,
        WatchModule,
    ],
})
export class AppModule { }
