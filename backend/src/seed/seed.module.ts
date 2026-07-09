import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedRecipe } from '../entities/feed-recipe.entity';
import { GrowthNorm } from '../entities/growth-norm.entity';
import { VaccineType } from '../entities/vaccine-type.entity';
import { SeedService } from './seed.service';

@Module({
    imports: [TypeOrmModule.forFeature([GrowthNorm, VaccineType, FeedRecipe])],
    providers: [SeedService],
})
export class SeedModule {}
