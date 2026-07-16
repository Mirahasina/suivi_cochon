import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ExpenseCategory = 'VET' | 'TRANSPORT' | 'LABOR' | 'MEDS' | 'EQUIPMENT' | 'OTHER';

@Entity()
export class Expense {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    date: Date;

    @Column({ type: 'bigint' })
    amountAriary: number;

    @Column({ default: 'OTHER' })
    category: ExpenseCategory;

    @Column({ nullable: true })
    note: string;

    @CreateDateColumn()
    createdAt: Date;
}
