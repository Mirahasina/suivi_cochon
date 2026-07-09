import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedRecipe } from '../entities/feed-recipe.entity';
import { FeedRecipesController } from './feed-recipes.controller';
import { FeedRecipesService } from './feed-recipes.service';

@Module({
    imports: [TypeOrmModule.forFeature([FeedRecipe])],
    controllers: [FeedRecipesController],
    providers: [FeedRecipesService],
    exports: [FeedRecipesService],
})
export class FeedRecipesModule {}
