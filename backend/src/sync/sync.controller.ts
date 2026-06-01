import { Controller, Post, Body, Get } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
    constructor(private readonly syncService: SyncService) {}

    @Post()
    async sync(@Body() mutations: any[]) {
        await this.syncService.applyMutations(mutations);
        return this.syncService.getFullState();
    }

    @Get()
    async getFullState() {
        return this.syncService.getFullState();
    }
}
