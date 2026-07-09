import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CreatePigDto } from './dto/create-pig.dto';
import { PigsService } from './pigs.service';

@Controller('pigs')
export class PigsController {
    constructor(private readonly pigsService: PigsService) {}

    @Get()
    findAll() {
        return this.pigsService.findAll();
    }

    @Post('bulk')
    importBulk(@Body() body: { pigs: CreatePigDto[] }) {
        return this.pigsService.importBulk(body.pigs || []);
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

    @Post(':id/quarantine')
    setQuarantine(
        @Param('id') id: string,
        @Body() body: { isQuarantined: boolean; reason?: string },
    ) {
        return this.pigsService.setQuarantine(+id, body.isQuarantined, body.reason);
    }

    @Patch(':id/raising-purpose')
    setRaisingPurpose(
        @Param('id') id: string,
        @Body('purpose') purpose: 'UNDECIDED' | 'FATTENING' | 'BREEDING',
    ) {
        return this.pigsService.setRaisingPurpose(+id, purpose);
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
    sell(
        @Param('id') id: string,
        @Body() body: {
            saleType: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT';
            pricePerKg?: number;
            weightKg?: number;
            totalPrice?: number;
            price?: number;
            date?: string;
        },
    ) {
        return this.pigsService.sell(+id, {
            saleType: body.saleType || 'UNIT',
            pricePerKg: body.pricePerKg,
            weightKg: body.weightKg,
            totalPrice: body.totalPrice ?? body.price,
            date: body.date,
        });
    }
}
