import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Building } from './building.entity';
import { Pig } from './pig.entity';

@Entity()
export class Batch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    startDate: Date;

    @Column({ default: 'ACTIVE' })
    status: 'ACTIVE' | 'CLOSED';

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Building, (building) => building.batches, { nullable: true })
    building: Building;

    @OneToMany(() => Pig, (pig) => pig.batch)
    pigs: Pig[];
}
