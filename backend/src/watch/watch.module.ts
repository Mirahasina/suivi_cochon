import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchAlert } from '../entities/watch-alert.entity';
import { WatchController } from './watch.controller';
import { WatchService } from './watch.service';

@Module({
    imports: [TypeOrmModule.forFeature([WatchAlert])],
    controllers: [WatchController],
    providers: [WatchService],
})
export class WatchModule {}

