import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class GrowthNorm {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    ageInWeeks: number;

    @Column({ type: 'float' })
    expectedWeight: number;

    @Column({ type: 'float' })
    recommendedFeed: number;
}
