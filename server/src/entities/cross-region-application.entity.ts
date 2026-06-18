import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';
import { Application } from './application.entity';
import { CrossRegionDepartment } from './cross-region-department.entity';

@Entity('cross_region_applications')
export class CrossRegionApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  crossRegionNo: string;

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
  localDepartmentId: number;

  @ManyToOne(() => CrossRegionDepartment)
  @JoinColumn({ name: 'localDepartmentId' })
  localDepartment: CrossRegionDepartment;

  @Column()
  remoteDepartmentId: number;

  @ManyToOne(() => CrossRegionDepartment)
  @JoinColumn({ name: 'remoteDepartmentId' })
  remoteDepartment: CrossRegionDepartment;

  @Column({ default: 'local' })
  currentHandler: string;

  @Column({ default: 'pending_verify' })
  status: string;

  @Column('text')
  formData: string;

  @Column('text', { nullable: true })
  materials: string;

  @Column({ nullable: true })
  applicantLocation: string;

  @Column({ nullable: true })
  jurisdictionVerifyStatus: string;

  @Column('text', { nullable: true })
  jurisdictionVerifyResult: string;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifiedBy' })
  verifier: User;

  @Column({ nullable: true })
  departmentSwitchCount: number;

  @Column('text', { nullable: true })
  departmentSwitchLog: string;

  @Column({ nullable: true })
  localReviewerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'localReviewerId' })
  localReviewer: User;

  @Column({ nullable: true })
  remoteReviewerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'remoteReviewerId' })
  remoteReviewer: User;

  @Column('text', { nullable: true })
  reviewComment: string;

  @Column({ default: false })
  progressShared: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
