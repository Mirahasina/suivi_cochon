import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { WeightEntry } from '../entities/weight-entry.entity';
import { HealthModule } from '../health/health.module';
import { FeedRecipesModule } from '../feed-recipes/feed-recipes.module';
import { GenealogyController } from './genealogy.controller';
import { GenealogyService } from './genealogy.service';
import { PigsController } from './pigs.controller';
import { PigsService } from './pigs.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Pig, WeightEntry, GrowthNorm, FeedingEntry, Piglet]),
        HealthModule,
        FeedRecipesModule,
    ],
    controllers: [PigsController, GenealogyController],
    providers: [PigsService, GenealogyService],
})
export class PigsModule { }
