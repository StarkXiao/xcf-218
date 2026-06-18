import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CrossRegionApplication } from './cross-region-application.entity';
import { User } from './user.entity';
import { CrossRegionDepartment } from './cross-region-department.entity';

@Entity('cross_region_message_logs')
export class CrossRegionMessageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  crossRegionApplicationId: number;

  @ManyToOne(() => CrossRegionApplication)
  @JoinColumn({ name: 'crossRegionApplicationId' })
  crossRegionApplication: CrossRegionApplication;

  @Column()
  targetRole: string;

  @Column({ nullable: true })
  targetUserId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  @Column({ nullable: true })
  targetDepartmentId: number;

  @ManyToOne(() => CrossRegionDepartment, { nullable: true })
  @JoinColumn({ name: 'targetDepartmentId' })
  targetDepartment: CrossRegionDepartment;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: 'system' })
  messageType: string;

  @Column({ default: false })
  sent: boolean;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
