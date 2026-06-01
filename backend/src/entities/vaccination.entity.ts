import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Pig } from './pig.entity';
import { VaccineType } from './vaccine-type.entity';

@Entity()
export class Vaccination {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    date: Date;

    @Column({ nullable: true })
    nextDueDate: Date;

    @Column({ nullable: true })
    notes: string;

    @ManyToOne(() => Pig, (pig) => pig.vaccinations, { onDelete: 'CASCADE' })
    pig: Pig;

    @ManyToOne(() => VaccineType, (vt) => vt.vaccinations)
    vaccineType: VaccineType;
}
