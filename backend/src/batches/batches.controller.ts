import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
    constructor(private readonly batchesService: BatchesService) {}

    @Get()
    findAll() {
        return this.batchesService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; startDate?: string; buildingId?: number }) {
        return this.batchesService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
        return this.batchesService.update(+id, body as any);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.batchesService.remove(+id);
    }
}
