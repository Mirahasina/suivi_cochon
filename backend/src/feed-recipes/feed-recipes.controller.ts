import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FeedRecipesService } from './feed-recipes.service';

@Controller('feed-recipes')
export class FeedRecipesController {
    constructor(private readonly service: FeedRecipesService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Post()
    create(@Body() body: { name: string; ingredients: { name: string; percentKg: number; costPerKg: number }[] }) {
        return this.service.create(body);
    }

    @Patch(':id/activate')
    activate(@Param('id') id: string) {
        return this.service.setActive(+id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
