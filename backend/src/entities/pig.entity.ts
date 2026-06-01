import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
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
    gender: string; // "MALE", "FEMALE"

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

    // Reproduction
    @Column({ nullable: true })
    matingDate: Date;

    @Column({ nullable: true })
    partnerId: number;

    @Column({ default: false })
    isExternalPartner: boolean;

    @Column({ nullable: true })
    externalPartnerOwner: string;

    @Column({ nullable: true })
    farrowingDate: Date; // Expected farrowing date (calculated)

    @Column({ nullable: true })
    actualFarrowingDate?: Date; // Actual farrowing date (recorded)

    @Column({ nullable: true })
    totalBorn?: number; // Total piglets born (alive + stillborn)

    @Column({ nullable: true })
    bornAlive?: number; // Piglets born alive

    @Column({ nullable: true })
    stillborn?: number; // Stillborn piglets

    @Column({ default: 0 })
    nursingPiglets: number; // Current number nursing (legacy, may be replaced by counting ALIVE piglets)

    // Status & Sale
    @Column({ default: 'ACTIVE' })
    status: 'ACTIVE' | 'SOLD' | 'DECEASED';

    @Column({ type: 'bigint', nullable: true })
    salePrice: number;

    @Column({ nullable: true })
    saleDate: Date;

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

function ManyToOne(arg0: () => typeof Batch, arg1: (batch: any) => any, arg2: { nullable: boolean; }): (target: Pig, propertyKey: "batch") => void {
    throw new Error('Function not implemented.');
}
