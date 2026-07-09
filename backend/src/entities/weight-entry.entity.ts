import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Pig } from './pig.entity';

@Entity()
export class WeightEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    weight: number;

    @Column({ default: false })
    isManual: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    date: Date;

    @ManyToOne(() => Pig, (pig) => pig.weightEntries, { onDelete: 'CASCADE' })
    pig: Pig;
}
