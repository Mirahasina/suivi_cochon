import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedRecipe } from '../entities/feed-recipe.entity';

@Injectable()
export class FeedRecipesService {
    constructor(
        @InjectRepository(FeedRecipe)
        private recipeRepository: Repository<FeedRecipe>,
    ) {}

    findAll() {
        return this.recipeRepository.find({ order: { name: 'ASC' } });
    }

    findActive() {
        return this.recipeRepository.findOne({ where: { isActive: true } });
    }

    create(data: { name: string; ingredients: { name: string; percentKg: number; costPerKg: number }[] }) {
        const total = data.ingredients.reduce((s, i) => s + i.percentKg, 0);
        const costPerKg = data.ingredients.reduce((s, i) => s + (i.percentKg / total) * i.costPerKg, 0);
        return this.recipeRepository.save({
            name: data.name,
            ingredients: JSON.stringify(data.ingredients),
            costPerKg: Math.round(costPerKg),
            isActive: false,
        });
    }

    async setActive(id: number) {
        await this.recipeRepository.update({}, { isActive: false });
        await this.recipeRepository.update(id, { isActive: true });
        return this.recipeRepository.findOneBy({ id });
    }

    async remove(id: number) {
        return this.recipeRepository.delete(id);
    }
}
