import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { HotItem } from './hot-item.entity';

@Entity('hot_categories')
export class HotCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: 0 })
  sort: number;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => HotItem, item => item.category)
  hotItems: HotItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
