import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class FeedRecipe {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    /** Coût calculé par kg du mélange fini */
    @Column({ type: 'float' })
    costPerKg: number;

    /** JSON: [{ name, percentKg, costPerKg }] */
    @Column({ type: 'text' })
    ingredients: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
