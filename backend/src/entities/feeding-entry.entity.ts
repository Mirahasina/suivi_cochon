import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Pig } from './pig.entity';

@Entity()
export class FeedingEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    quantityKg: number;

    @Column({ type: 'bigint' }) // Ariary unit price or total cost
    costAriary: number;

    @CreateDateColumn()
    date: Date;

    @ManyToOne(() => Pig, (pig) => pig.feedingEntries, { onDelete: 'CASCADE' })
    pig: Pig;
}
