import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApprovalRecord } from './approval-record.entity';
import { ApprovalNode } from './approval-node.entity';
import { User } from './user.entity';

@Entity('approval_comments')
export class ApprovalComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recordId: number;

  @ManyToOne(() => ApprovalRecord, record => record.comments)
  @JoinColumn({ name: 'recordId' })
  record: ApprovalRecord;

  @Column()
  nodeId: number;

  @ManyToOne(() => ApprovalNode)
  @JoinColumn({ name: 'nodeId' })
  node: ApprovalNode;

  @Column()
  commenterId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'commenterId' })
  commenter: User;

  @Column()
  action: 'approve' | 'reject' | 'transfer' | 'withdraw' | 'comment';

  @Column('text')
  content: string;

  @Column({ nullable: true })
  targetNodeId: number;

  @Column({ nullable: true })
  transferredToUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
