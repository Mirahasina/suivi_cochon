import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class WatchAlert {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 'DISEASE' })
    type: 'DISEASE' | 'THEFT' | 'SUPPLY' | 'OTHER';

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    details?: string;

    @Column({ nullable: true })
    location?: string;

    @Column({ default: 'MEDIUM' })
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

    @Column({ default: 'OPEN' })
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

    @Column({ default: 'MANUAL' })
    source: 'MANUAL' | 'WEB' | 'AI';

    @CreateDateColumn()
    createdAt: Date;
}

