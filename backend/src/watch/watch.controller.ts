import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WatchService } from './watch.service';

@Controller('watch')
export class WatchController {
    constructor(private readonly watchService: WatchService) {}

    @Get('alerts')
    list(@Query('status') status?: string) {
        return this.watchService.list(status);
    }

    @Post('report')
    report(
        @Body()
        body: {
            type: 'DISEASE' | 'THEFT' | 'SUPPLY' | 'OTHER';
            title: string;
            details?: string;
            location?: string;
            source?: 'MANUAL' | 'WEB' | 'AI';
        },
    ) {
        return this.watchService.report(body);
    }

    @Patch('alerts/:id/ack')
    acknowledge(@Param('id') id: string) {
        return this.watchService.setStatus(+id, 'ACKNOWLEDGED');
    }

    @Patch('alerts/:id/resolve')
    resolve(@Param('id') id: string) {
        return this.watchService.setStatus(+id, 'RESOLVED');
    }
}

