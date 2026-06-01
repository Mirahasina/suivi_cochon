import { Controller, Get, Post, Body, ParseIntPipe } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('vaccines')
    getVaccineTypes() {
        return this.healthService.getVaccineTypes();
    }

    @Get('upcoming')
    getUpcoming() {
        return this.healthService.getUpcomingVaccinations();
    }

    @Post('record')
    recordVaccination(
        @Body('pigId', ParseIntPipe) pigId: number,
        @Body('vaccineTypeId', ParseIntPipe) vaccineTypeId: number,
        @Body('date') date: string,
        @Body('notes') notes?: string,
    ) {
        return this.healthService.recordVaccination(pigId, vaccineTypeId, date, notes);
    }
}
