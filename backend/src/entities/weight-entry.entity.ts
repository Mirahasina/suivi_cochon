import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Pig } from './pig.entity';

@Entity()
export class WeightEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    weight: number;

    @CreateDateColumn()
    date: Date;

    @ManyToOne(() => Pig, (pig) => pig.weightEntries, { onDelete: 'CASCADE' })
    pig: Pig;
}
