import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { Building } from '../entities/building.entity';
import { Batch } from '../entities/batch.entity';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
    imports: [TypeOrmModule.forFeature([Pig, Piglet, Building, Batch])],
    controllers: [SyncController],
    providers: [SyncService],
})
export class SyncModule {}
