import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceItem } from './service-item.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ type: 'date' })
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ default: 10 })
  capacity: number;

  @Column({ default: 0 })
  bookedCount: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
