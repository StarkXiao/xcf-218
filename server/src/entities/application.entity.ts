import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { ProgressRecord } from './progress-record.entity';
import { MaterialFile } from './material-file.entity';
import { SupplementRecord } from './supplement-record.entity';
import { WithdrawalRecord } from './withdrawal-record.entity';
import { MaterialTemplate } from './material-template.entity';

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

  @Column({ nullable: true })
  materialTemplateId: number;

  @ManyToOne(() => MaterialTemplate)
  @JoinColumn({ name: 'materialTemplateId' })
  materialTemplate: MaterialTemplate;

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

  @Column({ nullable: true })
  originalApplicationId: number;

  @Column({ default: 0 })
  withdrawalCount: number;

  @Column({ default: 0 })
  resubmitCount: number;

  @Column({ nullable: true })
  lastWithdrawnAt: Date;

  @Column({ default: false })
  isResubmit: boolean;

  @OneToMany(() => ProgressRecord, record => record.application)
  progressRecords: ProgressRecord[];

  @OneToMany(() => MaterialFile, file => file.application)
  materialFiles: MaterialFile[];

  @OneToMany(() => SupplementRecord, record => record.application)
  supplementRecords: SupplementRecord[];

  @OneToMany(() => WithdrawalRecord, record => record.application)
  withdrawalRecords: WithdrawalRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
