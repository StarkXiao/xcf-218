import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { HotCategory } from './hot-category.entity';
import { ServiceItem } from './service-item.entity';

@Entity('hot_items')
export class HotItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceItemId: number;

  @OneToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => HotCategory, category => category.hotItems)
  @JoinColumn({ name: 'categoryId' })
  category: HotCategory;

  @Column({ default: 0 })
  sort: number;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  isBanner: boolean;

  @Column({ default: false })
  isQuickApply: boolean;

  @Column({ nullable: true })
  bannerImage: string;

  @Column({ nullable: true })
  bannerTitle: string;

  @Column({ nullable: true })
  bannerSubtitle: string;

  @Column({ type: 'text', nullable: true })
  quickApplyTips: string;

  @Column({ default: 0 })
  clickCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
