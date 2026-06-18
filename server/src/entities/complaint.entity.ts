import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';
import { ServiceItem } from './service-item.entity';
import { Callback } from './callback.entity';

@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  complaintNo: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ nullable: true })
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ default: 'service' })
  type: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  handlerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'handlerId' })
  handler: User;

  @Column('text', { nullable: true })
  handleResult: string;

  @Column({ nullable: true, type: 'datetime' })
  handleAt: Date;

  @OneToMany(() => Callback, callback => callback.complaint)
  callbacks: Callback[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
