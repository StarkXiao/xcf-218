import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { Application } from './application.entity';

@Entity('window_handlings')
export class WindowHandling {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  handlingNo: string;

  @Column()
  windowNumber: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ nullable: true })
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  queueNumber: string;

  @Column({ nullable: true })
  applicantName: string;

  @Column({ nullable: true })
  applicantIdCard: string;

  @Column({ nullable: true })
  applicantPhone: string;

  @Column('text', { nullable: true })
  formData: string;

  @Column('text', { nullable: true })
  materials: string;

  @Column({ default: 'accepted' })
  status: string;

  @Column({ nullable: true })
  handlerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'handlerId' })
  handler: User;

  @Column('text', { nullable: true })
  handlingRemark: string;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column({ nullable: true })
  processingAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column('text', { nullable: true })
  syncStatus: string;

  @Column('text', { nullable: true })
  syncRemark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
