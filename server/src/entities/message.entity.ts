import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  read: boolean;

  @Column({ default: 'system' })
  type: string;

  @Column({ nullable: true })
  reminderType: string;

  @Column({ nullable: true })
  applicationId: number;

  @Column({ nullable: true })
  appointmentId: number;

  @Column({ nullable: true })
  serviceItemId: number;

  @Column({ nullable: true })
  windowHandlingId: number;

  @Column({ nullable: true })
  approvalRecordId: number;

  @Column({ nullable: true })
  oldStatus: string;

  @Column({ nullable: true })
  newStatus: string;

  @Column({ nullable: true })
  pendingHours: number;

  @CreateDateColumn()
  createdAt: Date;
}
