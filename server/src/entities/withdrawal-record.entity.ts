import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';

@Entity('withdrawal_records')
export class WithdrawalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text')
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewerId: number;

  @Column('text', { nullable: true })
  reviewComment: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column({ default: 0 })
  resubmitCount: number;

  @Column('text', { nullable: true })
  snapshot: string;

  @CreateDateColumn()
  createdAt: Date;
}
