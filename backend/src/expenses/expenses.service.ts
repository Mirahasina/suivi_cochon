import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, ExpenseCategory } from '../entities/expense.entity';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Expense)
        private expenseRepository: Repository<Expense>,
    ) {}

    findAll() {
        return this.expenseRepository.find({ order: { date: 'DESC', id: 'DESC' } });
    }

    create(data: { amountAriary: number; category?: ExpenseCategory; note?: string; date?: string }) {
        return this.expenseRepository.save({
            amountAriary: Math.round(data.amountAriary),
            category: data.category || 'OTHER',
            note: data.note?.trim() || undefined,
            date: data.date ? new Date(data.date) : new Date(),
        });
    }

    async remove(id: number) {
        const result = await this.expenseRepository.delete(id);
        if (!result.affected) throw new NotFoundException(`Expense ${id} not found`);
        return { deleted: true };
    }
}
