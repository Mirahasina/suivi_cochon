import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Vaccination } from './vaccination.entity';

@Entity()
export class VaccineType {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    defaultRecallDays: number;

    @Column({ default: false })
    isMandatory: boolean;

    @OneToMany(() => Vaccination, (vaccination) => vaccination.vaccineType)
    vaccinations: Vaccination[];
}
