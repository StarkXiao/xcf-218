import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrossRegionApplication } from './cross-region-application.entity';
import { User } from './user.entity';
import { CrossRegionDepartment } from './cross-region-department.entity';

@Entity('cross_region_progress_shares')
export class CrossRegionProgressShare {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crossRegionApplicationId: number;

  @ManyToOne(() => CrossRegionApplication)
  @JoinColumn({ name: 'crossRegionApplicationId' })
  crossRegionApplication: CrossRegionApplication;

  @Column()
  step: string;

  @Column()
  status: string;

  @Column('text', { nullable: true })
  remark: string;

  @Column()
  operatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column()
  fromDepartmentId: number;

  @ManyToOne(() => CrossRegionDepartment)
  @JoinColumn({ name: 'fromDepartmentId' })
  fromDepartment: CrossRegionDepartment;

  @Column()
  toDepartmentId: number;

  @ManyToOne(() => CrossRegionDepartment)
  @JoinColumn({ name: 'toDepartmentId' })
  toDepartment: CrossRegionDepartment;

  @Column({ default: false })
  visibleToApplicant: boolean;

  @Column({ default: false })
  visibleToLocal: boolean;

  @Column({ default: false })
  visibleToRemote: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
