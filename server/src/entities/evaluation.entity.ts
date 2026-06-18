import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';
import { ServiceItem } from './service-item.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ nullable: true, type: 'text' })
  content: string;

  @Column({ nullable: true, type: 'text' })
  tags: string;

  @Column({ default: true })
  anonymous: boolean;

  @Column('text', { nullable: true })
  reply: string;

  @Column({ nullable: true })
  replyBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'replyBy' })
  replyUser: User;

  @Column({ nullable: true, type: 'datetime' })
  replyAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
