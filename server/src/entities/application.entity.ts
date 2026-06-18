import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { ProgressRecord } from './progress-record.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  applicationNo: string;

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

  @Column('text')
  formData: string;

  @Column('text', { nullable: true })
  materials: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewerId: number;

  @Column('text', { nullable: true })
  reviewComment: string;

  @OneToMany(() => ProgressRecord, record => record.application)
  progressRecords: ProgressRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
