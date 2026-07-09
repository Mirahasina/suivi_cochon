import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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

    @Column({ default: 'PIGLET' })
    target: 'PIGLET' | 'SOW' | 'BOAR' | 'GILT' | 'ALL';

    @Column({ default: 'IM' })
    injectionRoute: string;

    @Column({ nullable: true })
    injectionSite: string;

    @Column({ nullable: true })
    timingNote: string;

    @Column({ default: false })
    isMandatory: boolean;

    @Column({ default: true })
    isEnabled: boolean;

    @Column({ default: false })
    isCustom: boolean;
}
