import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
export class BuildingsController {
    constructor(private readonly buildingsService: BuildingsService) {}

    @Get()
    findAll() {
        return this.buildingsService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; capacity?: number; location?: string }) {
        return this.buildingsService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.buildingsService.update(+id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.buildingsService.remove(+id);
    }
}
