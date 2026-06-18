import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { ServiceItem } from './service-item.entity';

@Entity('subscriptions')
@Unique(['userId', 'serviceItemId'])
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  serviceItemId: number;

  @Column({ default: true })
  notifyOnUpdate: boolean;

  @Column({ default: true })
  notifyOnStatusChange: boolean;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @CreateDateColumn()
  createdAt: Date;
}
