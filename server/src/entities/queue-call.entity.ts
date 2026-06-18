import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { WindowHandling } from './window-handling.entity';

@Entity('queue_calls')
export class QueueCall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  callNo: string;

  @Column()
  queueNumber: string;

  @Column()
  windowNumber: string;

  @Column({ nullable: true })
  windowHandlingId: number;

  @ManyToOne(() => WindowHandling)
  @JoinColumn({ name: 'windowHandlingId' })
  windowHandling: WindowHandling;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ nullable: true })
  applicantName: string;

  @Column({ default: 'calling' })
  status: string;

  @Column({ default: 1 })
  callCount: number;

  @Column({ nullable: true })
  callerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'callerId' })
  caller: User;

  @Column({ nullable: true })
  calledAt: Date;

  @Column({ nullable: true })
  arrivedAt: Date;

  @Column({ nullable: true })
  missedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
