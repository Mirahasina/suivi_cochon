import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { PigletsController } from './piglets.controller';
import { PigletsService } from './piglets.service';

@Module({
    imports: [TypeOrmModule.forFeature([Piglet, Pig])],
    controllers: [PigletsController],
    providers: [PigletsService],
})
export class PigletsModule { }
