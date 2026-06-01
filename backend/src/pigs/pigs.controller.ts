import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CreatePigDto } from './dto/create-pig.dto';
import { PigsService } from './pigs.service';

@Controller('pigs')
export class PigsController {
    constructor(private readonly pigsService: PigsService) { }

    @Get()
    findAll() {
        return this.pigsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pigsService.findOne(+id);
    }

    @Post()
    create(@Body() createPigDto: CreatePigDto) {
        return this.pigsService.create(createPigDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePigDto: any) {
        return this.pigsService.update(+id, updatePigDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pigsService.remove(+id);
    }

    @Post(':id/weight')
    addWeight(@Param('id') id: string, @Body('weight') weight: number) {
        return this.pigsService.addWeight(+id, weight);
    }

    @Post(':id/feeding')
    addFeeding(@Param('id') id: string, @Body() data: { quantityKg: number; costAriary: number }) {
        return this.pigsService.addFeeding(+id, data);
    }

    @Post(':id/mating')
    recordMating(@Param('id') id: string, @Body() data: { partnerId?: number; date?: string; isExternal?: boolean; partnerName?: string }) {
        return this.pigsService.recordMating(+id, data);
    }

    @Put(':id/castrate')
    castrate(@Param('id') id: string) {
        return this.pigsService.castrate(+id);
    }

    @Post(':id/sell')
    sell(@Param('id') id: string, @Body('price') price: number, @Body('date') date?: string) {
        return this.pigsService.sell(+id, price, date);
    }
}
