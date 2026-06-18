import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { JointSubApplication } from './joint-sub-application.entity';

@Entity('joint_applications')
export class JointApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  jointApplicationNo: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  formData: string;

  @Column({ default: 'submitted' })
  status: string;

  @Column({ default: 0 })
  totalItems: number;

  @Column({ default: 0 })
  approvedItems: number;

  @Column({ default: 0 })
  rejectedItems: number;

  @Column({ default: 0 })
  processingItems: number;

  @Column('text', { nullable: true })
  summary: string;

  @Column({ nullable: true })
  reviewerId: number;

  @Column('text', { nullable: true })
  reviewComment: string;

  @OneToMany(() => JointSubApplication, sub => sub.jointApplication)
  subApplications: JointSubApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
