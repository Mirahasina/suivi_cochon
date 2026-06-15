import { Body, Controller, Get, ParseIntPipe, Post } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('ping')
    ping() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    @Get('health/vaccines')
    getVaccineTypes() {
        return this.healthService.getVaccineTypes();
    }

    @Get('health/upcoming')
    getUpcoming() {
        return this.healthService.getUpcomingVaccinations();
    }

    @Post('health/record')
    recordVaccination(
        @Body('pigId', ParseIntPipe) pigId: number,
        @Body('vaccineTypeId', ParseIntPipe) vaccineTypeId: number,
        @Body('date') date: string,
        @Body('notes') notes?: string,
    ) {
        return this.healthService.recordVaccination(pigId, vaccineTypeId, date, notes);
    }
}
