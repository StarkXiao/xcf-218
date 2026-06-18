import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Certificate } from './certificate.entity';
import { ServiceItem } from './service-item.entity';

@Entity('certificate_reminders')
export class CertificateReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  certificateId: number;

  @ManyToOne(() => Certificate)
  @JoinColumn({ name: 'certificateId' })
  certificate: Certificate;

  @Column({ nullable: true })
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ type: 'datetime' })
  expiredAt: Date;

  @Column()
  reminderType: string;

  @Column({ type: 'int' })
  daysBeforeExpiry: number;

  @Column({ default: false })
  notified: boolean;

  @Column({ type: 'datetime', nullable: true })
  notifiedAt: Date;

  @Column({ default: false })
  renewalInitiated: boolean;

  @Column({ type: 'datetime', nullable: true })
  renewalInitiatedAt: Date;

  @Column({ nullable: true })
  messageId: number;

  @Column('text', { nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
