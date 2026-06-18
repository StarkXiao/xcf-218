import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Application } from './application.entity';
import { ApprovalNode } from './approval-node.entity';
import { User } from './user.entity';
import { ApprovalComment } from './approval-comment.entity';

@Entity('approval_records')
export class ApprovalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  flowId: number;

  @Column()
  currentNodeId: number;

  @ManyToOne(() => ApprovalNode)
  @JoinColumn({ name: 'currentNodeId' })
  currentNode: ApprovalNode;

  @Column({ nullable: true })
  approverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'transferred' | 'withdrawn';

  @Column('text', { nullable: true })
  comment: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @OneToMany(() => ApprovalComment, comment => comment.record)
  comments: ApprovalComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
