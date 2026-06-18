import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';

@Entity('supplement_records')
export class SupplementRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  operatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column('text')
  rejectReason: string;

  @Column('text')
  rejectedMaterials: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  supplementTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
