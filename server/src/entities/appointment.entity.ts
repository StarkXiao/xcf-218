import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { Schedule } from './schedule.entity';
import { Application } from './application.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  appointmentNo: string;

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

  @Column()
  scheduleId: number;

  @ManyToOne(() => Schedule)
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @Column({ type: 'date' })
  appointmentDate: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column()
  queueNumber: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  applicationId: number;

  @OneToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column('text', { nullable: true })
  remark: string;

  @Column({ nullable: true })
  checkInTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
