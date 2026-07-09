import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { FeedingEntry } from './feeding-entry.entity';
import { Piglet } from './piglet.entity';
import { Vaccination } from './vaccination.entity';
import { WeightEntry } from './weight-entry.entity';

@Entity()
export class Pig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    breed: string;

    @Column()
    gender: string;

    @Column({ nullable: true })
    birthDate: Date;

    @Column({ nullable: true })
    purchaseDate: Date;

    @Column({ type: 'float', nullable: true })
    purchasePrice: number;

    @Column({ type: 'float', nullable: true })
    initialWeight: number;

    @Column({ default: false })
    isCastrated: boolean;

    @Column({ nullable: true })
    castrationDate: Date;

    @Column({ nullable: true })
    matingDate: Date;

    @Column({ nullable: true })
    partnerId: number;

    @Column({ default: false })
    isExternalPartner: boolean;

    @Column({ nullable: true })
    externalPartnerOwner: string;

    @Column({ nullable: true })
    farrowingDate: Date;

    @Column({ nullable: true })
    actualFarrowingDate?: Date;

    @Column({ nullable: true })
    totalBorn?: number;

    @Column({ nullable: true })
    bornAlive?: number;

    @Column({ nullable: true })
    stillborn?: number;

    @Column({ default: 0 })
    nursingPiglets: number;

    @Column({ default: 'ACTIVE' })
    status: 'ACTIVE' | 'SOLD' | 'DECEASED';

    /** CARCASS_KG = cochon mort/abattu vendu au kg, LIVE_KG = vivant au kg */
    @Column({ nullable: true })
    saleType: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT' | null;

    @Column({ type: 'float', nullable: true })
    saleWeightKg: number;

    @Column({ type: 'float', nullable: true })
    salePricePerKg: number;

    @Column({ type: 'bigint', nullable: true })
    salePrice: number;

    @Column({ nullable: true })
    saleDate: Date;

    @Column({ default: false })
    isQuarantined: boolean;

    @Column({ nullable: true })
    quarantineReason: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => WeightEntry, (weightEntry) => weightEntry.pig)
    weightEntries: WeightEntry[];

    @OneToMany(() => Vaccination, (vaccination) => vaccination.pig)
    vaccinations: Vaccination[];

    @OneToMany(() => FeedingEntry, (feeding) => feeding.pig)
    feedingEntries: FeedingEntry[];

    @OneToMany(() => Piglet, (piglet) => piglet.mother)
    piglets: Piglet[];

    @ManyToOne(() => Batch, (batch) => batch.pigs, { nullable: true })
    batch: Batch;
}
