import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Pig } from './pig.entity';

@Entity()
export class FeedingEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    quantityKg: number;

    @Column({ type: 'bigint' })
    costAriary: number;

    @Column({ default: false })
    isManual: boolean;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    date: Date;

    @ManyToOne(() => Pig, (pig) => pig.feedingEntries, { onDelete: 'CASCADE' })
    pig: Pig;
}
