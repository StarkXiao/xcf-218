import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Complaint } from './complaint.entity';

@Entity('callbacks')
export class Callback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  complaintId: number;

  @ManyToOne(() => Complaint, complaint => complaint.callbacks)
  @JoinColumn({ name: 'complaintId' })
  complaint: Complaint;

  @Column()
  adminId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @Column({ default: 'phone' })
  callbackType: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  satisfaction: number;

  @Column({ type: 'datetime' })
  callbackAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
