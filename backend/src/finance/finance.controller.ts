import { Controller, Get, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    @Get('summary')
    getSummary(@Query('month') month?: string, @Query('year') year?: string) {
        const m = month != null && month !== '' ? Number(month) : undefined;
        const y = year != null && year !== '' ? Number(year) : undefined;
        return this.financeService.getSummary(
            m != null && !Number.isNaN(m) ? m : undefined,
            y != null && !Number.isNaN(y) ? y : undefined,
        );
    }
}
