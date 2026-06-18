import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { JointApplication } from './joint-application.entity';
import { ServiceItem } from './service-item.entity';
import { Application } from './application.entity';

@Entity('joint_sub_applications')
export class JointSubApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jointApplicationId: number;

  @ManyToOne(() => JointApplication, joint => joint.subApplications)
  @JoinColumn({ name: 'jointApplicationId' })
  jointApplication: JointApplication;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ nullable: true })
  applicationId: number;

  @OneToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ default: 'pending' })
  splitStatus: string;

  @Column({ default: 'pending' })
  status: string;

  @Column('text', { nullable: true })
  formData: string;

  @Column('text', { nullable: true })
  reviewComment: string;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
