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
        @Body('price') price: number,
        @Body('date') date?: string,
    ) {
        return this.pigletsService.sell(+id, price, date);
    }

    @Patch(':id/died')
    markDead(@Param('id') id: string, @Body('date') date?: string) {
        return this.pigletsService.markDead(+id, date);
    }
}
