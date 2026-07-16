import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../entities/expense.entity';
import { FeedingEntry } from '../entities/feeding-entry.entity';
import { Pig } from '../entities/pig.entity';
import { Piglet } from '../entities/piglet.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
    imports: [TypeOrmModule.forFeature([Pig, Piglet, FeedingEntry, Expense])],
    controllers: [FinanceController],
    providers: [FinanceService],
})
export class FinanceModule {}
