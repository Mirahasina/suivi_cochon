import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['ageInWeeks', 'breed'])
export class GrowthNorm {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ageInWeeks: number;

    @Column({ default: 'Large White' })
    breed: string;

    @Column({ type: 'float' })
    expectedWeight: number;

    @Column({ type: 'float' })
    recommendedFeed: number;
}
