import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pig } from './pig.entity';

@Entity()
export class Piglet {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name?: string;

    @Column()
    birthDate: Date;

    @Column({ default: 'ALIVE' })
    status: 'ALIVE' | 'DEAD' | 'SOLD' | 'KEPT';

    @Column({ nullable: true })
    deathDate?: Date;

    @Column({ nullable: true })
    saleDate?: Date;

    @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
    salePrice?: number;

    @Column({ nullable: true })
    saleType: 'PIGLET_UNIT' | 'LIVE_KG' | 'CARCASS_KG' | null;

    @Column({ type: 'float', nullable: true })
    saleWeightKg: number;

    @Column({ type: 'float', nullable: true })
    saleLiveWeightKg: number;

    @Column({ type: 'float', nullable: true })
    salePricePerKg: number;

    @ManyToOne(() => Pig, { nullable: false })
    mother: Pig;

    @Column()
    motherId: number;

    @ManyToOne(() => Pig, { nullable: true })
    father?: Pig;

    @Column({ nullable: true })
    fatherId?: number;

    @CreateDateColumn()
    createdAt: Date;
}
