import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('monthly')
    getMonthly(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        return this.reportsService.getMonthlySummary(startDate, endDate);
    }
}
