import { Controller, Get, Param } from '@nestjs/common';
import { GenealogyService } from './genealogy.service';

@Controller('pigs')
export class GenealogyController {
    constructor(private readonly genealogyService: GenealogyService) { }

    @Get(':id/ancestors')
    getAncestors(@Param('id') id: string) {
        return this.genealogyService.getAncestors(+id);
    }

    @Get(':id/descendants')
    getDescendants(@Param('id') id: string) {
        return this.genealogyService.getDescendants(+id);
    }

    @Get('breeding/stats')
    getBreedingStats() {
        return this.genealogyService.getBreedingStats();
    }
}
