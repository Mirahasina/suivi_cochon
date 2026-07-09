import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { HealthService } from './health.service';

import { BIOSECURITY_PPA } from './vaccine-schedule';

@Controller()
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('ping')
    ping() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    @Get('health/biosecurity')
    getBiosecurity() {
        return BIOSECURITY_PPA;
    }

    @Get('health/vaccines')
    getVaccineTypes() {
        return this.healthService.getVaccineTypes();
    }

    @Get('health/upcoming')
    getUpcoming() {
        return this.healthService.getUpcomingVaccinations();
    }

    @Get('health/suggested')
    getAllSuggested() {
        return this.healthService.getAllSuggestions();
    }

    @Get('health/suggested/:pigId')
    getSuggestedForPig(@Param('pigId', ParseIntPipe) pigId: number) {
        return this.healthService.getSuggestionsForPig(pigId);
    }

    @Get('health/pig/:pigId')
    getPigVaccinations(@Param('pigId', ParseIntPipe) pigId: number) {
        return this.healthService.getPigVaccinations(pigId);
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
