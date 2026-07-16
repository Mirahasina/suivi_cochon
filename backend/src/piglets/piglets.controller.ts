import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RecordFarrowingDto } from './dto/record-farrowing.dto';
import { PigletsService } from './piglets.service';

@Controller('piglets')
export class PigletsController {
    constructor(private readonly pigletsService: PigletsService) { }

    @Post('farrowing')
    recordFarrowing(@Body() dto: RecordFarrowingDto) {
        return this.pigletsService.recordFarrowing(dto);
    }

    @Get('mother/:motherId')
    findByMother(@Param('motherId') motherId: string) {
        return this.pigletsService.findByMother(+motherId);
    }

    @Patch(':id/sell')
    sell(
        @Param('id') id: string,
        @Body() body: {
            saleType?: 'PIGLET_UNIT' | 'CARCASS_KG';
            price?: number;
            totalPrice?: number;
            pricePerKg?: number;
            weightKg?: number;
            liveWeightKg?: number;
            date?: string;
        },
    ) {
        return this.pigletsService.sell(+id, {
            saleType: body.saleType || 'PIGLET_UNIT',
            totalPrice: body.totalPrice ?? body.price,
            pricePerKg: body.pricePerKg,
            weightKg: body.weightKg,
            liveWeightKg: body.liveWeightKg,
            date: body.date,
        });
    }

    @Patch(':id/died')
    markDead(@Param('id') id: string, @Body('date') date?: string) {
        return this.pigletsService.markDead(+id, date);
    }
}
