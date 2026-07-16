import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ExpenseCategory } from '../entities/expense.entity';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) {}

    @Get()
    findAll() {
        return this.expensesService.findAll();
    }

    @Post()
    create(
        @Body()
        body: {
            amountAriary: number;
            category?: ExpenseCategory;
            note?: string;
            date?: string;
        },
    ) {
        return this.expensesService.create(body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.expensesService.remove(+id);
    }
}
